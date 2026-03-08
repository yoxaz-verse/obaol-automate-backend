type GenericQuery = Record<string, any>;

const isTruthyString = (value: any) => String(value || "").toLowerCase() === "true";
const isFalsyString = (value: any) => String(value || "").toLowerCase() === "false";

const shouldLog = () => process.env.MARKETPLACE_QUERY_DEBUG === "1";

export const variantRateMarketplaceQueryHook = async (
  query: GenericQuery,
  _mode: string,
  _id: string | undefined,
  req: any
): Promise<GenericQuery> => {
  const nextQuery: GenericQuery = { ...(query || {}) };

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
