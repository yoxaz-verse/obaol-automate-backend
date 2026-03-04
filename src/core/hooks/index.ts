import { HookDispatcher } from "./hook.dispatcher";
import { employeeFilterHook } from "./employeeAccessHooks";
import { associateFilterHook } from "./associateAccessHooks";
import { companyStatsHook } from "./companyStatsHooks";
import { categoryFilterHook } from "./categoryHooks";
import { orderFilterHook } from "./orderAccessHooks";
import { associateReadNormalizationHook } from "./associateReadNormalizationHook";
import { employeeReadNormalizationHook } from "./employeeReadNormalizationHook";
import {
    companyFunctionMasterWriteHook,
    companySubFunctionMasterWriteHook,
    companyFunctionMappingWriteHook,
} from "./companyFunctionHooks";
import { companyFunctionReadHook } from "./companyFunctionReadHook";
import { variantRateLivePreWriteHook, variantRateNotificationPostWriteHook } from "./notificationHooks";
import { variantRateOwnershipPreWriteHook } from "./variantRateOwnershipHooks";
import { employeeAssociateCreatePreWriteHook, employeeCompanyCreatePreWriteHook } from "./employeeOnboardingHooks";
import { employeeVariantRateWritePreHook } from "./employeeVariantRateWriteHook";

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
    HookDispatcher.registerPostRead("employees", employeeReadNormalizationHook);

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

    // Variant-rate guards + notifications (single dispatcher slot, so compose hooks in order)
    HookDispatcher.registerPreWrite("variant-rates", async (payload, mode, id, req) => {
        let nextPayload = await variantRateOwnershipPreWriteHook(payload, mode, id, req);
        nextPayload = await employeeVariantRateWritePreHook(nextPayload, mode, id, req);
        nextPayload = await variantRateLivePreWriteHook(nextPayload, mode, id, req);
        return nextPayload;
    });
    HookDispatcher.registerPostWrite("variant-rates", variantRateNotificationPostWriteHook);

    // Company capability masters are admin managed and soft-deactivation only.
    HookDispatcher.registerPreWrite("company-functions", companyFunctionMasterWriteHook);
    HookDispatcher.registerPreWrite("company-sub-functions", companySubFunctionMasterWriteHook);
    HookDispatcher.registerPreWrite("company-function-mappings", companyFunctionMappingWriteHook);
    HookDispatcher.registerPreWrite("associates", employeeAssociateCreatePreWriteHook);
    HookDispatcher.registerPreWrite("associate-companies", employeeCompanyCreatePreWriteHook);
    HookDispatcher.registerPostRead("company-functions", companyFunctionReadHook);
};
