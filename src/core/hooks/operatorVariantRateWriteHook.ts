import { VariantRateModel } from "../../database/models/variantRate";
import { ExecutionMode, HookFunction } from "../types";
import { getOperatorCompanyScope } from "./operatorScope";

const isOperatorActor = (req: any) => {
  const role = String(req?.user?.role || "").toLowerCase();
  return role === "operator" || role === "team";
};

const forbidden = (message: string) => {
  const err: any = new Error(message);
  err.status = 403;
  err.statusCode = 403;
  return err;
};

export const operatorVariantRateWritePreHook: HookFunction = async (payload, mode, id, req) => {
  if (!isOperatorActor(req)) return payload;

  const operatorId = String(req?.user?.id || "");
  if (!operatorId) {
    throw forbidden("Unauthorized operator session.");
  }

  const { companyIdSet: assignedIdSet } = await getOperatorCompanyScope(operatorId);

  if (mode === ExecutionMode.CREATE) {
    const targetCompany = String((payload as any)?.associateCompany || "");
    if (!targetCompany || !assignedIdSet.has(targetCompany)) {
      throw forbidden("You can only create rates for companies assigned to you.");
    }
    return payload;
  }

  if (mode === ExecutionMode.UPDATE || mode === ExecutionMode.DELETE) {
    if (!id) return payload;

    const existingRate = await VariantRateModel.findById(id).select("associateCompany").lean();
    if (!existingRate) return payload;

    const existingCompanyId = String((existingRate as any).associateCompany || "");
    if (!existingCompanyId || !assignedIdSet.has(existingCompanyId)) {
      throw forbidden("You can only modify rates for companies assigned to you.");
    }

    if (mode === ExecutionMode.UPDATE && (payload as any)?.associateCompany) {
      const nextCompanyId = String((payload as any).associateCompany);
      if (!assignedIdSet.has(nextCompanyId)) {
        throw forbidden("You cannot move a rate to an unassigned company.");
      }
    }
  }

  return payload;
};
