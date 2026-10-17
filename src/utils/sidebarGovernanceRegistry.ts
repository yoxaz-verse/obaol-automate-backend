export const SIDEBAR_PLACEMENTS = ["SEEKING", "PROVIDING", "BOTH"] as const;
export const SIDEBAR_STATUSES = ["LIVE", "COMING_SOON", "HIDDEN"] as const;

export type SidebarPlacement = typeof SIDEBAR_PLACEMENTS[number];
export type SidebarPageStatus = typeof SIDEBAR_STATUSES[number];

export const ASSOCIATE_SIDEBAR_ROUTES = [
  ["dashboard", "/dashboard", "Dashboard"],
  ["trade-listings", "/dashboard/marketplace", "Trade Listings"],
  ["my-trade-listings", "/dashboard/product", "My Trade Listings"],
  ["commodity-directory", "/dashboard/catalog", "Commodity Directory"],
  ["enquiries", "/dashboard/enquiries", "Enquiries"],
  ["sample-requests", "/dashboard/sample-requests", "Sample Requests"],
  ["orders", "/dashboard/orders", "Internal Orders"],
  ["documents", "/dashboard/documents", "Documents"],
  ["commercial-documents", "/dashboard/commercial-documents", "Pure Documents"],
  ["imports", "/dashboard/imports", "Imports"],
  ["external-orders", "/dashboard/external-orders", "External Orders"],
  ["execution", "/dashboard/execution-enquiries", "Execution Panel"],
  ["warehouse-booking", "/dashboard/warehouse-rent", "Warehouse Booking"],
  ["quality-labs", "/dashboard/quality-labs", "Quality Labs"],
  ["inventory", "/dashboard/inventory", "Inventory"],
  ["warehouses", "/dashboard/warehouses", "Warehouses"],
  ["company", "/dashboard/company", "My Company"],
  ["referrals", "/dashboard/referrals", "Referrals & Earnings"],
  ["guidance", "/dashboard/guidance", "Guidance"],
  ["settings", "/dashboard/settings", "Settings"],
  ["customer-support", "/dashboard/customer-support", "Customer Support"],
] as const;

export const SIDEBAR_ROUTE_PATHS = new Set(ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => path));

const LIVE_BY_FUNCTION: Record<string, string[]> = {
  buyer: ["/dashboard/marketplace", "/dashboard/catalog", "/dashboard/enquiries", "/dashboard/sample-requests", "/dashboard/orders"],
  seller: ["/dashboard/product", "/dashboard/marketplace", "/dashboard/inventory", "/dashboard/enquiries", "/dashboard/orders"],
  sourcing: ["/dashboard/marketplace", "/dashboard/enquiries", "/dashboard/orders"],
  packaging: ["/dashboard/execution-enquiries", "/dashboard/orders", "/dashboard/documents"],
  testing: ["/dashboard/quality-labs", "/dashboard/sample-requests", "/dashboard/documents"],
  "warehouse-storage": ["/dashboard/warehouses", "/dashboard/inventory", "/dashboard/warehouse-rent"],
  "finance-risk": ["/dashboard/orders", "/dashboard/commercial-documents"],
  "importing-to-india": ["/dashboard/imports", "/dashboard/orders", "/dashboard/documents", "/dashboard/execution-enquiries"],
  "exporting-from-india": ["/dashboard/product", "/dashboard/orders", "/dashboard/documents", "/dashboard/execution-enquiries"],
  "freight-forwarding": ["/dashboard/execution-enquiries", "/dashboard/orders", "/dashboard/documents"],
  "inland-logistics": ["/dashboard/execution-enquiries", "/dashboard/orders", "/dashboard/warehouses"],
};

const ALWAYS_LIVE = ["/dashboard", "/dashboard/company", "/dashboard/guidance", "/dashboard/settings", "/dashboard/customer-support"];

export const createBaselineSidebarMappings = (functionSlugs: string[]) => functionSlugs.flatMap((functionSlug) => {
  const live = new Set([...(LIVE_BY_FUNCTION[functionSlug] || []), ...ALWAYS_LIVE]);
  return ASSOCIATE_SIDEBAR_ROUTES.map(([, routePath], order) => ({
    functionSlug,
    routePath,
    placement: "BOTH" as SidebarPlacement,
    status: live.has(routePath) ? "LIVE" as SidebarPageStatus : "HIDDEN" as SidebarPageStatus,
    order,
  }));
});
