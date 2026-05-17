import { VariantRateModel } from "../../database/models/variantRate";

const addAndCondition = (baseQuery: any, condition: any) => {
  if (!condition) return baseQuery;
  if (!baseQuery || !Object.keys(baseQuery).length) return condition;
  if (Array.isArray(baseQuery?.$and)) {
    return { ...baseQuery, $and: [...baseQuery.$and, condition] };
  }
  return { $and: [baseQuery, condition] };
};

export const associateCompanyDirectoryFiltersHook = async (
  query: any,
  _mode: string,
  _id: string | undefined,
  _req: any
): Promise<any> => {
  const nextQuery = { ...(query || {}) };
  const assignmentStatusRaw = String(nextQuery.assignmentStatus || "all").trim().toLowerCase();
  const liveProductStatusRaw = String(nextQuery.liveProductStatus || "all").trim().toLowerCase();
  const assignmentStatus =
    assignmentStatusRaw === "assigned" || assignmentStatusRaw === "unassigned"
      ? assignmentStatusRaw
      : "all";
  const liveProductStatus =
    liveProductStatusRaw === "live" || liveProductStatusRaw === "not_live"
      ? liveProductStatusRaw
      : "all";

  delete nextQuery.assignmentStatus;
  delete nextQuery.liveProductStatus;

  let filteredQuery: any = nextQuery;

  if (assignmentStatus === "assigned") {
    filteredQuery = addAndCondition(filteredQuery, {
      $or: [
        { assignedOperator: { $type: "objectId" } },
        { assignedOperator: { $regex: /^[a-fA-F0-9]{24}$/ } },
      ],
    });
  } else if (assignmentStatus === "unassigned") {
    filteredQuery = addAndCondition(filteredQuery, {
      $or: [
        { assignedOperator: null },
        { assignedOperator: { $exists: false } },
        { assignedOperator: "" },
        { assignedOperator: { $not: /^[a-fA-F0-9]{24}$/ } },
        {
          $expr: {
            $and: [
              { $ne: [{ $type: "$assignedOperator" }, "objectId"] },
              { $ne: [{ $type: "$assignedOperator" }, "string"] },
            ],
          },
        },
      ],
    });
  }

  if (liveProductStatus === "live" || liveProductStatus === "not_live") {
    const liveCompanyIds = await VariantRateModel.distinct("associateCompany", {
      isLive: true,
      associateCompany: { $exists: true, $ne: null },
    });
    const sanitizedLiveCompanyIds = Array.isArray(liveCompanyIds)
      ? liveCompanyIds.filter((candidate: any) => Boolean(candidate))
      : [];

    if (liveProductStatus === "live") {
      filteredQuery = addAndCondition(filteredQuery, {
        _id: { $in: sanitizedLiveCompanyIds },
      });
    } else if (sanitizedLiveCompanyIds.length > 0) {
      filteredQuery = addAndCondition(filteredQuery, {
        _id: { $nin: sanitizedLiveCompanyIds },
      });
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[associate-companies] directory filters", {
      assignmentStatus,
      liveProductStatus,
      incomingQuery: nextQuery,
      finalQuery: filteredQuery,
    });
  }

  return filteredQuery;
};
