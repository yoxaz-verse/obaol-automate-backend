import { InquiryModel } from "../../database/models/enquiry";
import { OrderModel } from "../../database/models/order";

export const DEAL_SNAPSHOT_VERSION = 1;

const idOf = (value: any) => value?._id || value || null;
const labelOf = (value: any) => value?.label || value?.name || value?.title || "";
const party = (value: any) => ({
  id: idOf(value),
  name: value?.associateCompany?.name || value?.name || "",
  companyId: idOf(value?.associateCompany),
  email: value?.email || "",
  phone: value?.phone || "",
});

const latestDeliveryCommitment = (enquiry: any) => {
  const rounds = Array.isArray(enquiry?.revisionRounds) ? [...enquiry.revisionRounds] : [];
  rounds.sort((a: any, b: any) => new Date(b?.closedAt || b?.buyerRequestedAt || 0).getTime() - new Date(a?.closedAt || a?.buyerRequestedAt || 0).getTime());
  const items = rounds.length ? rounds.flatMap((round: any) => round?.items || []) : (enquiry?.revisionThread?.items || []);
  const delivery = items.find((item: any) => String(item?.key || "").toUpperCase() === "DELIVERY_TIMELINE" && item?.buyerDeliveryDate);
  return delivery?.buyerDeliveryDate || enquiry?.expectedArrivalDate || null;
};

const agreedRate = (enquiry: any) => {
  const rounds = Array.isArray(enquiry?.revisionRounds) ? [...enquiry.revisionRounds].reverse() : [];
  for (const round of rounds) {
    const item = (round?.items || []).find((entry: any) => String(entry?.key || "").toUpperCase() === "RATE");
    if (item?.supplierReplyStatus === "COUNTERED" && item?.supplierCounterRate != null) return Number(item.supplierCounterRate);
    if (item?.buyerRate != null) return Number(item.buyerRate);
  }
  return Number(enquiry?.biddingUnitPrice ?? enquiry?.rate ?? enquiry?.variantRateId?.rate ?? 0) || null;
};

export const validatePaymentPlan = (paymentPlan: any): string | null => {
  const milestones = paymentPlan?.milestones;
  if (!Array.isArray(milestones) || milestones.length === 0) return null;
  const total = milestones.reduce((sum: number, milestone: any) => sum + Number(milestone?.percent || 0), 0);
  if (milestones.some((milestone: any) => !milestone?.label || Number(milestone?.percent) <= 0)) {
    return "Every payment milestone requires a label and a positive percentage.";
  }
  return Math.abs(total - 100) < 0.01 ? null : "Payment milestone percentages must total 100%.";
};

export async function buildDealSnapshot(enquiryId: any, provenance: "CONVERSION" | "LEGACY_BACKFILL") {
  const enquiry: any = await InquiryModel.findById(enquiryId)
    .populate("productId", "name")
    .populate({ path: "variantRateId", populate: { path: "productVariant", populate: { path: "product", select: "name" } } })
    .populate({ path: "buyerAssociateId", select: "name email phone associateCompany", populate: { path: "associateCompany", select: "name" } })
    .populate({ path: "sellerAssociateId", select: "name email phone associateCompany", populate: { path: "associateCompany", select: "name" } })
    .populate({ path: "mediatorAssociateId", select: "name email phone associateCompany", populate: { path: "associateCompany", select: "name" } })
    .populate("preferredIncoterm", "name label code")
    .populate("paymentTermId", "name label")
    .lean();
  if (!enquiry) return null;

  const unitRate = agreedRate(enquiry);
  const quantity = enquiry.quantity == null ? null : Number(enquiry.quantity);
  const rateRecord = enquiry.variantRateId || {};
  const variant = rateRecord.productVariant || {};
  return {
    snapshotVersion: DEAL_SNAPSHOT_VERSION,
    capturedAt: new Date(),
    provenance,
    source: {
      enquiryId: enquiry._id,
      enquiryReference: String(enquiry._id).slice(-8).toUpperCase(),
      convertedAt: new Date(),
    },
    parties: {
      buyer: party(enquiry.buyerAssociateId),
      supplier: party(enquiry.sellerAssociateId),
      mediator: enquiry.mediatorAssociateId ? party(enquiry.mediatorAssociateId) : null,
    },
    product: {
      id: idOf(enquiry.productId),
      name: labelOf(enquiry.productId) || labelOf(variant?.product),
      variantId: idOf(variant),
      variant: labelOf(variant),
      specifications: enquiry.specifications || "",
      packagingSpecifications: enquiry.packagingSpecifications || "",
      quantity,
      unit: rateRecord.unit || "",
    },
    commercial: {
      unitRate,
      totalValue: unitRate != null && quantity != null ? Number((unitRate * quantity).toFixed(2)) : null,
      currency: enquiry.currency || rateRecord.currency || "INR",
      incotermId: idOf(enquiry.preferredIncoterm),
      incoterm: labelOf(enquiry.preferredIncoterm),
      paymentTermId: idOf(enquiry.paymentTermId),
      paymentTerm: labelOf(enquiry.paymentTermId),
      supplierCommitUntil: enquiry.supplierCommitUntil || null,
    },
    classification: {
      conventional: Boolean(rateRecord.isConventional),
      natural: Boolean(rateRecord.isNatural),
      organic: Boolean(rateRecord.isOrganic),
      ipmQuality: Boolean(rateRecord.isIpmQuality),
      giTagged: Boolean(rateRecord.isGiTagged),
    },
    delivery: {
      commitmentDate: latestDeliveryCommitment(enquiry),
      executionContext: enquiry.executionContext || null,
    },
    responsibilities: enquiry.responsibilityPlan || {},
    acceptance: {
      sellerAcceptedAt: enquiry.sellerAcceptedAt || null,
      buyerConfirmedAt: enquiry.buyerConfirmedAt || null,
      responsibilitiesFinalizedAt: enquiry.responsibilitiesFinalizedAt || null,
    },
  };
}

