import { Model } from "mongoose";
import { Request } from "express";
import { BaseService } from "../services/base.service";
import { GenericRepository } from "../repositories/generic.repository";
import { HookDispatcher } from "../hooks/hook.dispatcher";
import { ExecutionMode } from "../types";
import { getEntityConfig } from "../registry/entities";
import { buildRegexSearchTerms } from "./searchableFields";

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

    private resolveListReadOptions(view: string, populate: any, sortOption: any) {
        let select: any = undefined;

        if (this.entityName === "associate-companies" && view === "picker") {
            select = "_id name assignedOperator";
            populate = undefined;
            if (!sortOption || Object.keys(sortOption).length === 0) {
                sortOption = { name: 1 };
            }
        }

        if (this.entityName === "variant-rates" && view === "product-table") {
            select = [
                "_id",
                "productVariant",
                "associate",
                "associateCompany",
                "warehouseId",
                "rate",
                "quantity",
                "quantityUnit",
                "commission",
                "isLive",
                "lastLiveDate",
                "updatedAt",
                "createdAt",
                "locationDisplay",
                "locationSource",
                "officeAddress",
                "coolingStartTime",
                "mediatorAssociateId",
                "sourceInventory",
              ].join(" ");
            populate = [
                {
                    path: "productVariant",
                    select: "_id name product",
                    populate: [{ path: "product", select: "_id name isNatural isOrganic isGiTagged" }],
                },
                {
                    path: "associate",
                    select: "_id associateCompany",
                },
                {
                    path: "associateCompany",
                    select: "_id name address assignedOperator",
                },
                {
                    path: "warehouseId",
                    select: "_id name address",
                },
            ];
        }

        return {
            populate,
            select,
            sortOption,
        };
    }

    public async findAll(req: Request, pagination: { page: number; limit: number }, query: any) {
        const config = getEntityConfig(this.entityName);
        // Run Pre-Read Hook (e.g. for RBAC)
        query = await HookDispatcher.runBeforeRead(this.entityName, query, req);

        // 1. Handling Search
        let searchQuery: any = {};
        if (query.search && config) {
            const searchTerms: any[] = buildRegexSearchTerms(
                this.model,
                config.searchableFields,
                query.search
            );

            // Deep search in direct relations
            if (config.relations) {
                const relSearchPromises = Object.entries(config.relations).map(async ([path, targetEntityKey]) => {
                    // Skip nested paths for search ID resolution to keep it performant/simple
                    if (path.includes('.')) return null;

                    const targetConfig = getEntityConfig(targetEntityKey);
                    if (targetConfig && targetConfig.searchableFields && targetConfig.searchableFields.length > 0) {
                        const targetSearchTerms = buildRegexSearchTerms(
                            targetConfig.model,
                            targetConfig.searchableFields,
                            query.search
                        );

                        if (targetSearchTerms.length === 0) return null;

                        const matchingDocs = await targetConfig.model.find({
                            $or: targetSearchTerms,
                            isDeleted: { $ne: true }
                        }).select('_id').lean();

                        if (matchingDocs && matchingDocs.length > 0) {
                            return { [path]: { $in: matchingDocs.map(d => d._id) } };
                        }
                    }
                    return null;
                });

                const resolvedRelTerms = await Promise.all(relSearchPromises);
                resolvedRelTerms.forEach(term => {
                    if (term) searchTerms.push(term);
                });
            }

            if (searchTerms.length > 0) {
                searchQuery = { $or: searchTerms };
            }
            delete query.search;
        }

        // 2. Handling Sort
        let sortOption: any = {};
        if (query.sort && config) {
            const [field, order] = (query.sort as string).split(':');
            if (config.sortableFields.includes(field)) {
                const direction = order === 'desc' ? -1 : 1;
                // Marketplace requirement: nearest lastLiveDate first, null/missing last, tie-break by createdAt desc.
                if (this.entityName === "variant-rates" && field === "lastLiveDate" && direction === 1) {
                    sortOption = {
                        __strategy: "lastLiveDateAscNullsLast",
                        field: "lastLiveDate",
                        tieBreaker: { createdAt: -1 },
                    };
                } else {
                    sortOption = { [field]: direction };
                }
            }
            delete query.sort;
        }

        // 3. Handling Filters
        delete query.page;
        delete query.limit;
        delete query._ts;
        delete query.assignmentStatus;
        delete query.liveProductStatus;
        const requestedView = String(query.view || "").trim();
        delete query.view;

        // Cast boolean strings to actual booleans and handle arrays with $in
        Object.keys(query).forEach(key => {
            if (query[key] === "true") {
                query[key] = true;
            } else if (query[key] === "false") {
                query[key] = false;
            } else if (Array.isArray(query[key]) && !key.startsWith('$')) {
                query[key] = { $in: query[key] };
            }
        });

        const filterQuery = { ...query, ...searchQuery };

        if (process.env.NODE_ENV !== "production") {
            console.debug(`[CrudEngine] findAll [${this.entityName}]`, {
                incomingFilters: {
                    assignmentStatus: (req as any)?.query?.assignmentStatus,
                    liveProductStatus: (req as any)?.query?.liveProductStatus,
                    _ts: (req as any)?.query?._ts,
                    page: (req as any)?.query?.page,
                    limit: (req as any)?.query?.limit,
                    search: (req as any)?.query?.search,
                },
                finalFilterQuery: filterQuery,
            });
        }

        // 4. Handling Population / Projection
        let populate = config?.relations ? this.buildPopulateArray(config.relations) : undefined;
        let select;
        ({ populate, select, sortOption } = this.resolveListReadOptions(requestedView, populate, sortOption));

        const result = await this.repository.findAll(filterQuery, pagination, sortOption, populate, select);
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
