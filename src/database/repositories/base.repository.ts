import { Model, Document, FilterQuery, UpdateQuery } from "mongoose";
import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

export abstract class BaseRepository<T extends Document, CreateDTO = any, UpdateDTO = any> {
    protected model: Model<T>;
    protected context: string;

    constructor(model: Model<T>, context: string) {
        this.model = model;
        this.context = context;
    }

    public async findAll(
        req: Request,
        pagination: IPagination,
        query: FilterQuery<T> = {}
    ): Promise<{
        data: any[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
    }> {
        try {
            const docs = await this.model.find({ ...query, isDeleted: false } as FilterQuery<T>)
                .limit(pagination.limit)
                .skip((pagination.page - 1) * pagination.limit);

            const totalCount = await this.model.countDocuments({ ...query, isDeleted: false } as FilterQuery<T>);
            const totalPages = Math.ceil(totalCount / pagination.limit);

            return {
                data: docs.map((doc) => doc.toObject()),
                totalCount,
                currentPage: pagination.page,
                totalPages,
            };
        } catch (error) {
            await logError(error, req, `${this.context}-findAll`);
            throw error;
        }
    }

    public async findOne(req: Request, query: FilterQuery<T>): Promise<any | null> {
        try {
            const doc = await this.model.findOne({ ...query, isDeleted: false } as FilterQuery<T>);
            return doc ? doc.toObject() : null;
        } catch (error) {
            await logError(error, req, `${this.context}-findOne`);
            throw error;
        }
    }

    public async findById(req: Request, id: string): Promise<any | null> {
        try {
            const doc = await this.model.findOne({ _id: id, isDeleted: false } as FilterQuery<T>);
            return doc ? doc.toObject() : null;
        } catch (error) {
            await logError(error, req, `${this.context}-findById`);
            throw error;
        }
    }

    public async create(req: Request, data: CreateDTO): Promise<any> {
        try {
            const created = await this.model.create(data);
            return created.toObject();
        } catch (error) {
            await logError(error, req, `${this.context}-create`);
            throw error;
        }
    }

    public async update(req: Request, id: string, data: UpdateQuery<T>): Promise<any | null> {
        try {
            const updated = await this.model.findOneAndUpdate(
                { _id: id, isDeleted: false } as FilterQuery<T>,
                data,
                { new: true }
            );
            return updated ? updated.toObject() : null;
        } catch (error) {
            await logError(error, req, `${this.context}-update`);
            throw error;
        }
    }

    public async delete(req: Request, id: string): Promise<any | null> {
        try {
            const deleted = await this.model.findOneAndUpdate(
                { _id: id, isDeleted: false } as FilterQuery<T>,
                { isDeleted: true },
                { new: true }
            );
            return deleted ? deleted.toObject() : null;
        } catch (error) {
            await logError(error, req, `${this.context}-delete`);
            throw error;
        }
    }
}
