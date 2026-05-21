import { AssociateModel } from "../../database/models/associate";
import { ExecutionMode } from "../types";

const hasAny = (payload: any, keys: string[]) => {
  if (!payload || typeof payload !== "object") return false;
  return keys.some((key) => Object.prototype.hasOwnProperty.call(payload, key));
};

export const associateCompanyPendingLabPreWriteHook = async (
  payload: any,
  mode: ExecutionMode,
  _id?: string,
  req?: any
) => {
  if (mode !== ExecutionMode.UPDATE && mode !== ExecutionMode.CREATE) return payload;
  const role = String(req?.user?.role || "").toLowerCase();
  const userId = String(req?.user?.id || "").trim();
  if (role !== "associate" || !userId) return payload;

  const labKeys = [
    "isQualityLabListed",
    "labDisplayName",
    "labContactEmail",
    "labContactPhone",
    "labContactPhoneSecondary",
    "labTests",
    "labCertifications",
    "labSpecifications",
    "labAcceptedItems",
    "labNotes",
    "location",
    "address",
  ];

  if (!hasAny(payload, labKeys)) return payload;

  const associate = await AssociateModel.findById(userId)
    .select("registrationStatus")
    .lean();
  const isApproved = String((associate as any)?.registrationStatus || "").toUpperCase() === "APPROVED";
  const nextPayload: any = { ...payload };

  if (!isApproved) {
    nextPayload.labListingState = "DRAFT";
    nextPayload.labActivatedAt = null;
    nextPayload.labActivatedBy = null;
    nextPayload.isQualityLabListed = false;
  } else {
    nextPayload.labListingState = "LIVE";
    nextPayload.isQualityLabListed = true;
  }
  return nextPayload;
};

