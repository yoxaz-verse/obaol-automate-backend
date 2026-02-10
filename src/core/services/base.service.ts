import { IServiceResponse } from "../types";

/**
 * BaseService
 * -----------
 * Standardized business logic layer. 
 * Completely decoupled from Express (req/res).
 */
export abstract class BaseService {
    protected success<T>(data: T, message?: string): IServiceResponse<T> {
        return { success: true, data, message };
    }

    protected error(message: string, error?: any): IServiceResponse {
        return { success: false, message, error };
    }
}
