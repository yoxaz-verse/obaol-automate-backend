import { Types } from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { SystemConfigModel } from "../database/models/systemConfig";

export const OBAOL_COMPANY_KEY = "OBAOL_COMPANY_ID";

export type ObaolCompanyConfigStatus = "CONFIGURED" | "MISSING" | "INVALID";

export type ObaolCompanyResolution = {
  status: ObaolCompanyConfigStatus;
  companyId: Types.ObjectId | null;
  company: any | null;
  source: "DATABASE" | "ENVIRONMENT" | null;
};

const findCompany = async (rawId: unknown) => {
  const id = String(rawId || "").trim();
  if (!id || !Types.ObjectId.isValid(id)) return null;
  return AssociateCompanyModel.findById(id).select("name slug email phone address gstin").lean();
};

/** Database configuration is canonical; the environment is only a valid fallback. */
export const resolveObaolCompany = async (): Promise<ObaolCompanyResolution> => {
  const config = await SystemConfigModel.findOne({ key: OBAOL_COMPANY_KEY }).lean();
  const configuredId = String(config?.value || "").trim();

  if (configuredId) {
    const company = await findCompany(configuredId);
    if (company) {
      return { status: "CONFIGURED", companyId: new Types.ObjectId(configuredId), company, source: "DATABASE" };
    }
    return { status: "INVALID", companyId: null, company: null, source: "DATABASE" };
  }

  const envId = String(process.env.OBAOL_COMPANY_ID || "").trim();
  if (envId) {
    const company = await findCompany(envId);
    if (company) {
      return { status: "CONFIGURED", companyId: new Types.ObjectId(envId), company, source: "ENVIRONMENT" };
    }
    return { status: "INVALID", companyId: null, company: null, source: "ENVIRONMENT" };
  }

  return { status: "MISSING", companyId: null, company: null, source: null };
};

export const obaolConfigMessage = (status: ObaolCompanyConfigStatus) =>
  status === "MISSING"
    ? "OBAOL company configuration is missing. Set it in Dashboard → Company."
    : "OBAOL company configuration is invalid. Select a valid company in Dashboard → Company.";
