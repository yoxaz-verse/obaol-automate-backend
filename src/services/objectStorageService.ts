import crypto from "crypto";
import path from "path";
import { Readable } from "stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = String(process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME || "").trim();
const region = String(process.env.AWS_REGION || "").trim();
const prefix = String(process.env.AWS_S3_PREFIX || process.env.NODE_ENV || "development")
  .trim().replace(/^\/+|\/+$/g, "");

let client: S3Client | null = null;
const s3 = () => {
  if (!region || !bucket) throw Object.assign(new Error("AWS S3 storage is not configured."), { statusCode: 503, code: "S3_NOT_CONFIGURED" });
  if (!client) client = new S3Client({ region });
  return client;
};

const safeSegment = (value: string) => value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "file";

export type StoredObject = {
  storageProvider: "s3";
  bucket: string;
  objectKey: string;
  checksum: string;
  size: number;
  mimeType: string;
  originalName: string;
};

export const storageConfiguration = () => ({
  provider: "s3" as const,
  configured: Boolean(bucket && region),
  bucket: bucket || null,
  region: region || null,
  prefix: prefix || null,
  credentialSource: "AWS default credential provider chain",
  missing: [!bucket ? "AWS_S3_BUCKET" : null, !region ? "AWS_REGION" : null].filter(Boolean),
});

export const buildObjectKey = (domain: string, originalName: string) => {
  const ext = safeSegment(path.extname(originalName).slice(1) || "bin");
  const base = safeSegment(path.basename(originalName, path.extname(originalName)));
  return [prefix, safeSegment(domain), new Date().toISOString().slice(0, 10), `${crypto.randomUUID()}-${base}.${ext}`].filter(Boolean).join("/");
};

export const putObject = async (input: { domain: string; body: Buffer; originalName: string; mimeType: string; metadata?: Record<string, string> }): Promise<StoredObject> => {
  const objectKey = buildObjectKey(input.domain, input.originalName);
  const checksum = crypto.createHash("sha256").update(input.body).digest("hex");
  await s3().send(new PutObjectCommand({
    Bucket: bucket, Key: objectKey, Body: input.body, ContentType: input.mimeType,
    ServerSideEncryption: "AES256", Metadata: { ...input.metadata, sha256: checksum },
  }));
  return { storageProvider: "s3", bucket, objectKey, checksum, size: input.body.length, mimeType: input.mimeType, originalName: input.originalName };
};

export const headObject = (objectKey: string) => s3().send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
export const deleteObject = (objectKey: string) => s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
export const signedDownloadUrl = (objectKey: string, filename?: string, expiresIn = 300) => getSignedUrl(s3(), new GetObjectCommand({
  Bucket: bucket, Key: objectKey,
  ResponseContentDisposition: filename ? `attachment; filename="${filename.replace(/["\r\n]/g, "")}"` : undefined,
}), { expiresIn: Math.min(Math.max(expiresIn, 60), 900) });

export const getObjectStream = async (objectKey: string): Promise<Readable> => {
  const response = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
  if (!response.Body) throw Object.assign(new Error("Stored object has no content."), { statusCode: 404 });
  return response.Body as Readable;
};

export const getObjectBuffer = async (objectKey: string) => {
  const chunks: Buffer[] = [];
  for await (const chunk of await getObjectStream(objectKey)) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
};

export const verifyStorage = async () => {
  const startedAt = Date.now();
  const probeKey = [prefix, "health-checks", `${crypto.randomUUID()}.txt`].filter(Boolean).join("/");
  const content = Buffer.from(`obaol-storage-check:${new Date().toISOString()}`);
  let stage = "head-bucket";
  try {
    await s3().send(new HeadBucketCommand({ Bucket: bucket }));
    stage = "put";
    await s3().send(new PutObjectCommand({ Bucket: bucket, Key: probeKey, Body: content, ContentType: "text/plain", ServerSideEncryption: "AES256" }));
    stage = "read";
    const response = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: probeKey }));
    const received = Buffer.from(await response.Body!.transformToByteArray());
    if (!received.equals(content)) throw new Error("Verification object content did not match.");
    stage = "delete";
    await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey }));
    return { success: true, stage: "complete", durationMs: Date.now() - startedAt, checkedAt: new Date().toISOString() };
  } catch (error: any) {
    if (stage !== "head-bucket") await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey })).catch(() => undefined);
    return { success: false, stage, durationMs: Date.now() - startedAt, checkedAt: new Date().toISOString(), code: String(error?.name || error?.Code || "S3_ERROR"), message: "S3 verification failed. Check the bucket region and IAM permissions." };
  }
};
