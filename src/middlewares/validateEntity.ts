import { Request, Response, NextFunction } from "express";
import { EntityRegistry } from "../core/registry/entities";

export const validateEntity = (req: Request, res: Response, next: NextFunction) => {
    const entityRaw = req.params.entity;
    const entity = entityRaw ? entityRaw.toLowerCase() : "";

    if (!entity || !EntityRegistry[entity]) {
        return res.status(404).json({
            message: `Entity '${entity}' not found in registry.`,
            availableEntities: Object.keys(EntityRegistry)
        });
    }

    // Sensitive workflows with dedicated controllers must never fall through to
    // the generic CRUD engine, which does not implement their full authorization.
    if (EntityRegistry[entity].genericCrudEnabled === false) {
        return res.status(404).json({
            success: false,
            message: `Entity '${entity}' is not available through generic CRUD.`,
        });
    }

    // Optional: Validate operation if needed (e.g. read-only entities)
    // const config = EntityRegistry[entity];
    // const operation = getOperationFromMethod(req.method);
    // if (!config.allowedOperations.includes(operation)) ...

    next();
};
