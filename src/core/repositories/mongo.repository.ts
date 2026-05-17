import { Model, Document, FilterQuery, UpdateQuery } from "mongoose";
import { IRepository } from "../types/repository";
import { IPagination } from "../../interfaces/pagination";

export abstract class MongoRepository<T extends Document, CreateDTO = any, UpdateDTO = any>
    implements IRepository<any, CreateDTO, UpdateDTO> {
    protected model: Model<T>;

    constructor(model: Model<T>) {
        this.model = model;
    }

    public async findAll(
        query: FilterQuery<T> = {},
        pagination: IPagination,
        sort?: any,
        populate?: any
    ): Promise<{
        data: any[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
    }> {
        const finalQuery = { ...query, isDeleted: { $ne: true } } as FilterQuery<T>;

        const isLastLiveDateNullLastSort =
            sort?.__strategy === "lastLiveDateAscNullsLast" &&
            String(sort?.field || "") === "lastLiveDate";

        let docs: any[] = [];

        if (isLastLiveDateNullLastSort) {
            const field = String(sort.field);
            const tieBreaker = sort.tieBreaker || { createdAt: -1 };
            const pageLimit = Number(pagination.limit || 10);
            const pageSkip = Math.max(0, (Number(pagination.page || 1) - 1) * pageLimit);

            const nonNullQuery = {
                $and: [
                    finalQuery,
                    { [field]: { $ne: null, $exists: true } },
                ],
            } as FilterQuery<T>;
            const nullOrMissingQuery = {
                $and: [
                    finalQuery,
                    {
                        $or: [{ [field]: null }, { [field]: { $exists: false } }],
                    },
                ],
            } as FilterQuery<T>;

            const nonNullTotal = await this.model.countDocuments(nonNullQuery);
            const rows: any[] = [];

            const fetchRows = async (
                q: FilterQuery<T>,
                s: any,
                skip: number,
                limit: number
            ) => {
                if (limit <= 0) return [] as any[];
                let qb = this.model.find(q).sort(s).skip(skip).limit(limit).lean();
                if (populate) qb = qb.populate(populate);
                return qb;
            };

            if (pageSkip < nonNullTotal) {
                const fromNonNull = Math.min(pageLimit, nonNullTotal - pageSkip);
                const nonNullRows = await fetchRows(
                    nonNullQuery,
                    { [field]: 1, ...tieBreaker },
                    pageSkip,
                    fromNonNull
                );
                rows.push(...nonNullRows);

                const remaining = pageLimit - nonNullRows.length;
                if (remaining > 0) {
                    const nullRows = await fetchRows(
                        nullOrMissingQuery,
                        tieBreaker,
                        0,
                        remaining
                    );
                    rows.push(...nullRows);
                }
            } else {
                const nullSkip = pageSkip - nonNullTotal;
                const nullRows = await fetchRows(
                    nullOrMissingQuery,
                    tieBreaker,
                    nullSkip,
                    pageLimit
                );
                rows.push(...nullRows);
            }

            docs = rows;
        } else {
            let queryBuilder = this.model.find(finalQuery)
                .sort(sort || { createdAt: -1 })
                .limit(pagination.limit)
                .skip((pagination.page - 1) * pagination.limit)
                .lean();

            if (populate) {
                queryBuilder = queryBuilder.populate(populate);
            }

            docs = await queryBuilder;
        }

        const totalCount = await this.model.countDocuments(finalQuery);
        const totalPages = Math.ceil(totalCount / pagination.limit);

        return {
            data: docs,
            totalCount,
            currentPage: pagination.page,
            totalPages,
        };
    }

    public async findOne(query: FilterQuery<T>, populate?: any): Promise<any | null> {
        let queryBuilder = this.model.findOne({ ...query, isDeleted: { $ne: true } } as FilterQuery<T>).lean();
        if (populate) {
            queryBuilder = queryBuilder.populate(populate);
        }
        const doc = await queryBuilder;
        return doc || null;
    }

    public async findById(id: string, populate?: any): Promise<any | null> {
        let queryBuilder = this.model.findOne({ _id: id, isDeleted: { $ne: true } } as FilterQuery<T>).lean();
        if (populate) {
            queryBuilder = queryBuilder.populate(populate);
        }
        const doc = await queryBuilder;
        return doc || null;
    }

    public async create(data: CreateDTO): Promise<any> {
        const created = await this.model.create(data);
        return created.toObject();
    }

    public async update(id: string, data: UpdateDTO): Promise<any | null> {
        const updated = await this.model.findOneAndUpdate(
            { _id: id, isDeleted: { $ne: true } } as FilterQuery<T>,
            data as UpdateQuery<T>,
            { new: true }
        );
        return updated ? updated.toObject() : null;
    }

    public async delete(id: string): Promise<any | null> {
        const deleted = await this.model.findOneAndUpdate(
            { _id: id, isDeleted: { $ne: true } } as FilterQuery<T>,
            { isDeleted: true },
            { new: true }
        );
        return deleted ? deleted.toObject() : null;
    }
}
