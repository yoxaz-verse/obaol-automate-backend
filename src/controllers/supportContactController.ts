import { NextFunction, Request, Response } from "express";
import { SupportContactModel } from "../database/models/supportContact";
import { normalizePhoneInput } from "../utils/phone";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdmin = (req: Request) => normalizeRole(req.user?.role) === "admin";
const isAssociate = (req: Request) => normalizeRole(req.user?.role) === "associate";

const normalizedPhone = (body: any) => {
  const phone = normalizePhoneInput({
    rawPhone: body?.phoneNumber,
    rawCountryCode: body?.phoneCountryCode,
    rawNational: body?.phoneNational,
  });
  if (!/^\+\d{7,15}$/.test(phone.e164)) return null;
  return {
    phoneNumber: phone.e164,
    displayPhoneNumber: `${phone.countryCode} ${phone.national}`,
    phoneCountryCode: phone.countryCode,
    phoneNational: phone.national,
  };
};

export class SupportContactController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req) && !isAssociate(req)) {
        return res.status(403).json({ success: false, message: "Customer support is available to associates and admins only." });
      }
      const query: Record<string, unknown> = { isDeleted: { $ne: true } };
      if (isAssociate(req)) query.isActive = true;
      const contacts = await SupportContactModel.find(query).sort({ sortOrder: 1, createdAt: 1 }).lean();
      return res.json({ success: true, data: contacts });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin only." });
      const label = String(req.body?.label || "").trim();
      const phone = normalizedPhone(req.body);
      if (!label) return res.status(400).json({ success: false, message: "Contact label is required." });
      if (!phone) return res.status(400).json({ success: false, message: "Enter a valid international phone number." });

      const contact = await SupportContactModel.create({
        label,
        ...phone,
        isActive: req.body?.isActive !== false,
        sortOrder: Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0,
      });
      return res.status(201).json({ success: true, data: contact });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin only." });
      const update: Record<string, unknown> = {};
      if (req.body?.label !== undefined) {
        const label = String(req.body.label || "").trim();
        if (!label) return res.status(400).json({ success: false, message: "Contact label is required." });
        update.label = label;
      }
      if (req.body?.phoneNumber !== undefined || req.body?.phoneCountryCode !== undefined || req.body?.phoneNational !== undefined) {
        const phone = normalizedPhone(req.body);
        if (!phone) return res.status(400).json({ success: false, message: "Enter a valid international phone number." });
        Object.assign(update, phone);
      }
      if (req.body?.isActive !== undefined) update.isActive = Boolean(req.body.isActive);
      if (req.body?.sortOrder !== undefined) {
        const sortOrder = Number(req.body.sortOrder);
        if (!Number.isFinite(sortOrder)) return res.status(400).json({ success: false, message: "Display order must be a number." });
        update.sortOrder = sortOrder;
      }
      const contact = await SupportContactModel.findOneAndUpdate(
        { _id: req.params.id, isDeleted: { $ne: true } },
        update,
        { new: true, runValidators: true }
      );
      if (!contact) return res.status(404).json({ success: false, message: "Support contact not found." });
      return res.json({ success: true, data: contact });
    } catch (error) {
      next(error);
    }
  }
}

export const supportContactController = new SupportContactController();
