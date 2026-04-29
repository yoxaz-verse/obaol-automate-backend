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
  req: any
): Promise<any> => {
  if (req?.params?.entity !== "associate-companies") return query;

  const nextQuery = { ...(query || {}) };
  const assignmentStatus = String(nextQuery.assignmentStatus || "all").toLowerCase();
  const liveProductStatus = String(nextQuery.liveProductStatus || "all").toLowerCase();

  delete nextQuery.assignmentStatus;
  delete nextQuery.liveProductStatus;

  let filteredQuery: any = nextQuery;

  if (assignmentStatus === "assigned") {
    filteredQuery = addAndCondition(filteredQuery, {
      assignedOperator: { $exists: true, $nin: [null, ""] },
    });
  } else if (assignmentStatus === "unassigned") {
    filteredQuery = addAndCondition(filteredQuery, {
      $or: [{ assignedOperator: null }, { assignedOperator: { $exists: false } }],
    });
  }

  if (liveProductStatus === "live" || liveProductStatus === "not_live") {
    const liveCompanyIds = await VariantRateModel.distinct("associateCompany", { isLive: true });
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

  return filteredQuery;
};

