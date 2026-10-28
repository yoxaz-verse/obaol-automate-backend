type TradeDocEmailInput = {
  docType: string;
  documentNumber?: string;
  status?: string;
  enquiryCode?: string;
  buyerName?: string;
  sellerName?: string;
  createdAt?: string;
  recipientName?: string;
  invitationUrl?: string;
  expiresAt?: string;
  message?: string;
};

const escapeHtml = (value: unknown) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");

const LABELS: Record<string, string> = {
  LOI: "Letter of Intent",
  QUOTATION: "Quotation",
  PROFORMA_INVOICE: "Proforma Invoice",
  PURCHASE_ORDER: "Purchase Order",
  INVOICE: "Invoice",
  OTHER_DOCS: "Other Document",
};

const formatLabel = (docType: string) => LABELS[docType] || docType.replace(/_/g, " ").toLowerCase();

export const buildTradeDocumentEmail = (input: TradeDocEmailInput) => {
  const docLabel = formatLabel(String(input.docType || "").toUpperCase());
  const subject = `OBAOL ${docLabel} ready${input.enquiryCode ? ` • ${input.enquiryCode}` : ""}`;

  const textPart = [
    `A new ${docLabel} is available.`,
    input.documentNumber ? `Document No: ${input.documentNumber}` : "",
    input.status ? `Status: ${input.status}` : "",
    input.enquiryCode ? `Enquiry: ${input.enquiryCode}` : "",
    input.buyerName ? `Buyer: ${input.buyerName}` : "",
    input.sellerName ? `Seller: ${input.sellerName}` : "",
    input.expiresAt ? `Link expires: ${input.expiresAt}` : "",
    input.message ? `Message: ${input.message}` : "",
    input.invitationUrl ? `Review securely: ${input.invitationUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const htmlPart = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
      <h2 style="margin: 0 0 8px;">${escapeHtml(docLabel)} Ready</h2>
      <p style="margin: 0 0 16px;">${input.recipientName ? `Hello ${escapeHtml(input.recipientName)}, ` : ""}a new ${escapeHtml(docLabel)} is available for your trade.</p>
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px;">
        ${input.documentNumber ? `<div><strong>Document No:</strong> ${escapeHtml(input.documentNumber)}</div>` : ""}
        ${input.status ? `<div><strong>Status:</strong> ${escapeHtml(input.status)}</div>` : ""}
        ${input.enquiryCode ? `<div><strong>Enquiry:</strong> ${escapeHtml(input.enquiryCode)}</div>` : ""}
        ${input.buyerName ? `<div><strong>Buyer:</strong> ${escapeHtml(input.buyerName)}</div>` : ""}
        ${input.sellerName ? `<div><strong>Seller:</strong> ${escapeHtml(input.sellerName)}</div>` : ""}
        ${input.createdAt ? `<div><strong>Created:</strong> ${escapeHtml(input.createdAt)}</div>` : ""}
        ${input.expiresAt ? `<div><strong>Link expires:</strong> ${escapeHtml(input.expiresAt)}</div>` : ""}
      </div>
      ${input.message ? `<p style="margin:16px 0;white-space:pre-wrap;">${escapeHtml(input.message)}</p>` : ""}
      ${input.invitationUrl ? `<p style="margin-top:20px;"><a href="${escapeHtml(input.invitationUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#d89b2b;color:#111;text-decoration:none;font-weight:700;">Review document securely</a></p>` : ""}
      <p style="margin-top: 16px; color: #6b7280;">This private link can be revoked by the sender.</p>
    </div>
  `;

  return { subject, textPart, htmlPart };
};
