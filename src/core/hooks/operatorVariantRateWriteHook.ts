import { VariantRateModel } from "../../database/models/variantRate";
import { AssociateModel } from "../../database/models/associate";
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

const badRequest = (message: string) => {
  const err: any = new Error(message);
  err.status = 400;
  err.statusCode = 400;
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
    let targetCompany = String((payload as any)?.associateCompany || "").trim();

    if (!targetCompany) {
      const associateId = String((payload as any)?.associate || "").trim();
      if (!associateId) {
        throw badRequest("Select an associate company or provide a valid associate.");
      }

      const associate = await AssociateModel.findById(associateId).select("_id associateCompany").lean();
      const resolvedCompanyId = String((associate as any)?.associateCompany || "").trim();
      if (!resolvedCompanyId) {
        throw badRequest("Selected associate is not linked to a company.");
      }
      targetCompany = resolvedCompanyId;
    }

    if (!assignedIdSet.has(targetCompany)) {
      throw forbidden("You can only create rates for companies assigned to you.");
    }

    return {
      ...(payload as any),
      associateCompany: targetCompany,
    };
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
