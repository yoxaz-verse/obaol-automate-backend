import { Request, Response } from "express";
import mongoose from "mongoose";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { CompanySubFunctionModel } from "../database/models/companySubFunction";
import { CompanyFunctionMappingModel } from "../database/models/companyFunctionMapping";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { AssociateModel } from "../database/models/associate";

const slugify = (value: string) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseBoolean = (value: any, defaultValue = true) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

export class CompanyFunctionController {
  async listFunctions(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(1000, Math.max(1, Number(req.query.limit || 1000)));
      const activeOnly = parseBoolean(req.query.activeOnly, true);
      const search = String(req.query.search || "").trim();
      const q: any = {};
      if (activeOnly) q.isActive = true;
      if (search) q.name = { $regex: search, $options: "i" };
      const [total, rows] = await Promise.all([
        CompanyFunctionModel.countDocuments(q),
        CompanyFunctionModel.find(q)
          .select("_id name slug description isActive orderIndex createdAt updatedAt")
          .sort({ orderIndex: 1, name: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);

      return res.json({
        success: true,
        data: {
          data: rows,
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to fetch company functions." });
    }
  }

  async listSubFunctions(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(2000, Math.max(1, Number(req.query.limit || 1000)));
      const activeOnly = parseBoolean(req.query.activeOnly, true);
      const functionId = String(req.query.function_id || req.query.functionId || "").trim();
      const search = String(req.query.search || "").trim();

      const q: any = {};
      if (activeOnly) q.isActive = true;
      if (functionId && mongoose.Types.ObjectId.isValid(functionId)) q.functionId = functionId;
      if (search) q.name = { $regex: search, $options: "i" };

      const [total, rows] = await Promise.all([
        CompanySubFunctionModel.countDocuments(q),
        CompanySubFunctionModel.find(q)
          .select("_id functionId name slug description isActive orderIndex createdAt updatedAt")
          .sort({ orderIndex: 1, name: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);

      return res.json({
        success: true,
        data: {
          data: rows,
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to fetch company sub-functions." });
    }
  }

  async createFunction(req: Request, res: Response) {
    try {
      const name = String(req.body?.name || "").trim();
      const description = String(req.body?.description || "").trim();
      const isActive = parseBoolean(req.body?.isActive, true);
      const orderIndex = Number(req.body?.orderIndex || 0);
      if (!name) return res.status(400).json({ success: false, message: "Function name is required." });

      const doc = await CompanyFunctionModel.create({
        name,
        slug: slugify(req.body?.slug || name),
        description,
        isActive,
        orderIndex,
      });
      return res.status(201).json({ success: true, data: doc });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to create function." });
    }
  }

  async updateFunction(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "");
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid function id." });

      const patch: any = {};
      if (req.body?.name !== undefined) {
        patch.name = String(req.body.name || "").trim();
        if (!patch.name) return res.status(400).json({ success: false, message: "Function name cannot be empty." });
      }
      if (req.body?.slug !== undefined) patch.slug = slugify(req.body.slug);
      if (req.body?.description !== undefined) patch.description = String(req.body.description || "").trim();
      if (req.body?.isActive !== undefined) patch.isActive = parseBoolean(req.body.isActive, true);
      if (req.body?.orderIndex !== undefined) patch.orderIndex = Number(req.body.orderIndex || 0);

      const updated = await CompanyFunctionModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: "Function not found." });
      return res.json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to update function." });
    }
  }

  async createSubFunction(req: Request, res: Response) {
    try {
      const functionId = String(req.body?.functionId || req.body?.function_id || "").trim();
      const name = String(req.body?.name || "").trim();
      const description = String(req.body?.description || "").trim();
      const isActive = parseBoolean(req.body?.isActive, true);
      const orderIndex = Number(req.body?.orderIndex || 0);

      if (!mongoose.Types.ObjectId.isValid(functionId)) return res.status(400).json({ success: false, message: "Valid functionId is required." });
      if (!name) return res.status(400).json({ success: false, message: "Sub-function name is required." });

      const fn = await CompanyFunctionModel.findById(functionId).select("_id").lean();
      if (!fn) return res.status(404).json({ success: false, message: "Parent function not found." });

      const doc = await CompanySubFunctionModel.create({
        functionId,
        name,
        slug: slugify(req.body?.slug || name),
        description,
        isActive,
        orderIndex,
      });
      return res.status(201).json({ success: true, data: doc });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to create sub-function." });
    }
  }

  async updateSubFunction(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "");
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid sub-function id." });

      const patch: any = {};
      if (req.body?.name !== undefined) {
        patch.name = String(req.body.name || "").trim();
        if (!patch.name) return res.status(400).json({ success: false, message: "Sub-function name cannot be empty." });
      }
      if (req.body?.slug !== undefined) patch.slug = slugify(req.body.slug);
      if (req.body?.description !== undefined) patch.description = String(req.body.description || "").trim();
      if (req.body?.isActive !== undefined) patch.isActive = parseBoolean(req.body.isActive, true);
      if (req.body?.orderIndex !== undefined) patch.orderIndex = Number(req.body.orderIndex || 0);
      if (req.body?.functionId !== undefined || req.body?.function_id !== undefined) {
        const functionId = String(req.body?.functionId || req.body?.function_id || "").trim();
        if (!mongoose.Types.ObjectId.isValid(functionId)) return res.status(400).json({ success: false, message: "Invalid functionId." });
        const fn = await CompanyFunctionModel.findById(functionId).select("_id").lean();
        if (!fn) return res.status(404).json({ success: false, message: "Parent function not found." });
        patch.functionId = functionId;
      }

      const updated = await CompanySubFunctionModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: "Sub-function not found." });
      return res.json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to update sub-function." });
    }
  }

  async upsertCompanyFunctions(req: Request, res: Response) {
    try {
      const roleLower = String(req.user?.role || "").toLowerCase();
      const userId = String(req.user?.id || "");
      let companyId = String(req.body?.companyId || "").trim();

      if (roleLower !== "admin") {
        const associate = await AssociateModel.findById(userId).select("associateCompany").lean();
        companyId = String((associate as any)?.associateCompany || "");
      }

      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ success: false, message: "Valid companyId is required." });
      }
      const company = await AssociateCompanyModel.findById(companyId).select("_id").lean();
      if (!company) return res.status(404).json({ success: false, message: "Company not found." });

      const mappingsInput = Array.isArray(req.body?.mappings) ? req.body.mappings : [];
      if (!mappingsInput.length) {
        return res.status(400).json({ success: false, message: "At least one sub-function must be selected." });
      }

      const normalized = mappingsInput.map((row: any) => ({
        functionId: String(row?.functionId || "").trim(),
        subFunctionId: String(row?.subFunctionId || "").trim(),
      }));

      const unique = new Map<string, { functionId: string; subFunctionId: string }>();
      for (const row of normalized) {
        if (!mongoose.Types.ObjectId.isValid(row.functionId) || !mongoose.Types.ObjectId.isValid(row.subFunctionId)) {
          return res.status(400).json({ success: false, message: "Invalid function/sub-function id in mappings." });
        }
        unique.set(`${row.functionId}:${row.subFunctionId}`, row);
      }

      const rows = Array.from(unique.values());
      const subIds = rows.map((x) => new mongoose.Types.ObjectId(x.subFunctionId));
      const subRows = await CompanySubFunctionModel.find({ _id: { $in: subIds }, isActive: true })
        .select("_id functionId")
        .lean();
      if (subRows.length !== rows.length) {
        return res.status(400).json({ success: false, message: "One or more selected sub-functions are invalid/inactive." });
      }
      const subMap = new Map(subRows.map((x: any) => [String(x._id), String(x.functionId)]));
      for (const row of rows) {
        if (subMap.get(row.subFunctionId) !== row.functionId) {
          return res.status(400).json({ success: false, message: "Sub-function/function mismatch in mappings." });
        }
      }

      await CompanyFunctionMappingModel.deleteMany({ companyId });
      await CompanyFunctionMappingModel.insertMany(
        rows.map((row) => ({
          companyId,
          functionId: row.functionId,
          subFunctionId: row.subFunctionId,
          isVerified: false,
        }))
      );

      // Keep backward-compatible capability flagging using parent function slugs.
      const fnIds = Array.from(new Set(rows.map((x) => x.functionId))).map((id) => new mongoose.Types.ObjectId(id));
      const fnRows = await CompanyFunctionModel.find({ _id: { $in: fnIds } }).select("slug").lean();
      const capabilitySlugs = Array.from(new Set(fnRows.map((x: any) => String(x.slug || "").toUpperCase()).filter(Boolean)));
      await AssociateCompanyModel.findByIdAndUpdate(companyId, { $set: { serviceCapabilities: capabilitySlugs } });

      const saved = await CompanyFunctionMappingModel.find({ companyId })
        .select("_id companyId functionId subFunctionId isVerified createdAt updatedAt")
        .lean();

      return res.json({ success: true, data: saved });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to save company function mappings." });
    }
  }

  async deleteCompanyFunctionMapping(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "").trim();
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid mapping id." });
      }

      const roleLower = String(req.user?.role || "").toLowerCase();
      const userId = String(req.user?.id || "");

      const row = await CompanyFunctionMappingModel.findById(id)
        .select("_id companyId")
        .lean();
      if (!row) return res.status(404).json({ success: false, message: "Mapping not found." });

      if (roleLower !== "admin") {
        const associate = await AssociateModel.findById(userId).select("associateCompany").lean();
        const associateCompanyId = String((associate as any)?.associateCompany || "");
        if (!associateCompanyId || String(row.companyId) !== associateCompanyId) {
          return res.status(403).json({ success: false, message: "Not allowed to delete this mapping." });
        }
      }

      await CompanyFunctionMappingModel.deleteOne({ _id: id });
      return res.json({ success: true, data: { _id: id } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Failed to delete company function mapping." });
    }
  }
}

export const companyFunctionController = new CompanyFunctionController();
