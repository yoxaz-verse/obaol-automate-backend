import { AssociateModel } from "../../database/models/associate";
import { ExecutionMode, HookFunction } from "../types";

/**
 * Associates without linked companies cannot create own variant rates.
 * This is enforced at backend level to prevent API bypass.
 */
export const variantRateOwnershipPreWriteHook: HookFunction = async (payload, mode, _id, req) => {
  if (mode !== ExecutionMode.CREATE) return payload;

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

  return {
    ...(payload || {}),
    associate: associateId,
    associateCompany: (associate as any).associateCompany
  };
};
