import { ExecutionMode, HookFunction } from "../types";

const isOperatorActor = (req: any) => {
  const role = String(req?.user?.role || "").toLowerCase();
  return role === "operator" || role === "team";
};

export const operatorAssociateCreatePreWriteHook: HookFunction = async (payload, mode, _id, req) => {
  if (mode !== ExecutionMode.CREATE) return payload;
  if (!isOperatorActor(req)) return payload;

  return {
    ...(payload || {}),
    registrationStatus: "PENDING_REVIEW",
    isActive: false,
    registrationSource: "OPERATOR_CREATED",
  };
};

export const operatorCompanyCreatePreWriteHook: HookFunction = async (payload, mode, _id, req) => {
  if (mode !== ExecutionMode.CREATE) return payload;
  if (!isOperatorActor(req)) return payload;

  return {
    ...(payload || {}),
    assignedOperator: req?.user?.id,
    registrationStatus: "PENDING_REVIEW",
    isApproved: false,
    approvedAt: null,
    approvedBy: null,
  };
};
