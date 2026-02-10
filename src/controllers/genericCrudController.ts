import { Request, Response } from "express";
import { getModelForEntity } from "../core/registry/entities";
import { CrudEngine } from "../core/engine/crud.engine";
import { logError } from "../utils/errorLogger";

export class GenericCrudController {

    public async handleRequest(req: Request, res: Response) {
        try {
            const { entity } = req.params;
            const model = getModelForEntity(entity);

            if (!model) {
                return res.status(404).json({ success: false, message: `Entity '${entity}' not found.` });
            }

            const engine = new CrudEngine(model, entity);
            const method = req.method;

            let result;
            switch (method) {
                case "GET":
                    if (req.params.id) {
                        result = await engine.findOne(req, { _id: req.params.id });
                        if (!result) return res.status(404).json({ success: false, message: "Not found" });
                    } else {
                        const page = parseInt(req.query.page as string) || 1;
                        const limit = parseInt(req.query.limit as string) || 10;
                        const { page: p, limit: l, ...query } = req.query;
                        result = await engine.findAll(req, { page, limit }, query);
                    }
                    break;

                case "POST":
                    result = await engine.create(req, req.body);
                    res.status(201);
                    break;

                case "PUT":
                case "PATCH":
                    if (!req.params.id) return res.status(400).json({ success: false, message: "ID required" });
                    result = await engine.update(req, req.params.id, req.body);
                    if (!result) return res.status(404).json({ success: false, message: "Not found" });
                    break;

                case "DELETE":
                    if (!req.params.id) return res.status(400).json({ success: false, message: "ID required" });
                    result = await engine.delete(req, req.params.id);
                    if (!result) return res.status(404).json({ success: false, message: "Not found" });
                    break;

                default:
                    return res.status(405).json({ success: false, message: "Method not allowed" });
            }

            res.json({ success: true, data: result });

        } catch (error: any) {
            logError(error, req, "GenericCrudController");
            res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
        }
    }
}
