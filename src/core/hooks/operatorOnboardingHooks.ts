import { ExecutionMode, HookFunction } from "../types";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import mongoose from "mongoose";

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
    const role = String(req?.user?.role || "").toLowerCase();
    if (role === "associate") {
      if (String(_id || "") !== String(req?.user?.id || "")) {
        const err: any = new Error("Associates can only update their own profile.");
        err.status = 403;
        err.statusCode = 403;
        throw err;
      }

      const submittedFields = Object.keys(payload || {});
      if (submittedFields.length !== 1 || submittedFields[0] !== "associateCompany") {
        const err: any = new Error("Associates can only change their associate company.");
        err.status = 403;
        err.statusCode = 403;
        throw err;
      }

      if (!mongoose.Types.ObjectId.isValid(String(payload.associateCompany || ""))) {
        const err: any = new Error("Select an approved associate company.");
        err.status = 400;
        err.statusCode = 400;
        throw err;
      }

      const company = await AssociateCompanyModel.exists({
        _id: payload.associateCompany,
        registrationStatus: "APPROVED",
        isApproved: true,
        isDeleted: { $ne: true },
        isExternalDirectoryListing: { $ne: true },
      });
      if (!company) {
        const err: any = new Error("Select an approved associate company.");
        err.status = 400;
        err.statusCode = 400;
        throw err;
      }
      return { associateCompany: payload.associateCompany };
    }

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
