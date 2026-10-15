import { Model } from "mongoose";
import { listingFreshnessCutoff } from "./variantRateFreshnessService";

type Pagination = { page: number; limit: number };

const castFilter = (model: Model<any>, filter: Record<string, any>) => {
  const query: any = model.find(filter);
  query.cast(model);
  return query.getFilter();
};

/**
 * Product management screens show the current record for a seller/product
 * variant, not every historical rate row.  Grouping happens before the live
 * filter so an older live row can never reappear behind a newer offline row.
 */
export const findLatestVariantRatesForProductTable = async (
  model: Model<any>,
  filter: Record<string, any>,
  pagination: Pagination,
  populate?: any,
  select?: string,
  now = new Date(),
) => {
  const requestedLive = filter.isLive;
  const groupingFilter = { ...filter };
  delete groupingFilter.isLive;

  const cutoff = listingFreshnessCutoff(now);
  const page = Math.max(1, Number(pagination.page || 1));
  const limit = Math.max(1, Number(pagination.limit || 10));
  const postGroupMatch =
    requestedLive === true
      ? { __effectiveIsLive: true }
      : requestedLive === false || requestedLive?.$ne === true
        ? { __effectiveIsLive: false }
        : null;

  const pipeline: any[] = [
    { $match: castFilter(model, { ...groupingFilter, isDeleted: { $ne: true } }) },
    {
      $addFields: {
        __effectiveLastLive: {
          $ifNull: ["$lastLiveDate", { $ifNull: ["$updatedAt", "$createdAt"] }],
        },
      },
    },
    {
      $addFields: {
        __effectiveIsLive: {
          $and: [
            { $eq: ["$isLive", true] },
            { $gt: ["$__effectiveLastLive", cutoff] },
          ],
        },
      },
    },
    { $sort: { __effectiveLastLive: -1, updatedAt: -1, createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: {
          owner: { $ifNull: ["$associateCompany", "$associate"] },
          productVariant: "$productVariant",
        },
        row: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$row" } },
    ...(postGroupMatch ? [{ $match: postGroupMatch }] : []),
    { $sort: { __effectiveLastLive: -1, createdAt: -1, _id: -1 } },
    ...(select
      ? [{
          $project: {
            ...Object.fromEntries(select.split(/\s+/).filter(Boolean).map((field) => [field, 1])),
            __effectiveLastLive: 1,
            __effectiveIsLive: 1,
          },
        }]
      : []),
    {
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        meta: [{ $count: "totalCount" }],
      },
    },
  ];

  const [result] = await model.aggregate(pipeline);
  const rows = result?.data || [];
  const data = populate ? await model.populate(rows, populate) : rows;
  const totalCount = Number(result?.meta?.[0]?.totalCount || 0);

  return {
    data,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
  };
};
