import { ExecutionMode, HookFunction } from "../types";

const isOperatorActor = (req: any) => {
  const role = String(req?.user?.role || "").toLowerCase();
  return role === "operator" || role === "team";
};

const ASSOCIATE_ADMIN_CONTROLLED_FIELDS = [
  "isActive",
  "isCompanyVerified",
  "isEmailVerified",
  "registrationStatus",
] as const;

const isAdminActor = (req: any) => String(req?.user?.role || "").toLowerCase() === "admin";

const rejectAdminControlledAssociateFields = (payload: any, req: any) => {
  if (isAdminActor(req)) return;

  const submittedFields = ASSOCIATE_ADMIN_CONTROLLED_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(payload || {}, field)
  );

  if (submittedFields.length > 0) {
    const err: any = new Error(
      `Verification and approval fields are admin-controlled: ${submittedFields.join(", ")}.`
    );
    err.status = 403;
    err.statusCode = 403;
    throw err;
  }
};

export const operatorAssociateCreatePreWriteHook: HookFunction = async (payload, mode, _id, req) => {
  if (mode === ExecutionMode.UPDATE) {
    rejectAdminControlledAssociateFields(payload, req);
    return payload;
  }

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
