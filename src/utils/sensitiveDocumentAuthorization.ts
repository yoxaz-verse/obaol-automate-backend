import crypto from "crypto";

const stable = (value: any): any => Array.isArray(value) ? value.map(stable) : value && typeof value === "object"
  ? Object.keys(value).sort().reduce((out: any, key) => { if (!["auditEvents", "updatedAt", "createdAt"].includes(key)) out[key] = stable(value[key]); return out; }, {}) : value;

export const documentContentHash = (doc: any) => {
  const source = doc?.toObject ? doc.toObject() : doc;
  const content = { type: source.type, revision: source.revision, documentNumber: source.documentNumber, issueDate: source.issueDate, validUntil: source.validUntil, dueDate: source.dueDate, selectedTemplateId: source.selectedTemplateId, selectedTemplateVersion: source.selectedTemplateVersion, templateSnapshot: source.templateSnapshot, documentData: source.documentData, buyer: source.buyer, seller: source.seller, lineItems: source.lineItems, totals: source.totals, terms: source.terms };
  return crypto.createHash("sha256").update(JSON.stringify(stable(content))).digest("hex");
};

export const sensitiveDocumentPayload = (action: string, doc: any, details: any = {}) => ({
  documentId: String(doc._id), documentVersion: Number(doc.revision || 1), documentContentHash: documentContentHash(doc), action,
  ...(details.signatureId ? { signatureId: String(details.signatureId) } : {}),
  ...(details.signatureVersion ? { signatureVersion: Number(details.signatureVersion) } : {}),
  ...(details.signatureChecksum ? { signatureChecksum: String(details.signatureChecksum) } : {}),
  ...(details.recipient ? { recipient: String(details.recipient).trim().toLowerCase() } : {}),
  ...(Array.isArray(details.cc) ? { cc: [...details.cc].map(String).map(v => v.trim().toLowerCase()).filter(Boolean).sort() } : {}),
  ...(details.subject ? { subject: String(details.subject).trim() } : {}),
  ...(details.message ? { message: String(details.message).trim() } : {}),
  ...(details.expiresInDays ? { expiresInDays: Number(details.expiresInDays) } : {}),
  ...(details.channel ? { channel: String(details.channel) } : {}),
});
