import { ExecutionMode, HookFunction } from "../types";

const isEmployeeActor = (req: any) => {
  const role = String(req?.user?.role || "").toLowerCase();
  return role === "employee" || role === "team";
};

export const employeeAssociateCreatePreWriteHook: HookFunction = async (payload, mode, _id, req) => {
  if (mode !== ExecutionMode.CREATE) return payload;
  if (!isEmployeeActor(req)) return payload;

  return {
    ...(payload || {}),
    registrationStatus: "PENDING_REVIEW",
    isActive: false,
    registrationSource: "EMPLOYEE_CREATED",
  };
};

export const employeeCompanyCreatePreWriteHook: HookFunction = async (payload, mode, _id, req) => {
  if (mode !== ExecutionMode.CREATE) return payload;
  if (!isEmployeeActor(req)) return payload;

  return {
    ...(payload || {}),
    assignedEmployee: req?.user?.id,
    registrationStatus: "PENDING_REVIEW",
    isApproved: false,
    approvedAt: null,
    approvedBy: null,
  };
};

