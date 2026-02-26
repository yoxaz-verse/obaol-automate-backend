import { HookDispatcher } from "./hook.dispatcher";
import { employeeFilterHook } from "./employeeAccessHooks";
import { associateFilterHook } from "./associateAccessHooks";
import { companyStatsHook } from "./companyStatsHooks";
import { categoryFilterHook } from "./categoryHooks";
import { orderFilterHook } from "./orderAccessHooks";

export const registerAllHooks = () => {
    // RBAC Hooks for Employees (Overseers)
    HookDispatcher.registerPreRead("associate-companies", employeeFilterHook);

    // Composite hook for variant-rates: Category Filter -> Employee Filter -> Associate Filter
    HookDispatcher.registerPreRead("variant-rates", async (query, mode, id, req) => {
        let q = await categoryFilterHook(query, mode, id, req);
        q = await employeeFilterHook(q, mode, id, req);
        return await associateFilterHook(q, mode, id, req);
    });

    HookDispatcher.registerPreRead("enquiries", employeeFilterHook);
    HookDispatcher.registerPreRead("associates", employeeFilterHook);
    HookDispatcher.registerPreRead("orders", orderFilterHook);

    // RBAC Hooks for Associates
    HookDispatcher.registerPreRead("catalog-items", associateFilterHook);
    HookDispatcher.registerPreRead("displayed-rates", associateFilterHook);

    // Dynamic Statistics Hooks
    HookDispatcher.registerPostRead("associate-companies", companyStatsHook);
};
