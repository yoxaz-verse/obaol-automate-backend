import { VariantRateModel } from "../../database/models/variantRate";
import { ExecutionMode, HookFunction } from "../types";

export const VARIANT_RATE_DELETE_WINDOW_MS = 60 * 60 * 1000;

const forbidden = (message: string) => {
  const error: any = new Error(message);
  error.status = 403;
  error.statusCode = 403;
  return error;
};

const isAdminActor = (req: any) =>
  String(req?.user?.role || "").toLowerCase() === "admin";

/**
 * Published listings are immutable for non-admin actors. They may still change
 * publication status, and may delete a mistaken listing during its first hour.
 */
export const variantRateListingLockPreWriteHook: HookFunction = async (
  payload,
  mode,
  id,
  req,
) => {
  if (isAdminActor(req) || mode === ExecutionMode.CREATE) return payload;

  if (mode === ExecutionMode.UPDATE) {
    const keys = Object.keys(payload || {});
    if (keys.length !== 1 || keys[0] !== "isLive") {
      throw forbidden(
        "Published listings cannot be edited. Only the listing status can be changed.",
      );
    }
    return payload;
  }

  if (mode === ExecutionMode.DELETE && id) {
    const listing = await VariantRateModel.findById(id).select("createdAt").lean();
    if (!listing) return payload;

    const createdAt = new Date((listing as any).createdAt).getTime();
    if (
      !Number.isFinite(createdAt) ||
      Date.now() >= createdAt + VARIANT_RATE_DELETE_WINDOW_MS
    ) {
      throw forbidden(
        "This listing is locked. Listings can only be deleted within one hour of creation.",
      );
    }
  }

  return payload;
};
