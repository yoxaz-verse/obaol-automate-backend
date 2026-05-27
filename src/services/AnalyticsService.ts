import { InquiryModel as EnquiryModel } from "../database/models/enquiry";
import { VariantRateModel } from "../database/models/variantRate";
import { AssociateModel } from "../database/models/associate";
import { DisplayedRateModel } from "../database/models/displayedRate";
import { CatalogItemModel } from "../database/models/catalogItem";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { OrderModel } from "../database/models/order";
import mongoose from "mongoose";
import { ttlCache } from "../utils/ttlCache";

export class AnalyticsService {
    private static readonly CACHE_TTL = {
        systemMetrics: 30_000,
        dashboardSummary: 15_000,
        globalCompanyFunctionComponents: 30_000,
    } as const;
    private static COMPANY_FUNCTION_TYPE_MAP: Record<string, string[]> = {
        "sourcing": ["PROCUREMENT"],
        "packaging": ["PACKAGING"],
        "testing": ["QUALITY_TESTING", "CERTIFICATION"],
        "warehouse-storage": ["WAREHOUSE"],
        "freight-forwarding": ["SHIPPING"],
        "importing-distribution": ["SHIPPING", "TRANSPORTATION"],
        "inland-logistics": ["TRANSPORTATION"],
        "finance-risk": [],
    };

