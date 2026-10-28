import puppeteer from "puppeteer-core";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
const lines = (value: unknown) => escapeHtml(value).replace(/\r?\n/g, "<br>");
const money = (value: unknown, currency = "INR") => `${escapeHtml(currency)} ${new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))}`;
const date = (value: unknown) => value ? new Date(value as any).toLocaleDateString("en-IN") : "—";
const label = (value: unknown) => String(value || "DOCUMENT").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const resolveToken = (token: string, doc: any) => {
  const values: Record<string, unknown> = {
    "document.number": doc.documentNumber, "document.type": label(doc.type), "document.issueDate": date(doc.issueDate), "document.dueDate": date(doc.dueDate), "document.status": doc.status,
    "issuer.name": doc.issuer?.name, "issuer.address": doc.issuer?.address || doc.issuer?.billingAddress, "issuer.email": doc.issuer?.email, "issuer.phone": doc.issuer?.phone, "issuer.gstin": doc.issuer?.gstin,
    "buyer.name": doc.buyer?.name, "buyer.address": doc.buyer?.address, "buyer.email": doc.buyer?.email, "seller.name": doc.seller?.name, "seller.address": doc.seller?.address, "seller.email": doc.seller?.email,
    "totals.currency": doc.totals?.currency, "totals.subtotal": money(doc.totals?.subtotal, doc.totals?.currency), "totals.tax": money(doc.totals?.taxAmount, doc.totals?.currency), "totals.discount": money(doc.totals?.discountAmount, doc.totals?.currency), "totals.grandTotal": money(doc.totals?.grandTotal, doc.totals?.currency),
    "terms.payment": doc.terms?.paymentTerms, "terms.delivery": doc.terms?.deliveryTerms, "terms.conditions": doc.terms?.termsAndConditions, "terms.notes": doc.terms?.notes,
    "context.enquiry": doc.enquiryId, "context.order": doc.orderId, "context.shipment": doc.documentData?.shipmentReference, "context.reference": doc.documentData?.reference, "context.authorizedSignatory": doc.documentData?.authorizedSignatory,
  };
  return values[token] ?? "";
};

const customElements = (template: any, doc: any) => (template?.layoutSchema?.elements || []).filter((item: any) => item?.visible !== false).map((item: any) => {
  const resolved = item?.binding?.bindingType === "SYSTEM_TOKEN" ? resolveToken(String(item?.binding?.token || ""), doc) : item?.binding?.bindingType === "MANUAL_FIELD" ? doc.documentData?.[String(item?.binding?.fieldKey || "")] : item?.content;
  const value = resolved || item?.binding?.defaultValue || item?.content || "";
  const typography = item?.typography || {};
  const positioned = [item?.x, item?.y, item?.width, item?.height].every((part) => Number.isFinite(Number(part)));
  const inlineStyle = positioned ? `left:${Number(item.x)}px;top:${Number(item.y)}px;width:${Number(item.width)}px;min-height:${Number(item.height)}px;z-index:${Number(item.zIndex || 1)};font-size:${Number(typography.fontSize || 11)}px;font-weight:${Number(typography.fontWeight || 500)};color:${escapeHtml(typography.color || "#111827")};text-align:${escapeHtml(typography.textAlign || "left")}` : "";
  const type = String(item?.type || "TEXT");
  if (type === "IMAGE") {
    const src = String(item?.src || value || "");
    if (!/^(data:image\/|https:\/\/)/i.test(src)) return "";
    return `<div class="custom-element positioned" style="${inlineStyle}"><img src="${escapeHtml(src)}" alt="${escapeHtml(item.label || "Template image")}" /></div>`;
  }
  if (type === "LINE") return `<div class="custom-element positioned template-line" style="${inlineStyle}"></div>`;
  if (type === "SHAPE") return `<div class="custom-element positioned template-shape" style="${inlineStyle}"></div>`;
  if (!String(value || "").trim()) return "";
  if (type === "TABLE") return `<div class="custom-element${positioned ? " positioned" : ""}" style="${inlineStyle}"><table><tbody><tr><td>${lines(value)}</td></tr></tbody></table></div>`;
  return `<div class="custom-element${positioned ? " positioned" : ""}" style="${inlineStyle}"><strong>${escapeHtml(item.label || "")}</strong>${item.label ? ": " : ""}${lines(value)}</div>`;
}).join("");

