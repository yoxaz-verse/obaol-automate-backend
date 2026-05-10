import { TradeDocumentType } from "../interfaces/tradeDocument";
import { IDocumentTemplateLayoutSchema, DocumentTemplateBlockType, DocumentTemplateElementType } from "../interfaces/documentTemplate";
import { DocumentTemplateModel } from "../database/models/documentTemplate";
import { DocumentTypeModel } from "../database/models/documentType";

export const TRADE_DOC_TYPES: TradeDocumentType[] = [
  "LOI",
  "QUOTATION",
  "PROFORMA_INVOICE",
  "INVOICE",
  "PURCHASE_ORDER",
  "SALES_CONTRACT",
  "PACKING_LIST",
  "QUALITY_CERTIFICATE",
  "INSPECTION_CERTIFICATE",
  "PHYTOSANITARY_CERTIFICATE",
  "FUMIGATION_CERTIFICATE",
  "BILL_OF_LADING",
  "AIR_WAYBILL",
  "INSURANCE_CERTIFICATE",
  "PAYMENT_ADVICE",
  "LORRY_RECEIPT",
  "LCL_DRAFT",
];

const ALLOWED_BLOCK_TYPES = new Set<DocumentTemplateBlockType>([
  "HEADER",
  "PARTIES",
  "LINE_ITEMS",
  "TOTALS",
  "TERMS",
  "CERTIFICATE",
  "SHIPPING",
  "TEXT",
]);

const ALLOWED_ELEMENT_TYPES = new Set<DocumentTemplateElementType>([
  "TEXT",
  "IMAGE",
  "SHAPE",
  "LINE",
  "TABLE",
  "SIGNATURE",
  "MANUAL_INPUT",
]);

const DEFAULT_BLOCKS = (docType: string) => {
  const upper = String(docType || "").toUpperCase();
  const blocks = [
    { id: "header", type: "HEADER", label: "Header", x: 24, y: 24, width: 746, height: 110, visible: true, zIndex: 1, locked: false, bindingKey: "header" },
    { id: "parties", type: "PARTIES", label: "Parties", x: 24, y: 150, width: 746, height: 150, visible: true, zIndex: 2, locked: false, bindingKey: "parties" },
    { id: "line_items", type: "LINE_ITEMS", label: "Line Items", x: 24, y: 316, width: 746, height: 320, visible: true, zIndex: 3, locked: false, bindingKey: "lineItems" },
    { id: "totals", type: "TOTALS", label: "Totals", x: 430, y: 652, width: 340, height: 130, visible: true, zIndex: 4, locked: false, bindingKey: "totals" },
    { id: "terms", type: "TERMS", label: "Terms", x: 24, y: 652, width: 390, height: 190, visible: true, zIndex: 4, locked: false, bindingKey: "terms" },
  ] as any[];

  if (["QUALITY_CERTIFICATE", "INSPECTION_CERTIFICATE", "PHYTOSANITARY_CERTIFICATE", "FUMIGATION_CERTIFICATE"].includes(upper)) {
    return [
      { id: "header", type: "HEADER", label: "Header", x: 24, y: 24, width: 746, height: 110, visible: true, zIndex: 1, locked: false, bindingKey: "header" },
      { id: "certificate", type: "CERTIFICATE", label: "Certificate Body", x: 24, y: 150, width: 746, height: 760, visible: true, zIndex: 2, locked: false, bindingKey: "certificate" },
      { id: "notes", type: "TEXT", label: "Footer Notes", x: 24, y: 930, width: 746, height: 130, visible: true, zIndex: 3, locked: false, bindingKey: "notes" },
    ];
  }

  if (["BILL_OF_LADING", "AIR_WAYBILL", "LORRY_RECEIPT", "LCL_DRAFT"].includes(upper)) {
    return [
      { id: "header", type: "HEADER", label: "Header", x: 24, y: 24, width: 746, height: 110, visible: true, zIndex: 1, locked: false, bindingKey: "header" },
      { id: "shipping", type: "SHIPPING", label: "Shipping Body", x: 24, y: 150, width: 746, height: 760, visible: true, zIndex: 2, locked: false, bindingKey: "shipping" },
      { id: "terms", type: "TERMS", label: "Terms", x: 24, y: 930, width: 746, height: 130, visible: true, zIndex: 3, locked: false, bindingKey: "terms" },
    ];
  }

  return blocks;
};