export const buildExternalDealSnapshot = (order: any) => ({
  snapshotVersion: DEAL_SNAPSHOT_VERSION,
  capturedAt: new Date(),
  provenance: "EXTERNAL_ORDER",
  source: { enquiryId: null, enquiryReference: "", convertedAt: new Date() },
  parties: {
    buyer: { ...order.externalBuyer, id: null, companyId: null },
    supplier: { ...order.externalSeller, id: null, companyId: null },
    mediator: null,
  },
  product: { ...order.externalProduct, id: null, variantId: null, specifications: "", packagingSpecifications: order.packagingSpecifications || "" },
  commercial: { unitRate: null, totalValue: null, currency: "INR", incotermId: order.incotermId || null, incoterm: "", paymentTermId: order.paymentTermId || null, paymentTerm: "" },
  classification: {},
  delivery: { commitmentDate: order?.milestones?.deliveryTargetDate || null, executionContext: order.executionContext || null },
  responsibilities: order.responsibilities || {},
  acceptance: {},
});

export async function ensureDealSnapshot(order: any) {
  if (order?.dealSnapshot) return order.dealSnapshot;
  const snapshot = order?.enquiry
    ? await buildDealSnapshot(idOf(order.enquiry), "LEGACY_BACKFILL")
    : buildExternalDealSnapshot(order);
  if (!snapshot) return null;
  await OrderModel.updateOne({ _id: order._id, dealSnapshot: null }, { $set: { dealSnapshot: snapshot } });
  return snapshot;
}

export function buildOrderWorkspace(order: any, actorRole = "") {
  const snapshot = order?.dealSnapshot || null;
  const milestones = Array.isArray(order?.paymentPlan?.milestones) ? order.paymentPlan.milestones : [];
  const paid = milestones.filter((item: any) => item.status === "PAID").reduce((sum: number, item: any) => sum + Number(item.percent || 0), 0);
  const due = milestones.filter((item: any) => item.status === "DUE").reduce((sum: number, item: any) => sum + Number(item.percent || 0), 0);
  const internal = ["admin", "operator", "team"].includes(String(actorRole).toLowerCase());
  return {
    dealSummary: snapshot,
    workflow: { stage: order?.workflowStage || "ORDER_CREATED", status: order?.status || "In progress" },
    nextAction: order?.nextAction || "Review the current milestone and complete the available action.",
    responsibleParty: order?.nextResponsibleParty || order?.responsibleParty || "Current milestone owner",
    paymentProgress: { paidPercent: paid, duePercent: due, milestoneCount: milestones.length },
    permissions: { canManagePayments: internal, canManageInternalControls: internal },
  };
}
