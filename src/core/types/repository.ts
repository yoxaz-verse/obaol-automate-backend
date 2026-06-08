import { IPagination } from "../../interfaces/pagination";

export interface IRepository<T, CreateDTO = any, UpdateDTO = any> {
    findAll(
        query: any,
        pagination: IPagination,
        sort?: any,
        populate?: any,
        select?: any
    ): Promise<{
        data: T[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
    }>;
    findOne(query: any, populate?: any): Promise<T | null>;
    findById(id: string, populate?: any): Promise<T | null>;
    create(data: CreateDTO): Promise<T>;
    update(id: string, data: UpdateDTO): Promise<T | null>;
    delete(id: string): Promise<T | null>;
}
