type TradeDocEmailInput = {
  docType: string;
  documentNumber?: string;
  status?: string;
  enquiryCode?: string;
  buyerName?: string;
  sellerName?: string;
  createdAt?: string;
};

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
  ]
    .filter(Boolean)
    .join("\n");

  const htmlPart = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
      <h2 style="margin: 0 0 8px;">${docLabel} Ready</h2>
      <p style="margin: 0 0 16px;">A new ${docLabel} is available for your trade.</p>
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px;">
        ${input.documentNumber ? `<div><strong>Document No:</strong> ${input.documentNumber}</div>` : ""}
        ${input.status ? `<div><strong>Status:</strong> ${input.status}</div>` : ""}
        ${input.enquiryCode ? `<div><strong>Enquiry:</strong> ${input.enquiryCode}</div>` : ""}
        ${input.buyerName ? `<div><strong>Buyer:</strong> ${input.buyerName}</div>` : ""}
        ${input.sellerName ? `<div><strong>Seller:</strong> ${input.sellerName}</div>` : ""}
        ${input.createdAt ? `<div><strong>Created:</strong> ${input.createdAt}</div>` : ""}
      </div>
      <p style="margin-top: 16px; color: #6b7280;">Log in to OBAOL to review this document.</p>
    </div>
  `;

  return { subject, textPart, htmlPart };
};
