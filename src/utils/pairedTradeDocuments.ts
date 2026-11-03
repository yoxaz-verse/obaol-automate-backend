export const PAIRED_TRADE_DOCUMENT_TYPES = new Set(["LOI", "QUOTATION", "PROFORMA_INVOICE", "PURCHASE_ORDER"]);

export const PAIRED_TRADE_DOCUMENT_DIRECTIONS: Record<string, [string, string]> = {
  LOI: ["BUYER_TO_OBAOL", "OBAOL_TO_SELLER"],
  PURCHASE_ORDER: ["BUYER_TO_OBAOL", "OBAOL_TO_SELLER"],
  QUOTATION: ["SELLER_TO_OBAOL", "OBAOL_TO_BUYER"],
  PROFORMA_INVOICE: ["SELLER_TO_OBAOL", "OBAOL_TO_BUYER"],
};

export const audienceScopeForDirection = (direction: string) =>
  ["BUYER_TO_OBAOL", "OBAOL_TO_BUYER"].includes(String(direction || "").toUpperCase()) ? "OBAOL_BUYER" : "SELLER_OBAOL";

export const isCompleteDocumentPair = (type: string, rows: Array<{ direction?: string | null; status?: string | null }>) => {
  const required = PAIRED_TRADE_DOCUMENT_DIRECTIONS[String(type || "").toUpperCase()] || [];
  return required.length === 2 && required.every(direction => rows.some(row => row.direction === direction && !["DRAFT", "CANCELLED"].includes(String(row.status || "").toUpperCase())));
};
