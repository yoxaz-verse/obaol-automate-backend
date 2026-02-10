export enum ExecutionMode {
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete"
}

export interface IServiceResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: any;
}

export type HookFunction<T = any> = (
    payload: T,
    mode: ExecutionMode,
    id?: string,
    req?: any
) => Promise<T>;

export type ReadResolver<T = any> = (rows: T[]) => Promise<T[]>;
