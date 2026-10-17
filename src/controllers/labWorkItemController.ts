import { Request, Response } from "express";
import { Types } from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { InquiryModel } from "../database/models/enquiry";
import { LAB_CUSTODY_STATUSES, LabWorkItemModel } from "../database/models/labWorkItem";

const transitions: Record<string, string[]> = {
  EXPECTED: ["RECEIVED"],
  RECEIVED: ["TESTING"],
  TESTING: ["COMPLETED"],
  COMPLETED: ["RELEASED"],
  RELEASED: [],
};
export const isValidLabCustodyTransition = (current: string, next: string) => (transitions[current] || []).includes(next);

const roleOf = (req: Request) => String(req.user?.role || "").toLowerCase();
const isStaff = (req: Request) => ["admin", "operator", "team"].includes(roleOf(req));
const ownCompanyId = async (req: Request) => {
  if (roleOf(req) !== "associate") return "";
  const associate = await AssociateModel.findById(req.user?.id).select("associateCompany").lean();
  return String((associate as any)?.associateCompany || "");
};

const staffInquiryIds = async (req: Request) => {
  if (roleOf(req) === "admin") return null;
  const rows = await InquiryModel.find({ $or: [
    { supplierOperatorId: req.user?.id },
    { dealCloserOperatorId: req.user?.id },
    { handlerOperatorId: req.user?.id },
  ] }).select("_id").lean();
  return rows.map((row: any) => row._id);
};

const accessQuery = async (req: Request) => {
  if (roleOf(req) === "associate") {
    const companyId = await ownCompanyId(req);
    return companyId && Types.ObjectId.isValid(companyId) ? { labCompanyId: companyId } : { _id: null };
  }
  if (roleOf(req) === "admin") return {};
  if (["operator", "team"].includes(roleOf(req))) return { inquiryId: { $in: await staffInquiryIds(req) } };
  return { _id: null };
};

const populated = (query: any) => query
  .populate("labCompanyId", "name")
  .populate("inquiryId", "enquiryCode productId productVariant workflowStage status executionContext")
  .sort({ updatedAt: -1 });

export class LabWorkItemController {
  async list(req: Request, res: Response) {
    const query: any = await accessQuery(req);
    const state = String(req.query.state || "active").toLowerCase();
    query.status = state === "history" ? { $in: ["COMPLETED", "RELEASED"] } : { $nin: ["COMPLETED", "RELEASED"] };
    const rows = await populated(LabWorkItemModel.find(query)).lean();
    return res.json({ success: true, data: rows, meta: { state, count: rows.length } });
  }

  async detail(req: Request, res: Response) {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid lab work item id." });
    const row = await populated(LabWorkItemModel.findOne({ _id: req.params.id, ...(await accessQuery(req)) })).lean();
    return row ? res.json({ success: true, data: row }) : res.status(404).json({ success: false, message: "Lab work item not found." });
  }

  async transition(req: Request, res: Response) {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid lab work item id." });
    if (!isStaff(req) && roleOf(req) !== "associate") return res.status(403).json({ success: false, message: "Lab execution access required." });
    const access = await accessQuery(req);
    const row: any = await LabWorkItemModel.findOne({ _id: req.params.id, ...access }).select("status").lean();
    if (!row) return res.status(404).json({ success: false, message: "Lab work item not found." });
    const next = String(req.body?.status || "").toUpperCase();
    if (!(LAB_CUSTODY_STATUSES as readonly string[]).includes(next)) return res.status(400).json({ success: false, message: "Invalid custody status." });
    if (!isValidLabCustodyTransition(String(row.status), next)) return res.status(409).json({ success: false, message: `Cannot move a sample from ${row.status} to ${next}.` });
    const note = String(req.body?.note || "").trim();
    if (note.length > 1000) return res.status(400).json({ success: false, message: "Custody note cannot exceed 1000 characters." });
    const now = new Date();
    const updated: any = await LabWorkItemModel.findOneAndUpdate(
      { _id: req.params.id, ...access, status: row.status },
      {
        $set: { status: next, updatedBy: req.user?.id, ...(note ? { notes: note } : {}), [`${next.toLowerCase()}At`]: now },
        $push: { statusHistory: { status: next, at: now, by: req.user?.id, note } },
      },
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(409).json({ success: false, message: "Custody status changed in another session. Refresh before continuing.", error: { code: "LAB_CUSTODY_CONFLICT", expectedStatus: row.status } });
    return res.json({ success: true, data: updated });
  }
}