const DEFAULT_ELEMENTS = () => ([
  {
    id: "manual-signature",
    type: "SIGNATURE",
    label: "Signature",
    x: 520,
    y: 1020,
    width: 220,
    height: 60,
    visible: true,
    zIndex: 20,
    locked: false,
    content: "Authorized Signatory",
    style: { borderTop: "1px solid #374151" },
    typography: { fontSize: 11, fontWeight: 500, color: "#111827", textAlign: "center" },
    binding: { bindingType: "MANUAL_FIELD", fieldKey: "authorizedSignatory", required: false, defaultValue: "" },
  },
] as any);

export const buildDefaultLayoutSchema = (docType: string): IDocumentTemplateLayoutSchema => ({
  version: 2,
  page: {
    size: "A4",
    width: 794,
    height: 1123,
    marginTop: 24,
    marginRight: 24,
    marginBottom: 24,
    marginLeft: 24,
    orientation: "PORTRAIT",
  },
  grid: {
    size: 8,
    snap: true,
  },
  blocks: DEFAULT_BLOCKS(docType).map((block) => ({
    ...block,
    typography: {
      fontSize: 12,
      fontWeight: 500,
      color: "#111827",
      textAlign: "left",
    },
  })),
  elements: DEFAULT_ELEMENTS(),
});

export const validateLayoutSchema = (layoutSchema: IDocumentTemplateLayoutSchema) => {
  if (!layoutSchema || typeof layoutSchema !== "object") return "layoutSchema is required.";
  if (!Array.isArray(layoutSchema.blocks)) return "layoutSchema.blocks must be an array.";

  const pageWidth = Number(layoutSchema?.page?.width || 0);
  const pageHeight = Number(layoutSchema?.page?.height || 0);
  if (pageWidth <= 0 || pageHeight <= 0) return "layoutSchema.page dimensions are invalid.";

  for (const block of layoutSchema.blocks) {
    if (!ALLOWED_BLOCK_TYPES.has(String(block?.type || "") as DocumentTemplateBlockType)) {
      return `Invalid block type: ${String(block?.type || "")}`;
    }
    const x = Number(block?.x);
    const y = Number(block?.y);
    const width = Number(block?.width);
    const height = Number(block?.height);
    if ([x, y, width, height].some((n) => Number.isNaN(n))) return `Invalid numeric values in block: ${String(block?.id || "")}`;
    if (x < 0 || y < 0) return `Block ${String(block?.id || "")} has negative coordinates.`;
    if (width < 20 || height < 12) return `Block ${String(block?.id || "")} is below minimum size.`;
    if (x + width > pageWidth || y + height > pageHeight) {
      return `Block ${String(block?.id || "")} exceeds page bounds.`;
    }
  }

  const elements = Array.isArray(layoutSchema.elements) ? layoutSchema.elements : [];
  for (const el of elements) {
    if (!ALLOWED_ELEMENT_TYPES.has(String(el?.type || "") as DocumentTemplateElementType)) {
      return `Invalid element type: ${String(el?.type || "")}`;
    }
    const x = Number(el?.x);
    const y = Number(el?.y);
    const width = Number(el?.width);
    const height = Number(el?.height);
    if ([x, y, width, height].some((n) => Number.isNaN(n))) return `Invalid numeric values in element: ${String(el?.id || "")}`;
    if (x < 0 || y < 0) return `Element ${String(el?.id || "")} has negative coordinates.`;
    if (width < 8 || height < 8) return `Element ${String(el?.id || "")} is below minimum size.`;
    if (x + width > pageWidth || y + height > pageHeight) {
      return `Element ${String(el?.id || "")} exceeds page bounds.`;
    }
  }

  return null;
};

