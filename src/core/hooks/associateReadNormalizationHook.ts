import mongoose from "mongoose";
import { DesignationModel } from "../../database/models/designation";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const isObjectIdLike = (value: any) =>
  value && (typeof value === "string" || typeof value === "object") &&
  mongoose.Types.ObjectId.isValid(String((value as any)?._id || value));

export const associateReadNormalizationHook = async (rows: any[]): Promise<any[]> => {
  const now = Date.now();
  const normalizedRows = rows.map((row: any) =>
    typeof row?.toObject === "function" ? row.toObject() : { ...row }
  );

  const rawDesignationIds = normalizedRows
    .map((row: any) => row?.designation?._id || row?.designation)
    .filter((val: any) => isObjectIdLike(val))
    .map((val: any) => String(val?._id || val));

  const uniqueDesignationIds = Array.from(new Set(rawDesignationIds));
  const designationMap = new Map<string, string>();
  if (uniqueDesignationIds.length) {
    const designationRows = await DesignationModel.find({
      _id: { $in: uniqueDesignationIds },
      isDeleted: { $ne: true },
    }).select("_id name").lean();
    for (const item of designationRows) {
      designationMap.set(String(item._id), String((item as any).name || ""));
    }
  }

  return normalizedRows.map((row: any) => {
    const rawDesignation = row?.designation;
    const designationId = isObjectIdLike(rawDesignation)
      ? String(rawDesignation?._id || rawDesignation)
      : "";

    const designationName =
      (rawDesignation && typeof rawDesignation === "object" && rawDesignation?.name) ||
      (designationId ? designationMap.get(designationId) : "") ||
      (typeof rawDesignation === "string" && !isObjectIdLike(rawDesignation) ? rawDesignation : "") ||
      "";
    const lastSeenAt = row?.lastSeenAt ? new Date(row.lastSeenAt) : null;
    const isOnline = Boolean(lastSeenAt && (now - lastSeenAt.getTime()) <= ONLINE_WINDOW_MS);

    return {
      ...row,
      designationId: designationId || null,
      designationName: designationName || null,
      presenceStatus: isOnline ? "ONLINE" : "OFFLINE",
      lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
    };
  });
};
