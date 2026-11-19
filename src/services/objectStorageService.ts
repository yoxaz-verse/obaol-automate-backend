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

const cleanEnvValue = (value: unknown) => String(value || "").trim().replace(/^(['"])(.*)\1$/, "$2").trim();
const normalizeBucket = (value: unknown) => {
  const raw = cleanEnvValue(value).replace(/^s3:\/\//i, "").replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const virtualHosted = url.hostname.match(/^([a-z0-9.-]+)\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i)?.[1];
    const pathStyle = url.hostname.startsWith("s3") ? url.pathname.split("/").filter(Boolean)[0] : "";
    return virtualHosted || pathStyle || (raw.includes("://") ? "" : raw.split("/")[0]);
  } catch { return raw.split("/")[0]; }
};
const primaryBucket = normalizeBucket(process.env.AWS_S3_BUCKET);
const legacyBucket = normalizeBucket(process.env.AWS_BUCKET_NAME);
const bucket = primaryBucket || legacyBucket;
const bucketSource = primaryBucket ? "AWS_S3_BUCKET" : legacyBucket ? "AWS_BUCKET_NAME" : null;
const bucketAliasConflict = Boolean(primaryBucket && legacyBucket && primaryBucket !== legacyBucket);
const region = cleanEnvValue(process.env.AWS_REGION);
const prefix = String(process.env.AWS_S3_PREFIX || process.env.NODE_ENV || "development")
  .trim().replace(/^\/+|\/+$/g, "");
const endpoint = String(process.env.AWS_S3_ENDPOINT || "").trim();
const forcePathStyle = String(process.env.AWS_S3_FORCE_PATH_STYLE || "").toLowerCase() === "true";
const encryption = String(process.env.AWS_S3_SSE || "BUCKET_DEFAULT").trim();
const kmsKeyId = String(process.env.AWS_S3_KMS_KEY_ID || "").trim();

let client: S3Client | null = null;
const s3 = () => {
  if (!region || !bucket) throw Object.assign(new Error("AWS S3 storage is not configured."), { statusCode: 503, code: "S3_NOT_CONFIGURED" });
  if (!client) client = new S3Client({ region, ...(endpoint ? { endpoint } : {}), forcePathStyle });
  return client;
};

const storageError = (error: any) => {
  if (error?.code && String(error.code).startsWith("S3_")) return error;
  const name = String(error?.name || error?.Code || "");
  const message = String(error?.message || "").toLowerCase();
  let code = "S3_WRITE_FAILED";
  let statusCode = 502;
  if (/accessdenied|forbidden/.test(name.toLowerCase()) || error?.$metadata?.httpStatusCode === 403) code = /kms|key/.test(message) ? "S3_KMS_DENIED" : "S3_ACCESS_DENIED";
  else if (/nosuchbucket|notfound/.test(name.toLowerCase())) code = "S3_BUCKET_NOT_FOUND";
  else if (/authorizationheadermalformed|permanentredirect|incorrectendpoint/.test(name.toLowerCase()) || /region/.test(message)) code = "S3_REGION_MISMATCH";
  else if (/invalidaccesskeyid|signaturedoesnotmatch|expiredtoken|credentialsprovidererror/.test(name.toLowerCase())) code = "S3_CREDENTIALS_INVALID";
  else if (/timeout|network|enotfound|econnreset/.test(`${name} ${message}`)) { code = "S3_NETWORK_ERROR"; statusCode = 503; }
  return Object.assign(new Error("Private storage operation failed."), { code, statusCode, cause: error });
};

const encryptionOptions = () => {
  if (!encryption || encryption.toUpperCase() === "BUCKET_DEFAULT" || encryption.toUpperCase() === "NONE") return {};
  if (encryption === "aws:kms") return { ServerSideEncryption: "aws:kms" as const, ...(kmsKeyId ? { SSEKMSKeyId: kmsKeyId } : {}) };
  if (encryption === "AES256") return { ServerSideEncryption: "AES256" as const };
  throw Object.assign(new Error("AWS_S3_SSE must be BUCKET_DEFAULT, AES256, or aws:kms."), { code: "S3_ENCRYPTION_INVALID", statusCode: 503 });
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
  bucketSource,
  bucketAliasConflict,
  region: region || null,
  prefix: prefix || null,
  credentialSource: "AWS default credential provider chain",
  encryption: encryption || "BUCKET_DEFAULT",
  endpointConfigured: Boolean(endpoint),
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
  try {
    await s3().send(new PutObjectCommand({
      Bucket: bucket, Key: objectKey, Body: input.body, ContentType: input.mimeType,
      ...encryptionOptions(), Metadata: { ...input.metadata, sha256: checksum },
    }));
  } catch (error) { throw storageError(error); }
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

export const verifyObjectRoundTrip = async (objectKey: string, expected: Buffer, expectedChecksum?: string) => {
  try {
    const head = await headObject(objectKey);
    if (Number(head.ContentLength) !== expected.length) throw new Error("Stored object size did not match.");
    if (expectedChecksum && head.Metadata?.sha256 !== expectedChecksum) throw new Error("Stored object checksum metadata did not match.");
    const received = await getObjectBuffer(objectKey);
    if (!received.equals(expected)) throw new Error("Stored object content did not match.");
    return head;
  } catch (error) { throw storageError(error); }
};

export const verifyStorage = async () => {
  const startedAt = Date.now();
  const probeKey = [prefix, "health-checks", `${crypto.randomUUID()}.txt`].filter(Boolean).join("/");
  const content = Buffer.from(`obaol-storage-check:${new Date().toISOString()}`);
  let stage = "head-bucket";
  try {
    await s3().send(new HeadBucketCommand({ Bucket: bucket }));
    stage = "put";
    await s3().send(new PutObjectCommand({ Bucket: bucket, Key: probeKey, Body: content, ContentType: "text/plain", ...encryptionOptions() }));
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

export const verifySignatureStorage = async () => {
  const startedAt = Date.now();
  const content = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,8,215,99,248,207,192,240,31,0,5,0,1,255,137,153,61,29,0,0,0,0,73,69,78,68,174,66,96,130]);
  let stored: StoredObject | null = null;
  let stage = "put";
  try {
    stored = await putObject({ domain: "signatures/health-check", body: content, originalName: "signature-probe.png", mimeType: "image/png", metadata: { probe: "signature" } });
    stage = "read-back";
    await verifyObjectRoundTrip(stored.objectKey, content, stored.checksum);
    stage = "delete";
    await deleteObject(stored.objectKey);
    return { success: true, stage: "complete", durationMs: Date.now() - startedAt, checkedAt: new Date().toISOString() };
  } catch (error: any) {
    if (stored) await deleteObject(stored.objectKey).catch(() => undefined);
    const normalized = storageError(error);
    return { success: false, stage, durationMs: Date.now() - startedAt, checkedAt: new Date().toISOString(), code: normalized.code, message: normalized.message };
  }
};
