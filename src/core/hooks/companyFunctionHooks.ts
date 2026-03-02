import mongoose from "mongoose";
import { ExecutionMode, HookFunction } from "../types";
import { CompanySubFunctionModel } from "../../database/models/companySubFunction";
import { CompanyFunctionMappingModel } from "../../database/models/companyFunctionMapping";

const ensureAdmin = (req: any) => {
  const role = String(req?.user?.role || "").toLowerCase();
  if (role !== "admin") throw new Error("Only admin can modify company function masters.");
};

export const companyFunctionMasterWriteHook: HookFunction = async (payload, mode, id, req) => {
  if (mode === ExecutionMode.CREATE || mode === ExecutionMode.UPDATE || mode === ExecutionMode.DELETE) {
    ensureAdmin(req);
  }
  if (mode === ExecutionMode.DELETE) {
    // Hard delete is blocked; use isActive=false update path.
    throw new Error("Hard delete is disabled for company functions. Use deactivate (isActive=false).");
  }
  return payload;
};

export const companySubFunctionMasterWriteHook: HookFunction = async (payload, mode, id, req) => {
  if (mode === ExecutionMode.CREATE || mode === ExecutionMode.UPDATE || mode === ExecutionMode.DELETE) {
    ensureAdmin(req);
  }

  if (mode === ExecutionMode.UPDATE && id && payload?.functionId) {
    if (!mongoose.Types.ObjectId.isValid(String(payload.functionId))) {
      throw new Error("Invalid functionId.");
    }
  }

  if (mode === ExecutionMode.DELETE) {
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      throw new Error("Invalid sub-function id.");
    }
    const mappingExists = await CompanyFunctionMappingModel.exists({ subFunctionId: id });
    if (mappingExists) {
      throw new Error("Sub-function is mapped to companies. Deactivate it instead of deleting.");
    }
    throw new Error("Hard delete is disabled for sub-functions. Use deactivate (isActive=false).");
  }

  return payload;
};

export const companyFunctionMappingWriteHook: HookFunction = async (payload, mode, id, req) => {
  const role = String(req?.user?.role || "").toLowerCase();
  const allowed = new Set(["admin", "associate", "employee", "team"]);
  if (!allowed.has(role)) {
    throw new Error("Not allowed to manage company capability mappings.");
  }

  if (mode === ExecutionMode.CREATE || mode === ExecutionMode.UPDATE) {
    const functionId = String(payload?.functionId || "");
    const subFunctionId = String(payload?.subFunctionId || "");
    if (!mongoose.Types.ObjectId.isValid(functionId) || !mongoose.Types.ObjectId.isValid(subFunctionId)) {
      throw new Error("Invalid function/sub-function id.");
    }
    const sub = await CompanySubFunctionModel.findById(subFunctionId).select("functionId").lean();
    if (!sub || String(sub.functionId) !== functionId) {
      throw new Error("Sub-function must belong to the selected function.");
    }
  }

  return payload;
};
