import { Model } from "mongoose";
import { Request } from "express";
import { BaseService } from "../services/base.service";
import { GenericRepository } from "../repositories/generic.repository";
import { HookDispatcher } from "../hooks/hook.dispatcher";
import { ExecutionMode } from "../types";
import { getEntityConfig } from "../registry/entities";

export class CrudEngine extends BaseService {
    private repository: GenericRepository<any>;
    private model: Model<any>;
    private entityName: string;

    constructor(model: Model<any>, entityName: string) {
        super();
        this.model = model;
        this.entityName = entityName;
        this.repository = new GenericRepository(model);
    }

    private buildPopulateArray(relations: Record<string, string>): any[] {
        const populatePaths: Record<string, any> = {};

        // Sort keys by length so we process parents before children if possible
        const keys = Object.keys(relations).sort((a, b) => a.split('.').length - b.split('.').length);

        for (const path of keys) {
            const parts = path.split('.');
            let current = populatePaths;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = { path: part, populate: {} };
                }

                if (i === parts.length - 1) {
                    // It's the leaf node of this specific path entry
                    // (though it might have children added later)
                } else {
                    current = current[part].populate;
                }
            }
        }

        // Recursively convert the nested structure back to Mongoose's array format
        const convertToMongooseFormat = (obj: Record<string, any>): any[] => {
            return Object.values(obj).map(item => {
                const result: any = { path: item.path };
                const children = convertToMongooseFormat(item.populate);
                if (children.length > 0) {
                    result.populate = children;
                }
                return result;
            });
        };

        return convertToMongooseFormat(populatePaths);
    }

    public async findAll(req: Request, pagination: { page: number; limit: number }, query: any) {
        const config = getEntityConfig(this.entityName);

        // Run Pre-Read Hook (e.g. for RBAC)
        query = await HookDispatcher.runBeforeRead(this.entityName, query, req);

        // 1. Handling Search
        let searchQuery = {};
        if (query.search && config) {
            const searchTerms = config.searchableFields.map(field => ({
                [field]: { $regex: query.search, $options: 'i' }
            }));
            if (searchTerms.length > 0) {
                searchQuery = { $or: searchTerms };
            }
            delete query.search;
        }

        // 2. Handling Sort
        let sortOption = {};
        if (query.sort && config) {
            const [field, order] = (query.sort as string).split(':');
            if (config.sortableFields.includes(field)) {
                sortOption = { [field]: order === 'desc' ? -1 : 1 };
            }
            delete query.sort;
        }

        // 3. Handling Filters
        delete query.page;
        delete query.limit;

        // Cast boolean strings to actual booleans
        Object.keys(query).forEach(key => {
            if (query[key] === "true") query[key] = true;
            if (query[key] === "false") query[key] = false;
        });

        const filterQuery = { ...query, ...searchQuery };
        console.log(`[CrudEngine] findAll [${this.entityName}] Final Filter Query:`, JSON.stringify(filterQuery));

        // 4. Handling Population
        const populate = config?.relations ? this.buildPopulateArray(config.relations) : undefined;

        const result = await this.repository.findAll(filterQuery, pagination, sortOption, populate);
        result.data = await HookDispatcher.resolveAfterRead(this.entityName, result.data);
        return result;
    }

    public async findOne(req: Request, query: any) {
        const config = getEntityConfig(this.entityName);
        // Run Pre-Read Hook
        query = await HookDispatcher.runBeforeRead(this.entityName, query, req);

        const populate = config?.relations ? this.buildPopulateArray(config.relations) : undefined;
        let doc = await this.repository.findOne(query, populate);
        if (doc) {
            [doc] = await HookDispatcher.resolveAfterRead(this.entityName, [doc]);
        }
        return doc;
    }

    public async create(req: Request, data: any) {
        const transformedData = await HookDispatcher.runBeforeWrite(
            this.entityName,
            data,
            ExecutionMode.CREATE,
            undefined,
            req
        );
        const created = await this.repository.create(transformedData);

        await HookDispatcher.runAfterWrite(
            this.entityName,
            created,
            ExecutionMode.CREATE,
            req
        );

        return created;
    }

    public async update(req: Request, id: string, data: any) {
        const transformedData = await HookDispatcher.runBeforeWrite(
            this.entityName,
            data,
            ExecutionMode.UPDATE,
            id,
            req
        );

        const updated = await this.repository.update(id, transformedData);

        if (updated) {
            await HookDispatcher.runAfterWrite(
                this.entityName,
                updated,
                ExecutionMode.UPDATE,
                req
            );
        }
        return updated;
    }

    public async delete(req: Request, id: string) {
        await HookDispatcher.runBeforeWrite(this.entityName, {}, ExecutionMode.DELETE, id, req);

        const deleted = await this.repository.delete(id);

        if (deleted) {
            await HookDispatcher.runAfterWrite(
                this.entityName,
                deleted,
                ExecutionMode.DELETE,
                req
            );
        }
        return deleted;
    }
}
