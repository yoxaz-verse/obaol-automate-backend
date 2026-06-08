import { VariantRateModel } from "../../database/models/variantRate";

const addAndCondition = (baseQuery: any, condition: any) => {
  if (!condition) return baseQuery;
  if (!baseQuery || !Object.keys(baseQuery).length) {
    return { $and: [condition] };
  }
  const existingAnd = Array.isArray(baseQuery?.$and) ? baseQuery.$and : [];
  return { ...baseQuery, $and: [...existingAnd, condition] };
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
  const assignedOperatorIsValidCondition = {
    $or: [
      {
        $expr: {
          $eq: [{ $type: "$assignedOperator" }, "objectId"],
        },
      },
      {
        $expr: {
          $and: [
            { $eq: [{ $type: "$assignedOperator" }, "string"] },
            { $regexMatch: { input: "$assignedOperator", regex: /^[a-fA-F0-9]{24}$/ } },
          ],
        },
      },
    ],
  };

  if (assignmentStatus === "assigned") {
    filteredQuery = addAndCondition(filteredQuery, assignedOperatorIsValidCondition);
  } else if (assignmentStatus === "unassigned") {
    filteredQuery = addAndCondition(filteredQuery, {
      $expr: {
        $not: [
          {
            $or: [
              { $eq: [{ $type: "$assignedOperator" }, "objectId"] },
              {
                $and: [
                  { $eq: [{ $type: "$assignedOperator" }, "string"] },
                  { $regexMatch: { input: "$assignedOperator", regex: /^[a-fA-F0-9]{24}$/ } },
                ],
              },
            ],
          },
        ],
      },
    });
  }

  if (liveProductStatus === "live" || liveProductStatus === "not_live") {
    const liveCompanyRows = await VariantRateModel.aggregate([
      {
        $match: {
          isLive: true,
          isDeleted: { $ne: true },
          associateCompany: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$associateCompany",
        },
      },
    ]);
    const sanitizedLiveCompanyIds = Array.isArray(liveCompanyRows)
      ? liveCompanyRows
          .map((row: any) => row?._id)
          .filter((candidate: any) => Boolean(candidate))
      : [];

    if (liveProductStatus === "live") {
      filteredQuery = addAndCondition(filteredQuery, {
        _id: { $in: sanitizedLiveCompanyIds },
      });
    } else {
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
