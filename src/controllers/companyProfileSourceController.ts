import { Request, Response } from "express";
import { Types } from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";

const id = (value: any) => String(value?._id || value || "");
const role = (req: Request) => String(req.user?.role || "").toLowerCase();
const fail = (res: Response, status: number, message: string) => res.status(status).json({ success: false, message });

export const getCompanyProfileSource = async (req: Request, res: Response) => {
  const requested = String(req.query.companyId || "");
  let own = id(req.user?.associateCompany);
  if (role(req) === "associate") {
    const associate: any = await AssociateModel.findById(req.user?.id).select("associateCompany").lean();
    own = id(associate?.associateCompany);
  }
  const companyId = requested || own;
  if (!Types.ObjectId.isValid(companyId)) return fail(res, 403, "A company workspace is required.");
  if (role(req) !== "admin" && companyId !== own) {
    const authorized = await AssociateCompanyModel.exists({ _id: companyId, $or: [{ assignedOperator: req.user?.id }, { supervisor: req.user?.id }] });
    if (!authorized) return fail(res, 403, "You are not authorized to use this company profile.");
  }
  const company: any = await AssociateCompanyModel.findById(companyId).populate("country", "name").populate("state", "name").lean();
  if (!company) return fail(res, 404, "Company profile not found.");
  const source = {
    companyId: id(company), name: company.name || company.registeredTradeName || "", summary: company.description || company.aboutUs || "",
    email: company.email || "", phone: company.phone || "", phoneSecondary: company.phoneSecondary || "", whatsappPhone: company.phone || "", website: company.website || "", logo: company.logo || "",
    address: company.address || company.registeredAddress || "", country: company.country?.name || "", state: company.state?.name || "", city: company.district?.name || "",
    latitude: company.location?.latitude ?? null, longitude: company.location?.longitude ?? null, locationLabel: company.location?.label || company.address || company.registeredAddress || "",
  };
  const required: Record<string, any> = { name: source.name, summary: source.summary, email: source.email, phone: source.phone, website: source.website, address: source.address };
  const missing = Object.entries(required).filter(([, value]) => !String(value || "").trim()).map(([key]) => key);
  return res.json({ success: true, data: { ...source, missing, complete: missing.length === 0, companyPage: "/dashboard/company" } });
};