export const renderDocumentHtml = (doc: any, template: any) => {
  const style = String(template?.visualStyle || "CLASSIC").toLowerCase();
  const currency = String(doc?.totals?.currency || "INR");
  const items = Array.isArray(doc?.lineItems) ? doc.lineItems : [];
  const packages = Array.isArray(doc?.documentData?.packages) ? doc.documentData.packages : [];
  const tests = Array.isArray(doc?.documentData?.tests) ? doc.documentData.tests : [];
  const isCertificate = /CERTIFICATE/.test(String(doc.type || ""));
  const isShipping = ["PACKING_LIST", "BILL_OF_LADING", "AIR_WAYBILL", "LORRY_RECEIPT", "LCL_DRAFT", "SHIPPING_BILL", "BILL_OF_ENTRY", "CUSTOMS_CLEARANCE", "DISPATCH_CHALLAN", "GOODS_RECEIPT"].includes(String(doc.type || ""));
  const recipientIsSeller = ["PURCHASE_ORDER", "GOODS_RECEIPT"].includes(String(doc.type || ""));
  const issuer = doc.issuer || (recipientIsSeller ? doc.buyer : doc.seller) || {};
  const recipient = doc.recipient || (recipientIsSeller ? doc.seller : doc.buyer) || {};
  const body = isCertificate ? `<section><h2>Certificate details</h2><div class="facts"><p><b>Commodity</b>${lines(doc.documentData?.commodity || "—")}</p><p><b>Sample ID</b>${lines(doc.documentData?.sampleId || "—")}</p><p><b>Batch / lot</b>${lines(doc.documentData?.batchLot || "—")}</p></div>${tests.length ? `<table><thead><tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Method</th><th>Limit</th></tr></thead><tbody>${tests.map((row: any) => `<tr><td>${lines(row.parameter)}</td><td>${lines(row.result)}</td><td>${lines(row.unit)}</td><td>${lines(row.method)}</td><td>${lines(row.limit)}</td></tr>`).join("")}</tbody></table>` : ""}<p><b>Conclusion:</b> ${lines(doc.documentData?.conclusion || "—")}</p></section>` : isShipping ? `<section><h2>Shipment details</h2><div class="facts"><p><b>Shipment reference</b>${lines(doc.documentData?.shipmentReference || "—")}</p><p><b>Transport</b>${lines(doc.documentData?.transportMode || doc.documentData?.carrier || "—")}</p><p><b>Route</b>${lines([doc.documentData?.portOfLoading, doc.documentData?.portOfDischarge].filter(Boolean).join(" → ") || "—")}</p></div>${packages.length ? `<table><thead><tr><th>Description</th><th>Package</th><th>Count</th><th>Gross</th><th>Net</th><th>Marks</th></tr></thead><tbody>${packages.map((row: any) => `<tr><td>${lines(row.description)}</td><td>${lines(row.packageType)}</td><td>${escapeHtml(row.packageCount)}</td><td>${escapeHtml(row.grossWeight)}</td><td>${escapeHtml(row.netWeight)}</td><td>${lines(row.marks)}</td></tr>`).join("")}</tbody></table>` : ""}</section>` : `<section><table><thead><tr><th>Product / service</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Tax</th><th class="num">Total</th></tr></thead><tbody>${items.map((row: any) => `<tr><td>${lines(row.description || row.productName || "—")}</td><td class="num">${escapeHtml(row.quantity || 0)} ${escapeHtml(row.unit || "")}</td><td class="num">${money(row.unitPrice, currency)}</td><td class="num">${escapeHtml(row.taxRate || 0)}%</td><td class="num"><b>${money(row.total, currency)}</b></td></tr>`).join("")}</tbody></table><div class="totals"><p><span>Subtotal</span>${money(doc.totals?.subtotal, currency)}</p><p><span>Tax</span>${money(doc.totals?.taxAmount, currency)}</p>${Number(doc.totals?.discountAmount || 0) ? `<p><span>Discount</span>${money(doc.totals.discountAmount, currency)}</p>` : ""}<p class="grand"><span>Total</span>${money(doc.totals?.grandTotal, currency)}</p></div></section>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#101828;font:14px/1.45 Arial,sans-serif}.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:18mm;position:relative}.modern .page{border-top:8px solid #c8912f}.compact .page{padding:11mm;font-size:12px}.header{display:flex;justify-content:space-between;gap:28px;border-bottom:1px solid #d0d5dd;padding-bottom:20px}.modern .header{background:#101828;color:white;margin:-18mm -18mm 20px;padding:18mm}.compact .header{padding-bottom:10px}.brand h1,.title h1{margin:0;font-size:27px}.title{text-align:right}.muted{color:#667085}.modern .muted{color:#d0d5dd}.parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}.party{border:1px solid #e4e7ec;border-radius:10px;padding:14px}.party h2,section h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#8a6422;margin:0 0 8px}.party p{margin:2px 0}table{width:100%;border-collapse:collapse;margin:15px 0;page-break-inside:auto}thead{display:table-header-group}tr{page-break-inside:avoid}th{border-bottom:2px solid #344054;text-align:left;padding:9px 7px}td{border-bottom:1px solid #e4e7ec;padding:10px 7px;vertical-align:top}.num{text-align:right;white-space:nowrap}.totals{margin:12px 0 20px auto;width:310px}.totals p{display:flex;justify-content:space-between;margin:0;padding:5px 0;border-bottom:1px solid #e4e7ec}.totals .grand{font-size:19px;font-weight:700;border-top:2px solid #344054}.terms{margin-top:24px;page-break-inside:avoid}.term{margin:8px 0;white-space:normal;overflow-wrap:anywhere}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.facts p{border:1px solid #e4e7ec;border-radius:8px;padding:10px}.facts b{display:block;color:#667085;font-size:11px;text-transform:uppercase}.custom-element{margin:8px 0}.custom-element.positioned{position:absolute;margin:0;overflow-wrap:anywhere}.custom-element img{display:block;width:100%;height:100%;object-fit:contain}.template-line{border-top:1px solid #344054;min-height:1px!important}.template-shape{border:1px solid #344054;background:transparent}.footer{margin-top:35px;border-top:1px solid #e4e7ec;padding-top:10px;color:#667085;font-size:11px}@media print{body{background:#fff}.page{margin:0;box-shadow:none}.no-print{display:none}}
  </style></head><body class="${style}"><main class="page"><header class="header"><div class="brand"><h1>${escapeHtml(issuer.name || "OBAOL")}</h1><p class="muted">${lines(issuer.address || issuer.billingAddress || "")}</p><p>${escapeHtml(issuer.email || "")} ${issuer.phone ? `· ${escapeHtml(issuer.phone)}` : ""}</p>${issuer.gstin ? `<p>GSTIN: ${escapeHtml(issuer.gstin)}</p>` : ""}</div><div class="title"><h1>${escapeHtml(label(doc.type))}</h1><p>${escapeHtml(doc.documentNumber || "Draft")}</p><p>Issued: ${date(doc.issueDate)}</p>${doc.dueDate ? `<p>Due: ${date(doc.dueDate)}</p>` : ""}<b>${escapeHtml(doc.status || "DRAFT")}</b></div></header><section class="parties"><div class="party"><h2>Issued by</h2><p><b>${escapeHtml(issuer.name || "—")}</b></p><p>${lines(issuer.address || issuer.billingAddress || "")}</p><p>${escapeHtml(issuer.email || "")}</p></div><div class="party"><h2>Recipient</h2><p><b>${escapeHtml(recipient.name || "—")}</b></p><p>${lines(recipient.address || recipient.billingAddress || "")}</p><p>${escapeHtml(recipient.email || "")}</p>${recipient.gstin ? `<p>GSTIN: ${escapeHtml(recipient.gstin)}</p>` : ""}</div></section>${body}<section class="terms"><h2>Terms and notes</h2>${[["Payment",doc.terms?.paymentTerms],["Delivery",doc.terms?.deliveryTerms],["Terms and conditions",doc.terms?.termsAndConditions],["Notes",doc.terms?.notes]].filter(([,v])=>String(v||"").trim()).map(([k,v])=>`<div class="term"><b>${k}:</b> ${lines(v)}</div>`).join("")}</section>${customElements(template, doc)}<footer class="footer">Generated securely by OBAOL · Template: ${escapeHtml(template?.name || "Standard")}, version ${escapeHtml(template?.version || 1)}</footer></main></body></html>`;
};

export const renderDocumentPdf = async (html: string) => {
  const executablePath = process.env.CHROMIUM_PATH || "/usr/bin/chromium-browser";
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    const output = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
    return Buffer.from(output);
  } finally { await browser.close(); }
};
