import { HookDispatcher } from "./hook.dispatcher";
import { operatorFilterHook } from "./operatorAccessHooks";
import { associateFilterHook } from "./associateAccessHooks";
import { companyStatsHook } from "./companyStatsHooks";
import { categoryFilterHook } from "./categoryHooks";
import { orderFilterHook } from "./orderAccessHooks";
import { associateReadNormalizationHook } from "./associateReadNormalizationHook";
import { operatorReadNormalizationHook } from "./operatorReadNormalizationHook";
import {
    companyFunctionMasterWriteHook,
    companySubFunctionMasterWriteHook,
    companyFunctionMappingWriteHook,
} from "./companyFunctionHooks";
import { companyFunctionReadHook } from "./companyFunctionReadHook";
import { variantRateLivePreWriteHook, variantRateNotificationPostWriteHook } from "./notificationHooks";
import { variantRateOwnershipPreWriteHook } from "./variantRateOwnershipHooks";
import { operatorAssociateCreatePreWriteHook, operatorCompanyCreatePreWriteHook } from "./operatorOnboardingHooks";
import { operatorVariantRateWritePreHook } from "./operatorVariantRateWriteHook";
import { orderCommissionPreWriteHook } from "./orderCommissionPreWriteHook";
import { orderCommissionPostWriteHook } from "./orderCommissionPostWriteHook";
import { operatorMentorValidationHook } from "./operatorMentorValidationHook";
import { organizationReportPreReadHook, organizationReportPreWriteHook } from "./organizationReportHooks";
import { variantRateMarketplaceQueryHook } from "./variantRateMarketplaceQueryHook";
import { inventoryVariantRateSyncHook } from "./inventoryVariantRateSyncHook";
import { inventoryWarehouseSelectionHook } from "./inventoryWarehouseSelectionHook";
import { variantRateInventoryLinkHook } from "./variantRateInventoryLinkHook";
import { inventoryReservationPreReadHook, inventoryReservationPreWriteHook } from "./inventoryReservationHooks";
import { orderInventoryReservationHook } from "./orderInventoryReservationHook";
import { enquiryInventoryReservationHook } from "./enquiryInventoryReservationHook";

export const registerAllHooks = () => {
    // RBAC Hooks for Operators (Overseers)
    HookDispatcher.registerPreRead("associate-companies", operatorFilterHook);

    // Composite hook for variant-rates:
    // Marketplace normalization -> Category Filter -> Operator Filter -> Associate Filter
    HookDispatcher.registerPreRead("variant-rates", async (query, mode, id, req) => {
        let q = await variantRateMarketplaceQueryHook(query, mode, id, req);
        q = await categoryFilterHook(q, mode, id, req);
        q = await operatorFilterHook(q, mode, id, req);
        return await associateFilterHook(q, mode, id, req);
    });

    HookDispatcher.registerPreRead("enquiries", operatorFilterHook);
    HookDispatcher.registerPostWrite("enquiries", enquiryInventoryReservationHook);
    HookDispatcher.registerPreRead("associates", async (query, mode, id, req) => {
        let q = await operatorFilterHook(query, mode, id, req);
        return await associateFilterHook(q, mode, id, req);
    });
    HookDispatcher.registerPreRead("orders", orderFilterHook);
    HookDispatcher.registerPostRead("associates", associateReadNormalizationHook);
    HookDispatcher.registerPostRead("operators", operatorReadNormalizationHook);

    // RBAC Hooks for Associates
    HookDispatcher.registerPreRead("catalog-items", async (query, mode, id, req) => {
        let q = await categoryFilterHook(query, mode, id, req);
        return await associateFilterHook(q, mode, id, req);
    });
    HookDispatcher.registerPreRead("displayed-rates", async (query, mode, id, req) => {
        let q = await categoryFilterHook(query, mode, id, req);
        q = await operatorFilterHook(q, mode, id, req);
        return await associateFilterHook(q, mode, id, req);
    });

    // Dynamic Statistics Hooks
    HookDispatcher.registerPostRead("associate-companies", companyStatsHook);

    // Variant-rate guards + notifications (single dispatcher slot, so compose hooks in order)
    HookDispatcher.registerPreWrite("variant-rates", async (payload, mode, id, req) => {
        let nextPayload = await variantRateOwnershipPreWriteHook(payload, mode, id, req);
        nextPayload = await operatorVariantRateWritePreHook(nextPayload, mode, id, req);
        nextPayload = await variantRateLivePreWriteHook(nextPayload, mode, id, req);
        return nextPayload;
    });
    HookDispatcher.registerPostWrite("variant-rates", async (payload: any, mode: any, id: any, req: any) => {
        await variantRateNotificationPostWriteHook(payload, mode, id, req);
        return await variantRateInventoryLinkHook(payload, mode, id, req);
    });

    // Company capability masters are admin managed and soft-deactivation only.
    HookDispatcher.registerPreWrite("company-functions", companyFunctionMasterWriteHook);
    HookDispatcher.registerPreWrite("company-sub-functions", companySubFunctionMasterWriteHook);
    HookDispatcher.registerPreWrite("company-function-mappings", companyFunctionMappingWriteHook);
    HookDispatcher.registerPreWrite("associates", operatorAssociateCreatePreWriteHook);
    HookDispatcher.registerPreWrite("associate-companies", operatorCompanyCreatePreWriteHook);
    HookDispatcher.registerPreWrite("operators", operatorMentorValidationHook);
    HookDispatcher.registerPreWrite("orders", orderCommissionPreWriteHook);
    HookDispatcher.registerPreRead("organization-reports", organizationReportPreReadHook);
    HookDispatcher.registerPreWrite("organization-reports", organizationReportPreWriteHook);
    HookDispatcher.registerPostWrite("orders", async (entityName: any, result: any, mode: any) => {
        await orderCommissionPostWriteHook(entityName, result, mode);
        await orderInventoryReservationHook(entityName, result, mode);
    });
    HookDispatcher.registerPostRead("company-functions", companyFunctionReadHook);
    HookDispatcher.registerPreWrite("inventories", inventoryWarehouseSelectionHook);
    HookDispatcher.registerPostWrite("inventories", inventoryVariantRateSyncHook);
    HookDispatcher.registerPreRead("inventory-reservations", inventoryReservationPreReadHook);
    HookDispatcher.registerPreWrite("inventory-reservations", inventoryReservationPreWriteHook);
};