    /**
     * Get enquiry trends for the last 30 days
     */
    static async getEnquiryTrends() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const trends = await EnquiryModel.aggregate([
            {
                $match: { createdAt: { $gte: thirtyDaysAgo } }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return trends;
    }

    /**
     * Get top performing products based on enquiry volume
     */
    static async getTopProducts(limit = 5) {
        const topProducts = await EnquiryModel.aggregate([
            {
                $group: {
                    _id: "$productVariant",
                    enquiryCount: { $sum: 1 }
                }
            },
            { $sort: { enquiryCount: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: "product-variants", // Ensure this collection name matches MongoDB
                    localField: "_id",
                    foreignField: "_id",
                    as: "variantDetails"
                }
            },
            { $unwind: "$variantDetails" },
            {
                $project: {
                    name: "$variantDetails.name", // Adjust field based on ProductVariant schema
                    enquiryCount: 1
                }
            }
        ]);

        return topProducts;
    }

    /**
     * Get overall system health metrics
     */
    static async getSystemMetrics() {
        return ttlCache.getOrSet("analytics:system-metrics", AnalyticsService.CACHE_TTL.systemMetrics, async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const [
                enquiryMetrics,
                variantMetrics,
                totalAssociates,
                unassignedCompanies,
            ] = await Promise.all([
                EnquiryModel.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalEnquiries: { $sum: 1 },
                            newEnquiriesToday: {
                                $sum: {
                                    $cond: [{ $gte: ["$createdAt", yesterday] }, 1, 0],
                                },
                            },
                        },
                    },
                ]),
                VariantRateModel.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalLiveRates: {
                                $sum: { $cond: [{ $eq: ["$isLive", true] }, 1, 0] },
                            },
                            liveCompanyIds: {
                                $addToSet: {
                                    $cond: [{ $eq: ["$isLive", true] }, "$associateCompany", null],
                                },
                            },
                        },
                    },
                ]),
                AssociateModel.countDocuments(),
                AssociateCompanyModel.countDocuments({
                    isDeleted: { $ne: true },
                    $or: [
                        { assignedOperator: null },
                        { assignedOperator: { $exists: false } },
                    ],
                }),
            ]);

            const enquiryRow = enquiryMetrics[0] || {};
            const variantRow = variantMetrics[0] || {};
            const liveCompanyIds = Array.isArray((variantRow as any).liveCompanyIds)
                ? (variantRow as any).liveCompanyIds
                : [];
            const companiesWithLiveProducts = liveCompanyIds.filter((id: any) => Boolean(id)).length;

            return {
                totalEnquiries: Number((enquiryRow as any).totalEnquiries || 0),
                newEnquiriesToday: Number((enquiryRow as any).newEnquiriesToday || 0),
                totalLiveRates: Number((variantRow as any).totalLiveRates || 0),
                totalAssociates,
                unassignedCompanies,
                companiesWithLiveProducts,
            };
        });
    }

    static async getDashboardSummary({
        userId,
        role,
    }: {
        userId: string;
        role: string;
    }) {
        const roleLower = String(role || "").toLowerCase();
        const cacheKey = `analytics:dashboard-summary:${roleLower}:${userId}`;
        return ttlCache.getOrSet(cacheKey, AnalyticsService.CACHE_TTL.dashboardSummary, async () => {
        const objectId = userId ? new mongoose.Types.ObjectId(userId) : null;
        const isAdmin = roleLower === "admin";
        const isAssociate = roleLower === "associate";
        const isOperatorUser = roleLower === "operator" || roleLower === "team";

        const enquiryBaseFilter: Record<string, any> = {};
        const orderBaseFilter: Record<string, any> = {};
        if (objectId && isAssociate) {
            enquiryBaseFilter.$or = [
                { buyerAssociateId: objectId },
                { sellerAssociateId: objectId },
                { mediatorAssociateId: objectId },
            ];
            orderBaseFilter.$or = [
                { buyerAssociateId: objectId },
                { sellerAssociateId: objectId },
                { mediatorAssociateId: objectId },
            ];
        } else if (objectId && isOperatorUser) {
            enquiryBaseFilter.$or = [
                { supplierOperatorId: objectId },
                { dealCloserOperatorId: objectId },
                { createdBy: objectId },
            ];
            orderBaseFilter.$or = [
                { supplierOperatorId: objectId },
                { dealCloserOperatorId: objectId },
                { createdBy: objectId },
            ];
        }

        const inquiryClosedStatuses = ["COMPLETED", "CLOSED", "CANCELLED", "CONVERTED"];
        const orderClosedStatuses = ["COMPLETED", "CANCELLED"];

        const [
            totalEnquiries,
            pendingEnquiries,
            convertedEnquiries,
            totalOrders,
            activeOrders,
            completedOrders,
            recentEnquiries,
            recentOrders,
            associateBuyingCount,
            associateSellingCount,
            associateActionRequired,
            adminActionRequired,
        ] = await Promise.all([
            EnquiryModel.countDocuments(enquiryBaseFilter),
            EnquiryModel.countDocuments({
                ...enquiryBaseFilter,
                status: { $nin: inquiryClosedStatuses },
            }),
            EnquiryModel.countDocuments({
                ...enquiryBaseFilter,
                status: "CONVERTED",
            }),
            OrderModel.countDocuments(orderBaseFilter),
            OrderModel.countDocuments({
                ...orderBaseFilter,
                status: { $nin: orderClosedStatuses },
            }),
            OrderModel.countDocuments({
                ...orderBaseFilter,
                status: "COMPLETED",
            }),
            EnquiryModel.find(enquiryBaseFilter)
                .sort({ updatedAt: -1, createdAt: -1 })
                .limit(4)
                .select("_id status updatedAt createdAt")
                .lean(),
            OrderModel.find(orderBaseFilter)
                .sort({ updatedAt: -1, createdAt: -1 })
                .limit(4)
                .select("_id status updatedAt createdAt")
                .lean(),
            objectId && isAssociate
                ? EnquiryModel.countDocuments({
                    ...enquiryBaseFilter,
                    buyerAssociateId: objectId,
                })
                : Promise.resolve(0),
            objectId && isAssociate
                ? EnquiryModel.countDocuments({
                    ...enquiryBaseFilter,
                    sellerAssociateId: objectId,
                })
                : Promise.resolve(0),
            objectId && isAssociate
                ? EnquiryModel.countDocuments({
                    ...enquiryBaseFilter,
                    $or: [
                        { sellerAssociateId: objectId, sellerAcceptedAt: null },
                        {
                            buyerAssociateId: objectId,
                            sellerAcceptedAt: { $ne: null },
                            buyerConfirmedAt: null,
                        },
                    ],
                })
                : Promise.resolve(0),
            isAdmin
                ? EnquiryModel.countDocuments({
                    ...enquiryBaseFilter,
                    $or: [
                        { sellerAcceptedAt: null },
                        { buyerConfirmedAt: null },
                        { status: { $ne: "CONVERTED" } },
                    ],
                })
                : Promise.resolve(0),
        ]);

        const recentActivity = [
            ...(recentEnquiries || []).map((row: any) => ({
                type: "Enquiry",
                id: row?._id,
                status: row?.status || "Pending",
                at: row?.updatedAt || row?.createdAt,
            })),
            ...(recentOrders || []).map((row: any) => ({
                type: "Order",
                id: row?._id,
                status: row?.status || "Procuring",
                at: row?.updatedAt || row?.createdAt,
            })),
        ]
            .filter((item) => item.id && item.at)
            .sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime())
            .slice(0, 6);

            return {
                totalEnquiries,
                pendingEnquiries,
                convertedEnquiries,
                totalOrders,
                activeOrders,
                completedOrders,
                orderCompletionPct: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
                associateBuyingCount,
                associateSellingCount,
                associateActionRequired,
                adminActionRequired,
                recentActivity,
            };
        });
    }

    /**
     * Get specific metrics for an associate
     */
    static async getAssociateMetrics(associateId: string) {
        const id = new mongoose.Types.ObjectId(associateId);

        const [
            listedProducts,
            liveProducts,
            totalInquiries,
            associate,
            myProductsCount,
            obaolCatalogCount
        ] = await Promise.all([
            VariantRateModel.countDocuments({ associate: id }),
            VariantRateModel.countDocuments({ associate: id, isLive: true }),
            EnquiryModel.countDocuments({
                $or: [
                    { buyerAssociateId: id },
                    { sellerAssociateId: id },
                    { mediatorAssociateId: id }
                ]
            }),
            AssociateModel.findById(id).populate("associateCompany"),
            DisplayedRateModel.countDocuments({ associate: id }),
            CatalogItemModel.countDocuments({ associateId: id })
        ]);

        return {
            listedProducts,
            liveProducts,
            totalInquiries,
            myItemsCount: myProductsCount,
            obaolCatalogCount,
            companyName: (associate?.associateCompany as any)?.name || "No Company Linked",
            associateName: associate?.name
        };
    }

    /**
     * Get scoped metrics for an operator based on assigned associate companies.
     */
    static async getOperatorMetrics(operatorId: string) {
        const id = new mongoose.Types.ObjectId(operatorId);
        const companyRows = await AssociateCompanyModel.find({
            assignedOperator: id,
            isDeleted: { $ne: true },
        }).select("_id").lean();

        const companyIds = companyRows.map((row: any) => row._id);
        const companyCount = companyIds.length;

        const inquiryFilter = {
            $or: [{ supplierOperatorId: id }, { dealCloserOperatorId: id }, { createdBy: id }]
        };
        const incompleteStatuses = ["COMPLETED", "CLOSED", "CANCELLED", "CONVERTED"];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const [
            totalAssignedEnquiries,
            pendingAssignedEnquiries,
            newAssignedEnquiriesToday,
            totalAssignedRates,
            liveAssignedRates,
            distinctProductVariants,
            distinctLiveProductVariants,
            assignedLiveCompanyIds,
        ] = await Promise.all([
            EnquiryModel.countDocuments(inquiryFilter),
            EnquiryModel.countDocuments({
                ...inquiryFilter,
                status: { $nin: incompleteStatuses },
            }),
            EnquiryModel.countDocuments({
                ...inquiryFilter,
                createdAt: { $gte: yesterday },
            }),
            companyCount
                ? VariantRateModel.countDocuments({ associateCompany: { $in: companyIds } })
                : Promise.resolve(0),
            companyCount
                ? VariantRateModel.countDocuments({ associateCompany: { $in: companyIds }, isLive: true })
                : Promise.resolve(0),
            companyCount
                ? VariantRateModel.distinct("productVariant", { associateCompany: { $in: companyIds } }).then((arr) => arr.length)
                : Promise.resolve(0),
            companyCount
                ? VariantRateModel.distinct("productVariant", { associateCompany: { $in: companyIds }, isLive: true }).then((arr) => arr.length)
                : Promise.resolve(0),
            companyCount
                ? VariantRateModel.distinct("associateCompany", { associateCompany: { $in: companyIds }, isLive: true })
                : Promise.resolve([]),
        ]);

        const liveRatePercentage = totalAssignedRates > 0
            ? Math.round((liveAssignedRates / totalAssignedRates) * 100)
            : 0;
        const liveProductPercentage = distinctProductVariants > 0
            ? Math.round((distinctLiveProductVariants / distinctProductVariants) * 100)
            : 0;

        const assignedCompaniesWithLiveProducts = Array.isArray(assignedLiveCompanyIds)
            ? assignedLiveCompanyIds.filter((id: any) => Boolean(id)).length
            : 0;

        return {
            assignedCompanies: companyCount,
            totalAssignedEnquiries,
            pendingAssignedEnquiries,
            newAssignedEnquiriesToday,
            totalAssignedRates,
            liveAssignedRates,
            totalAssignedProducts: distinctProductVariants,
            liveAssignedProducts: distinctLiveProductVariants,
            assignedCompaniesWithLiveProducts,
            liveRatePercentage,
            liveProductPercentage,
        };
    }

    static async getCompanyFunctionMetrics(companyId: string) {
        const companyObjectId = new mongoose.Types.ObjectId(companyId);
        const functions = await CompanyFunctionModel.find({ isActive: true })
            .select("_id slug name orderIndex")
            .lean();

        const associates = await AssociateModel.find({
            associateCompany: companyObjectId,
            isDeleted: { $ne: true },
        })
            .select("_id")
            .lean();
        const associateIds = associates.map((row: any) => row._id);

        const emptyMetrics = {
            total: 0,
            open: 0,
            inProgress: 0,
            completed: 0,
        };

        if (!associateIds.length) {
            return functions.map((fn: any) => ({
                functionId: fn._id,
                slug: fn.slug,
                name: fn.name,
                orderIndex: fn.orderIndex ?? 0,
                metrics: { ...emptyMetrics },
            }));
        }

        const counts = await EnquiryModel.aggregate([
            {
                $match: {
                    $or: [
                        { buyerAssociateId: { $in: associateIds } },
                        { sellerAssociateId: { $in: associateIds } },
                        { mediatorAssociateId: { $in: associateIds } },
                    ],
                },
            },
            { $unwind: "$executionInquiries" },
            {
                $group: {
                    _id: {
                        type: "$executionInquiries.type",
                        status: "$executionInquiries.status",
                    },
                    count: { $sum: 1 },
                },
            },
        ]);

        const byType = new Map<string, Record<string, number>>();
        counts.forEach((row: any) => {
            const type = String(row?._id?.type || "");
            const status = String(row?._id?.status || "");
            if (!type || !status) return;
            if (!byType.has(type)) {
                byType.set(type, { OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0 });
            }
            const current = byType.get(type)!;
            current[status] = (current[status] || 0) + Number(row?.count || 0);
        });

        return functions.map((fn: any) => {
            const slug = String(fn?.slug || "");
            const mappedTypes = AnalyticsService.COMPANY_FUNCTION_TYPE_MAP[slug] || [];
            const totals = { ...emptyMetrics };
            mappedTypes.forEach((type) => {
                const counters = byType.get(type);
                if (!counters) return;
                totals.open += Number(counters.OPEN || 0);
                totals.inProgress += Number(counters.IN_PROGRESS || 0);
                totals.completed += Number(counters.COMPLETED || 0);
            });
            totals.total = totals.open + totals.inProgress + totals.completed;

            return {
                functionId: fn._id,
                slug,
                name: fn.name,
                orderIndex: fn.orderIndex ?? 0,
                metrics: totals,
            };
        });
    }

    static async getCompanyFunctionComponents(companyId: string) {
        const companyObjectId = new mongoose.Types.ObjectId(companyId);
        const functions = await CompanyFunctionModel.find({ isActive: true })
            .select("_id slug name orderIndex")
            .lean();

        const associates = await AssociateModel.find({
            associateCompany: companyObjectId,
            isDeleted: { $ne: true },
        })
            .select("_id")
            .lean();
        const associateIds = associates.map((row: any) => row._id);

        const emptyMetrics = {
            total: 0,
            open: 0,
            inProgress: 0,
            completed: 0,
        };

        const allMappedTypes = Array.from(
            new Set(Object.values(AnalyticsService.COMPANY_FUNCTION_TYPE_MAP).flat())
        );

        const counts = associateIds.length
            ? await EnquiryModel.aggregate([
                {
                    $match: {
                        $or: [
                            { buyerAssociateId: { $in: associateIds } },
                            { sellerAssociateId: { $in: associateIds } },
                            { mediatorAssociateId: { $in: associateIds } },
                        ],
                    },
                },
                { $unwind: "$executionInquiries" },
                {
                    $group: {
                        _id: {
                            type: "$executionInquiries.type",
                            status: "$executionInquiries.status",
                        },
                        count: { $sum: 1 },
                    },
                },
            ])
            : [];

        const byType = new Map<string, Record<string, number>>();
        counts.forEach((row: any) => {
            const type = String(row?._id?.type || "");
            const status = String(row?._id?.status || "");
            if (!type || !status) return;
            if (!byType.has(type)) {
                byType.set(type, { OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0 });
            }
            const current = byType.get(type)!;
            current[status] = (current[status] || 0) + Number(row?.count || 0);
        });

        const recentExecution = associateIds.length && allMappedTypes.length
            ? await EnquiryModel.aggregate([
                {
                    $match: {
                        $or: [
                            { buyerAssociateId: { $in: associateIds } },
                            { sellerAssociateId: { $in: associateIds } },
                            { mediatorAssociateId: { $in: associateIds } },
                        ],
                    },
                },
                { $unwind: "$executionInquiries" },
                {
                    $match: {
                        "executionInquiries.type": { $in: allMappedTypes },
                    },
                },
                {
                    $addFields: {
                        executionSortDate: {
                            $ifNull: ["$executionInquiries.createdAt", "$createdAt"],
                        },
                    },
                },
                { $sort: { executionSortDate: -1 } },
                { $limit: 200 },
                {
                    $project: {
                        enquiryId: "$_id",
                        type: "$executionInquiries.type",
                        status: "$executionInquiries.status",
                        title: "$executionInquiries.title",
                        createdAt: "$executionSortDate",
                    },
                },
            ])
            : [];

        const orders = await OrderModel.find({ associateCompanyId: companyObjectId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("_id status createdAt externalProduct")
            .lean();

        return functions.map((fn: any) => {
            const slug = String(fn?.slug || "");
            const mappedTypes = AnalyticsService.COMPANY_FUNCTION_TYPE_MAP[slug] || [];
            const totals = { ...emptyMetrics };
            mappedTypes.forEach((type) => {
                const counters = byType.get(type);
                if (!counters) return;
                totals.open += Number(counters.OPEN || 0);
                totals.inProgress += Number(counters.IN_PROGRESS || 0);
                totals.completed += Number(counters.COMPLETED || 0);
            });
            totals.total = totals.open + totals.inProgress + totals.completed;

            const recentExecutionInquiries = mappedTypes.length
                ? recentExecution
                    .filter((item: any) => mappedTypes.includes(String(item?.type || "")))
                    .slice(0, 5)
                : [];

            const recentOrders = orders.map((order: any) => ({
                orderId: order?._id,
                status: order?.status || "",
                createdAt: order?.createdAt,
                productName: order?.externalProduct?.name || "",
            }));

            return {
                functionId: fn._id,
                slug,
                name: fn.name,
                orderIndex: fn.orderIndex ?? 0,
                metrics: totals,
                recentExecutionInquiries,
                recentOrders,
            };
        });
    }

    static async getGlobalCompanyFunctionComponents() {
        return ttlCache.getOrSet(
            "analytics:global-company-function-components",
            AnalyticsService.CACHE_TTL.globalCompanyFunctionComponents,
            async () => {
                const functions = await CompanyFunctionModel.find({ isActive: true })
            .select("_id slug name orderIndex")
            .lean();

        const emptyMetrics = {
            total: 0,
            open: 0,
            inProgress: 0,
            completed: 0,
        };

        const allMappedTypes = Array.from(
            new Set(Object.values(AnalyticsService.COMPANY_FUNCTION_TYPE_MAP).flat())
        );

        const counts = await EnquiryModel.aggregate([
            { $unwind: "$executionInquiries" },
            {
                $group: {
                    _id: {
                        type: "$executionInquiries.type",
                        status: "$executionInquiries.status",
                    },
                    count: { $sum: 1 },
                },
            },
        ]);

        const byType = new Map<string, Record<string, number>>();
        counts.forEach((row: any) => {
            const type = String(row?._id?.type || "");
            const status = String(row?._id?.status || "");
            if (!type || !status) return;
            if (!byType.has(type)) {
                byType.set(type, { OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0 });
            }
            const current = byType.get(type)!;
            current[status] = (current[status] || 0) + Number(row?.count || 0);
        });

        const recentExecution = allMappedTypes.length
            ? await EnquiryModel.aggregate([
                { $unwind: "$executionInquiries" },
                {
                    $match: {
                        "executionInquiries.type": { $in: allMappedTypes },
                    },
                },
                {
                    $addFields: {
                        executionSortDate: {
                            $ifNull: ["$executionInquiries.createdAt", "$createdAt"],
                        },
                    },
                },
                { $sort: { executionSortDate: -1 } },
                { $limit: 200 },
                {
                    $project: {
                        enquiryId: "$_id",
                        type: "$executionInquiries.type",
                        status: "$executionInquiries.status",
                        title: "$executionInquiries.title",
                        createdAt: "$executionSortDate",
                    },
                },
            ])
            : [];

        const orders = await OrderModel.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .select("_id status createdAt externalProduct")
            .lean();

                return functions.map((fn: any) => {
                    const slug = String(fn?.slug || "");
                    const mappedTypes = AnalyticsService.COMPANY_FUNCTION_TYPE_MAP[slug] || [];
                    const totals = { ...emptyMetrics };
                    mappedTypes.forEach((type) => {
                        const counters = byType.get(type);
                        if (!counters) return;
                        totals.open += Number(counters.OPEN || 0);
                        totals.inProgress += Number(counters.IN_PROGRESS || 0);
                        totals.completed += Number(counters.COMPLETED || 0);
                    });
                    totals.total = totals.open + totals.inProgress + totals.completed;

                    const recentExecutionInquiries = mappedTypes.length
                        ? recentExecution
                            .filter((item: any) => mappedTypes.includes(String(item?.type || "")))
                            .slice(0, 5)
                        : [];

                    const recentOrders = orders.map((order: any) => ({
                        orderId: order?._id,
                        status: order?.status || "",
                        createdAt: order?.createdAt,
                        productName: order?.externalProduct?.name || "",
                    }));

                    const placeholderRecommended = totals.total === 0
                        && recentExecutionInquiries.length === 0
                        && recentOrders.length === 0;

                    return {
                        functionId: fn._id,
                        slug,
                        name: fn.name,
                        orderIndex: fn.orderIndex ?? 0,
                        metrics: totals,
                        recentExecutionInquiries,
                        recentOrders,
                        placeholderRecommended,
                    };
                });
            }
        );
    }
}
