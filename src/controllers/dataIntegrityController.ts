import { Request, Response } from "express";
import { cleanupAssociateOrphans, permanentlyDelete, previewPermanentDelete, scanAssociateOrphans } from "../services/dataIntegrity.service";

const fail = (res: Response, error: any) => res.status(Number(error?.status || error?.statusCode || 500)).json({ success: false, message: error?.message || "Data integrity operation failed." });

export const dataIntegrityController = {
  async orphans(_req: Request, res: Response) { try { const entries = await scanAssociateOrphans(); return res.json({ success: true, data: { entries, total: entries.reduce((sum, row) => sum + row.count, 0) } }); } catch (error) { return fail(res, error); } },
  async cleanup(req: Request, res: Response) { try { return res.json({ success: true, data: await cleanupAssociateOrphans(String(req.body?.confirmation || ""), String((req as any).user?.id || "unknown-admin")) }); } catch (error) { return fail(res, error); } },
  async previewAssociate(req: Request, res: Response) { try { return res.json({ success: true, data: await previewPermanentDelete("associate", req.params.id) }); } catch (error) { return fail(res, error); } },
  async deleteAssociate(req: Request, res: Response) { try { return res.json({ success: true, data: await permanentlyDelete("associate", req.params.id, String(req.body?.confirmation || ""), String((req as any).user?.id || "unknown-admin")) }); } catch (error) { return fail(res, error); } },
  async previewCompany(req: Request, res: Response) { try { return res.json({ success: true, data: await previewPermanentDelete("company", req.params.id) }); } catch (error) { return fail(res, error); } },
  async deleteCompany(req: Request, res: Response) { try { return res.json({ success: true, data: await permanentlyDelete("company", req.params.id, String(req.body?.confirmation || ""), String((req as any).user?.id || "unknown-admin")) }); } catch (error) { return fail(res, error); } },
};
