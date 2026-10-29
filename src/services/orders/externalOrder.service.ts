type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null ? (value as UnknownRecord) : {};

const text = (value: unknown): string => String(value ?? "").trim();

type PreparedExternalOrder = {
  enquiry: null;
  isExternal: true;
  externalCreatedBy: string | null;
  externalTradeType: string;
  externalRole: string;
  externalBuyer: { name: string; email: string; phone: string };
  externalSeller: { name: string; email: string; phone: string };
  externalProduct: { name: string; variant: string; quantity: unknown; unit: string };
  executionContext: UnknownRecord;
  packagingSpecifications: string;
  responsibilities: Record<string, string>;
  incotermId: unknown;
  paymentTermId: unknown;
  workflowStage?: string;
  status: "Procuring";
  paymentPlan?: unknown;
};

export type ExternalOrderPreparation =
  | { ok: true; payload: PreparedExternalOrder; tradeType: string; paymentTermId: unknown }
  | { ok: false; message: string };

const allowedOwners = new Set(["buyer", "seller", "obaol"]);
const buyerOnly = new Set(["buyer"]);
const buyerOrObaol = new Set(["buyer", "obaol"]);
const obaolOnly = new Set(["obaol"]);

export const prepareExternalOrder = (body: unknown, actorId: unknown): ExternalOrderPreparation => {
  const input = asRecord(body);
  const buyer = asRecord(input.externalBuyer);
  const seller = asRecord(input.externalSeller);
  const product = asRecord(input.externalProduct);
  const execution = asRecord(input.executionContext);
  const externalTradeType = text(input.externalTradeType).toUpperCase();
  const externalRole = text(input.externalRole).toUpperCase();
  const packagingSpecifications = text(input.packagingSpecifications);
  const responsibilities: Record<string, string> = Object.fromEntries(
    Object.entries(asRecord(input.responsibilities))
      .map(([key, value]): [string, string] => [key, text(value).toLowerCase()])
      .filter(([, value]) => Boolean(value)),
  );

  if (!text(buyer.name) || !text(seller.name) || !text(product.name) || !externalTradeType) {
    return { ok: false, message: "Buyer name, seller name, product name, and trade type are required." };
  }
  const productQuantity = Number(product.quantity);
  if (!Number.isFinite(productQuantity) || productQuantity <= 0 || !text(product.unit)) {
    return { ok: false, message: "Product quantity and unit are required." };
  }
  const buyerName = text(buyer.name);
  const sellerName = text(seller.name);
  if (buyerName.toLowerCase() === "undisclosed" || sellerName.toLowerCase() === "undisclosed") {
    return { ok: false, message: "Buyer and seller must be disclosed to create an external order." };
  }
  if (!["DOMESTIC", "INTERNATIONAL"].includes(externalTradeType)) return { ok: false, message: "Invalid trade type." };
  if (!["BUYER", "SELLER", "MEDIATOR"].includes(externalRole)) return { ok: false, message: "External role is required." };
  if (!packagingSpecifications) return { ok: false, message: "Packaging specifications are required." };

  const contextTradeType = text(execution.tradeType || externalTradeType).toUpperCase();
  if (!["DOMESTIC", "INTERNATIONAL"].includes(contextTradeType)) {
    return { ok: false, message: "Execution context trade type is required." };
  }
  if (contextTradeType === "DOMESTIC" && (!execution.originState || !execution.originDistrict || !execution.destinationState || !execution.destinationDistrict)) {
    return { ok: false, message: "Domestic execution context requires origin/destination state and district." };
  }
  if (contextTradeType === "INTERNATIONAL" && (!execution.originCountry || !execution.originPort || !execution.destinationCountry || !execution.destinationPort)) {
    return { ok: false, message: "International execution context requires origin/destination country and port." };
  }

  const requiredKeys = contextTradeType === "INTERNATIONAL"
    ? ["procurementBy", "qualityTestingBy", "packagingBy", "transportBy", "shippingBy", "certificateBy"]
    : ["procurementBy", "qualityTestingBy", "packagingBy", "transportBy"];
  if (!requiredKeys.every((key) => allowedOwners.has(responsibilities[key] || ""))) {
    return { ok: false, message: "Responsibilities are incomplete or invalid." };
  }
  const validators: Record<string, ReadonlySet<string>> = {
    procurementBy: allowedOwners, certificateBy: allowedOwners, transportBy: allowedOwners,
    shippingBy: allowedOwners, packagingBy: allowedOwners, qualityTestingBy: allowedOwners,
    cargoInsuranceBy: allowedOwners, exportCustomsBy: allowedOwners,
    importCustomsBy: buyerOrObaol, dutiesTaxesBy: buyerOnly, portHandlingBy: buyerOrObaol,
    destinationInlandTransportBy: buyerOrObaol, destinationInspectionBy: buyerOrObaol,
    finalDeliveryConfirmationBy: obaolOnly,
  };
  const invalid = Object.entries(responsibilities).some(([key, value]) => validators[key] && !validators[key].has(value));
  if (invalid) return { ok: false, message: "Invalid responsibility selection." };

  const paymentTermId = input.paymentTermId || null;
  return {
    ok: true,
    tradeType: contextTradeType,
    paymentTermId,
    payload: {
      enquiry: null,
      isExternal: true,
      externalCreatedBy: actorId ? String(actorId) : null,
      externalTradeType,
      externalRole,
      externalBuyer: { name: buyerName, email: text(buyer.email), phone: text(buyer.phone) },
      externalSeller: { name: sellerName, email: text(seller.email), phone: text(seller.phone) },
      externalProduct: { name: text(product.name), variant: text(product.variant), quantity: productQuantity, unit: text(product.unit) },
      executionContext: {
        tradeType: contextTradeType,
        originCountry: execution.originCountry || null, originState: execution.originState || null,
        originDistrict: execution.originDistrict || null, originPort: execution.originPort || null,
        destinationCountry: execution.destinationCountry || null, destinationState: execution.destinationState || null,
        destinationDistrict: execution.destinationDistrict || null, destinationPort: execution.destinationPort || null,
        routeNotes: execution.routeNotes || null,
      },
      packagingSpecifications,
      responsibilities,
      incotermId: input.incotermId || null,
      paymentTermId,
      status: "Procuring",
    },
  };
};