export const seedDefaultDocumentTemplates = async (force = false) => {
  for (const docType of TRADE_DOC_TYPES) {
    const existingLive = await DocumentTemplateModel.findOne({
      documentType: docType,
      scope: "GLOBAL",
      stage: "LIVE",
      isDeleted: { $ne: true },
      isActive: true,
    }).lean();

    if (existingLive && !force) continue;

    if (force) {
      await DocumentTemplateModel.updateMany(
        { documentType: docType, isDeleted: { $ne: true } },
        { $set: { isActive: false, isDeleted: true } }
      );
    }

    if (!existingLive || force) {
      await DocumentTemplateModel.create({
        documentType: docType,
        docType,
        category: "TRADE",
        status: "PUBLISHED",
        stage: "LIVE",
        version: 1,
        scope: "GLOBAL",
        companyId: null,
        activationMode: "IMMEDIATE",
        activationAt: null,
        isActive: true,
        layoutSchema: buildDefaultLayoutSchema(docType),
        letterheadConfig: { enabled: false, presetId: null, firstPageOnly: true, watermark: "" },
        bindingConfig: { tokenMap: {}, manualFields: [] },
      });
    }
  }

  for (const docType of TRADE_DOC_TYPES) {
    await DocumentTypeModel.updateOne(
      { slug: docType },
      {
        $setOnInsert: {
          slug: docType,
          label: String(docType).replace(/_/g, " "),
          category: "TRADE",
          icon: "FiFileText",
          defaultPageSetup: {
            size: "A4",
            orientation: "PORTRAIT",
            marginTop: 24,
            marginRight: 24,
            marginBottom: 24,
            marginLeft: 24,
          },
          isActive: true,
          isDeleted: false,
        },
      },
      { upsert: true }
    );
  }
};

export const ensureDefaultDocumentTemplate = async (documentType: string) => {
  const upper = String(documentType || "").toUpperCase();
  let current = await resolveTemplateForRender(upper);

  if (!current) {
    await DocumentTemplateModel.create({
      documentType: upper,
      docType: upper,
      category: "TRADE",
      status: "PUBLISHED",
      stage: "LIVE",
      version: 1,
      scope: "GLOBAL",
      companyId: null,
      activationMode: "IMMEDIATE",
      activationAt: null,
      isActive: true,
      layoutSchema: buildDefaultLayoutSchema(upper),
      letterheadConfig: { enabled: false, presetId: null, firstPageOnly: true, watermark: "" },
      bindingConfig: { tokenMap: {}, manualFields: [] },
    });
    current = await resolveTemplateForRender(upper);
  }

  return current;
};

export const resolveTemplateForRender = async (documentType: string, companyId?: string) => {
  const upper = String(documentType || "").toUpperCase();

  if (companyId && /^[a-f\d]{24}$/i.test(companyId)) {
    const companyLive = await DocumentTemplateModel.findOne({
      documentType: upper,
      scope: "COMPANY_OVERRIDE",
      companyId,
      stage: "LIVE",
      isActive: true,
      isDeleted: { $ne: true },
      $or: [
        { activationMode: "IMMEDIATE" },
        { activationMode: "SCHEDULED", activationAt: { $lte: new Date() } },
      ],
    })
      .sort({ version: -1 })
      .lean();
    if (companyLive) return companyLive;
  }

  const globalLive = await DocumentTemplateModel.findOne({
    documentType: upper,
    scope: "GLOBAL",
    stage: "LIVE",
    isActive: true,
    isDeleted: { $ne: true },
    $or: [
      { activationMode: "IMMEDIATE" },
      { activationMode: "SCHEDULED", activationAt: { $lte: new Date() } },
    ],
  })
    .sort({ version: -1 })
    .lean();

  return globalLive || null;
};
