import { AssociateModel } from "../../database/models/associate";
import { VariantRateModel } from "../../database/models/variantRate";
import { ExecutionMode, HookFunction } from "../types";

/**
 * Associates without linked companies cannot create own variant rates.
 * This is enforced at backend level to prevent API bypass.
 */
export const variantRateOwnershipPreWriteHook: HookFunction = async (payload, mode, _id, req) => {
  const role = String(req?.user?.role || "").toLowerCase();
  if (role !== "associate") return payload;

  const associateId = String(req?.user?.id || "");
  if (!associateId) {
    throw new Error("Unauthorized associate session.");
  }

  const associate = await AssociateModel.findById(associateId).select("_id associateCompany").lean();
  if (!associate) {
    throw new Error("Associate profile was not found.");
  }

  if (!(associate as any).associateCompany) {
    const err: any = new Error("Link a company to add your own rates. You can add marketplace products to your personal catalog.");
    err.status = 403;
    err.statusCode = 403;
    throw err;
  }

  if (mode === ExecutionMode.UPDATE || mode === ExecutionMode.DELETE) {
    const existing = _id
      ? await VariantRateModel.findById(_id).select("associate associateCompany").lean()
      : null;
    const ownsListing = Boolean(existing) && (
      String((existing as any).associate || "") === associateId ||
      String((existing as any).associateCompany || "") === String((associate as any).associateCompany || "")
    );
    if (!ownsListing) {
      const err: any = new Error("You can only modify listings owned by your company.");
      err.status = 403;
      err.statusCode = 403;
      throw err;
    }
    return payload;
  }

  if (mode !== ExecutionMode.CREATE) return payload;

  return {
    ...(payload || {}),
    associate: associateId,
    associateCompany: (associate as any).associateCompany
  };
};
