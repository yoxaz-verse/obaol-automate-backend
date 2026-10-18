import { ServiceRequirementModel } from "../database/models/serviceRequirement";

export const resolveServiceRequirementStatus = (status: string, opensAt: any, closesAt: any, now = new Date()) => {
  if (["DRAFT", "AWARDED", "CANCELLED"].includes(status)) return status;
  if (closesAt && new Date(closesAt) <= now) return "CLOSED";
  if (opensAt && new Date(opensAt) <= now) return "OPEN";
  return opensAt ? "SCHEDULED" : status;
};

export const synchronizeServiceRequirements = async (department = "PACKAGING", now = new Date()) => {
  await ServiceRequirementModel.updateMany({ department, status: "SCHEDULED", opensAt: { $lte: now }, closesAt: { $gt: now } }, { $set: { status: "OPEN", "lifecycleNotices.openedAt": now } });
  await ServiceRequirementModel.updateMany({ department, status: { $in: ["SCHEDULED", "OPEN"] }, closesAt: { $lte: now } }, { $set: { status: "CLOSED", "lifecycleNotices.closedAt": now } });
};

export const redactServiceRequirement = (requirement: any, offers: any[], viewer: { companyId?: string; owner?: boolean; provider?: boolean; staff?: boolean }) => {
  const base: any = { ...requirement, offerCount: offers.filter((offer) => offer.status !== "WITHDRAWN").length };
  delete base.winningOffer;
  const closed = ["CLOSED", "AWARDED"].includes(String(requirement.status));
  if ((viewer.owner || viewer.staff) && closed) base.offers = offers;
  else delete base.offers;
  if (viewer.provider && viewer.companyId) base.ownOffer = offers.find((offer) => String(offer.providerCompany?._id || offer.providerCompany) === viewer.companyId) || null;
  return base;
};
