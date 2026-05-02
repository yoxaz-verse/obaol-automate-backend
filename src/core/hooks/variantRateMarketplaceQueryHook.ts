type GenericQuery = Record<string, any>;

const isTruthyString = (value: any) => String(value || "").toLowerCase() === "true";
const isFalsyString = (value: any) => String(value || "").toLowerCase() === "false";

const shouldLog = () => process.env.MARKETPLACE_QUERY_DEBUG === "1";
const toFiniteNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};
const addAndCondition = (baseQuery: GenericQuery, condition: GenericQuery): GenericQuery => {
  if (!condition || !Object.keys(condition).length) return baseQuery;
  if (!baseQuery || !Object.keys(baseQuery).length) return condition;
  if (Array.isArray(baseQuery.$and)) {
    return { ...baseQuery, $and: [...baseQuery.$and, condition] };
  }
  return { $and: [baseQuery, condition] };
};

export const variantRateMarketplaceQueryHook = async (
  query: GenericQuery,
  _mode: string,
  _id: string | undefined,
  req: any
): Promise<GenericQuery> => {
  let nextQuery: GenericQuery = { ...(query || {}) };

  // Normalize transport-only view from either request query or accumulated hook query.
  const reqView = String(req?.query?.view || "").toLowerCase();
  const queryView = String(nextQuery.view || "").toLowerCase();
  const isMarketplace = reqView === "marketplace" || queryView === "marketplace";
  if (req) {
    req.__marketplaceView = isMarketplace;
  }

  delete nextQuery.view;

  if (isMarketplace) {
    const rawIsLive = nextQuery.isLive ?? req?.query?.isLive;
    const isOffline = rawIsLive === false || isFalsyString(rawIsLive);
    const isLive = rawIsLive === true || isTruthyString(rawIsLive);

    if (isOffline) {
      // Offline marketplace includes false + null/missing legacy values.
      nextQuery.isLive = { $ne: true };
    } else if (isLive) {
      nextQuery.isLive = true;
    }
    if (req) {
      req.__marketplaceIsLive = nextQuery.isLive;
    }

    const minRate = toFiniteNumber(nextQuery.minRate ?? req?.query?.minRate);
    const maxRate = toFiniteNumber(nextQuery.maxRate ?? req?.query?.maxRate);
    const minQty = toFiniteNumber(nextQuery.minQty ?? req?.query?.minQty);
    const maxQty = toFiniteNumber(nextQuery.maxQty ?? req?.query?.maxQty);
    const rawLocation = String(nextQuery.location ?? req?.query?.location ?? "").trim();

    delete nextQuery.minRate;
    delete nextQuery.maxRate;
    delete nextQuery.minQty;
    delete nextQuery.maxQty;
    delete nextQuery.location;

    if (minRate !== null || maxRate !== null) {
      const rateQuery: GenericQuery = {};
      if (minRate !== null) rateQuery.$gte = minRate;
      if (maxRate !== null) rateQuery.$lte = maxRate;
      nextQuery.rate = {
        ...(typeof nextQuery.rate === "object" && nextQuery.rate ? nextQuery.rate : {}),
        ...rateQuery,
      };
    }

    if (minQty !== null || maxQty !== null) {
      const quantityQuery: GenericQuery = {};
      if (minQty !== null) quantityQuery.$gte = minQty;
      if (maxQty !== null) quantityQuery.$lte = maxQty;
      nextQuery.quantity = {
        ...(typeof nextQuery.quantity === "object" && nextQuery.quantity ? nextQuery.quantity : {}),
        ...quantityQuery,
      };
    }

    if (rawLocation) {
      const escaped = rawLocation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const locationRegex = new RegExp(escaped, "i");
      nextQuery = addAndCondition(nextQuery, {
        $or: [
          { officeAddress: locationRegex },
          { locationDisplay: locationRegex },
          { locationSource: locationRegex },
        ],
      });
    }
  }

  if (shouldLog() && isMarketplace) {
    console.log(
      "[MarketplaceQueryHook] normalized",
      JSON.stringify({
        role: String(req?.user?.role || "").toLowerCase(),
        entity: req?.params?.entity,
        requestView: reqView || undefined,
        normalizedIsLive: nextQuery.isLive,
        queryKeys: Object.keys(nextQuery || {}),
      })
    );
  }

  return nextQuery;
};
