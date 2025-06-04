// src/controllers/rateAttachmentController.ts
import { Request, Response } from "express";
import rateAttachmentService from "../services/rateAttachmentService";

class RateAttachmentController {
  /** GET /api/v1/rate‐attachments/:variantRateId */
  public getByRate = async (req: Request, res: Response) => {
    const { variantRateId } = req.params;
    const doc = await rateAttachmentService.getByVariantRate(variantRateId);
    if (!doc) return res.status(404).json({ message: "No attachments found" });
    res.json({ attachments: doc });
  };

  /** PUT /api/v1/rate‐attachments/:variantRateId */
  public upsert = async (req: Request, res: Response) => {
    const { variantRateId } = req.params;
    // Expect body: { gstDocs: [...ids], media: [...], videos: [...], certificates: [...] }
    const payload = req.body;
    const updated = await rateAttachmentService.upsertAttachments(variantRateId, payload);
    res.json({ message: "Attachments updated", attachments: updated });
  };

  /** DELETE /api/v1/rate‐attachments/:variantRateId */
  public deleteAll = async (req: Request, res: Response) => {
    const { variantRateId } = req.params;
    await rateAttachmentService.deleteByVariantRate(variantRateId);
    res.json({ message: "Attachments removed" });
  };
}

export default new RateAttachmentController();
