import { ExecutionMode, HookFunction, ReadResolver } from "../types";

export class HookDispatcher {
    private static preWriteHooks: Map<string, HookFunction> = new Map();
    private static preReadHooks: Map<string, HookFunction> = new Map(); // Added
    private static postReadHooks: Map<string, ReadResolver> = new Map();

    public static registerPreRead(entity: string, hook: HookFunction) {
        this.preReadHooks.set(entity, hook);
    }

    public static async runBeforeRead(
        entity: string,
        query: any,
        req?: any
    ): Promise<any> {
        const hook = this.preReadHooks.get(entity);
        if (hook) {
            return await hook(query, "read" as any, undefined, req);
        }
        return query;
    }

    public static registerPreWrite(entity: string, hook: HookFunction) {
        this.preWriteHooks.set(entity, hook);
    }

    public static registerPostRead(entity: string, resolver: ReadResolver) {
        this.postReadHooks.set(entity, resolver);
    }

    public static async runBeforeWrite(
        entity: string,
        payload: any,
        mode: ExecutionMode,
        id?: string,
        req?: any
    ): Promise<any> {
        const hook = this.preWriteHooks.get(entity);
        if (hook) {
            return await hook(payload, mode, id, req);
        }
        return payload;
    }

    public static async resolveAfterRead(
        entity: string,
        rows: any[]
    ): Promise<any[]> {
        const resolver = this.postReadHooks.get(entity);
        if (resolver) {
            return await resolver(rows);
        }
        return rows;
    }

    private static postWriteHooks: Map<string, Function> = new Map();

    public static registerPostWrite(entity: string, hook: Function) {
        this.postWriteHooks.set(entity, hook);
    }

    public static async runAfterWrite(
        entity: string,
        result: any,
        mode: ExecutionMode,
        req?: any
    ): Promise<void> {
        const hook = this.postWriteHooks.get(entity);
        if (hook) {
            await hook(result, mode, req);
        }
    }
}
