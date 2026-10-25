import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import { DocumentExtractionJobModel } from "../database/models/documentExtractionJob";
import { TradeDocumentModel } from "../database/models/tradeDocument";

const execFileAsync = promisify(execFile);
const money = (value: string) => Number(value.replace(/[, ]/g, ""));
const field = (key: string, value: unknown, sourceText: string, confidence = 0.65) => ({ key, value, sourceText: sourceText.slice(0, 500), confidence, page: 1 });

export function parseDocumentFields(text: string) {
  const rows: any[] = [];
  const patterns: Array<[string, RegExp, (v: string) => unknown]> = [
    ["documentNumber", /(?:invoice|document|quotation|shipping bill|bill of entry|certificate)\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9/_-]+)/i, v => v],
    ["issueDate", /(?:issue|invoice|document)\s*date\s*[:\-]?\s*([0-9./-]{6,12})/i, v => v],
    ["buyer.name", /(?:buyer|consignee|bill to)\s*[:\-]\s*([^\n\r]+)/i, v => v.trim()],
    ["seller.name", /(?:seller|exporter|supplier|shipper)\s*[:\-]\s*([^\n\r]+)/i, v => v.trim()],
    ["totals.grandTotal", /(?:grand total|invoice total|total amount)\s*[:\-]?\s*(?:INR|USD|EUR|GBP|₹|\$)?\s*([0-9,]+(?:\.\d{1,2})?)/i, money],
    ["terms.incotermCode", /\b(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)\b/i, v => v.toUpperCase()],
  ];
  for (const [key, pattern, transform] of patterns) { const match = text.match(pattern); if (match?.[1]) rows.push(field(key, transform(match[1]), match[0])); }
  return rows;
}

async function extractText(filePath: string, mimeType: string) {
  if (mimeType.startsWith("image/")) {
    const { stdout } = await execFileAsync(process.env.TESSERACT_PATH || "tesseract", [filePath, "stdout", "-l", process.env.TESSERACT_LANG || "eng"], { maxBuffer: 10 * 1024 * 1024 });
    return stdout;
  }
  const data = await fs.readFile(filePath);
  const source = data.toString("latin1");
  const fragments = [...source.matchAll(/\(([^()]*)\)\s*Tj/g)].map(match => match[1]);
  if (fragments.length) return fragments.join("\n").replace(/\\([()\\])/g, "$1");
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "obaol-document-ocr-"));
  try {
    const prefix = path.join(tempDir, "page");
    await execFileAsync(process.env.PDFTOPPM_PATH || "pdftoppm", ["-png", "-r", "180", "-f", "1", "-l", "20", filePath, prefix], { maxBuffer: 2 * 1024 * 1024 });
    const pages = (await fs.readdir(tempDir)).filter(name => name.endsWith(".png")).sort();
    if (!pages.length) throw new Error("The scanned PDF could not be rendered for local OCR.");
    const text: string[] = [];
    for (const page of pages) {
      const { stdout } = await execFileAsync(process.env.TESSERACT_PATH || "tesseract", [path.join(tempDir, page), "stdout", "-l", process.env.TESSERACT_LANG || "eng"], { maxBuffer: 10 * 1024 * 1024 });
      text.push(stdout);
    }
    return text.join("\n\n");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function processDocumentExtraction(jobId: string) {
  const job: any = await DocumentExtractionJobModel.findOneAndUpdate({ _id: jobId, status: "QUEUED" }, { status: "PROCESSING", startedAt: new Date() }, { new: true }).select("+filePath +rawText");
  if (!job) return;
  await TradeDocumentModel.findByIdAndUpdate(job.documentId, { extractionStatus: "PROCESSING" });
  try {
    const rawText = await extractText(job.filePath, job.mimeType);
    job.rawText = rawText.slice(0, 100000);
    job.extractedFields = parseDocumentFields(rawText);
    job.warnings = job.extractedFields.length ? [] : ["No standard fields were detected. Review and complete the draft manually."];
    job.status = "REVIEW_REQUIRED"; job.completedAt = new Date(); await job.save();
    await TradeDocumentModel.findByIdAndUpdate(job.documentId, { extractionStatus: "REVIEW_REQUIRED" });
  } catch (error: any) {
    job.status = "FAILED"; job.error = String(error?.message || "Extraction failed").slice(0, 1000); job.completedAt = new Date(); await job.save();
    await TradeDocumentModel.findByIdAndUpdate(job.documentId, { extractionStatus: "FAILED" });
  }
}

export async function resumeDocumentExtractionJobs() {
  await DocumentExtractionJobModel.updateMany({ status: "PROCESSING" }, { status: "QUEUED", error: "Recovered after service restart." });
  const queued = await DocumentExtractionJobModel.find({ status: "QUEUED" }).sort({ createdAt: 1 }).select("_id").limit(25).lean();
  for (const job of queued) await processDocumentExtraction(String(job._id));
}
