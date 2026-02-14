import { HookDispatcher } from "./hook.dispatcher";
import { employeeFilterHook } from "./employeeAccessHooks";
import { companyStatsHook } from "./companyStatsHooks";
import { categoryFilterHook } from "./categoryHooks";

export const registerAllHooks = () => {
    // RBAC Hooks for Employees (Overseers)
    HookDispatcher.registerPreRead("associate-companies", employeeFilterHook);

    // Composite hook for variant-rates: Category Filter -> Employee Filter
    HookDispatcher.registerPreRead("variant-rates", async (query, mode, id, req) => {
        let q = await categoryFilterHook(query, mode, id, req);
        return await employeeFilterHook(q, mode, id, req);
    });

    HookDispatcher.registerPreRead("enquiries", employeeFilterHook);
    HookDispatcher.registerPreRead("associates", employeeFilterHook);

    // Dynamic Statistics Hooks
    HookDispatcher.registerPostRead("associate-companies", companyStatsHook);
};
