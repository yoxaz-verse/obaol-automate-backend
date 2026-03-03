import { HookDispatcher } from "./hook.dispatcher";
import { employeeFilterHook } from "./employeeAccessHooks";
import { associateFilterHook } from "./associateAccessHooks";
import { companyStatsHook } from "./companyStatsHooks";
import { categoryFilterHook } from "./categoryHooks";
import { orderFilterHook } from "./orderAccessHooks";
import { associateReadNormalizationHook } from "./associateReadNormalizationHook";
import {
    companyFunctionMasterWriteHook,
    companySubFunctionMasterWriteHook,
    companyFunctionMappingWriteHook,
} from "./companyFunctionHooks";
import { companyFunctionReadHook } from "./companyFunctionReadHook";
import { variantRateLivePreWriteHook, variantRateNotificationPostWriteHook } from "./notificationHooks";

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
    HookDispatcher.registerPostRead("associates", associateReadNormalizationHook);

    // RBAC Hooks for Associates
    HookDispatcher.registerPreRead("catalog-items", async (query, mode, id, req) => {
        let q = await categoryFilterHook(query, mode, id, req);
        return await associateFilterHook(q, mode, id, req);
    });
    HookDispatcher.registerPreRead("displayed-rates", async (query, mode, id, req) => {
        let q = await categoryFilterHook(query, mode, id, req);
        q = await employeeFilterHook(q, mode, id, req);
        return await associateFilterHook(q, mode, id, req);
    });

    // Dynamic Statistics Hooks
    HookDispatcher.registerPostRead("associate-companies", companyStatsHook);

    // Notifications for variant live events
    HookDispatcher.registerPreWrite("variant-rates", variantRateLivePreWriteHook);
    HookDispatcher.registerPostWrite("variant-rates", variantRateNotificationPostWriteHook);

    // Company capability masters are admin managed and soft-deactivation only.
    HookDispatcher.registerPreWrite("company-functions", companyFunctionMasterWriteHook);
    HookDispatcher.registerPreWrite("company-sub-functions", companySubFunctionMasterWriteHook);
    HookDispatcher.registerPreWrite("company-function-mappings", companyFunctionMappingWriteHook);
    HookDispatcher.registerPostRead("company-functions", companyFunctionReadHook);
};
