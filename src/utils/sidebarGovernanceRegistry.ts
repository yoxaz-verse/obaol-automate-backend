import { canonicalizeCompanyFunctionTaxonomySlug } from "./companyCapabilities";

export const SIDEBAR_PLACEMENTS = ["SEEKING", "PROVIDING", "BOTH", "OTHER_SERVICES"] as const;
export const SIDEBAR_STATUSES = ["LIVE", "COMING_SOON", "HIDDEN"] as const;

export type SidebarPlacement = typeof SIDEBAR_PLACEMENTS[number];
export type SidebarPageStatus = typeof SIDEBAR_STATUSES[number];

export const COMMON_ASSOCIATE_SIDEBAR_ROUTES = [
  ["dashboard", "/dashboard", "Dashboard", "TOP"],
  ["guidance", "/dashboard/guidance", "Guidance", "BOTTOM"],
  ["settings", "/dashboard/settings", "Settings", "BOTTOM"],
  ["customer-support", "/dashboard/customer-support", "Customer Support", "BOTTOM"],
] as const;

export const COMMON_ASSOCIATE_ROUTE_PATHS = new Set(COMMON_ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => path));

export const ASSOCIATE_SIDEBAR_ROUTES = [
  ["bidding", "/dashboard/bidding", "Bidding"],
  ["trade-listings", "/dashboard/marketplace", "Trade Listings"],
  ["my-trade-listings", "/dashboard/product", "My Trade Listings"],
  ["commodity-directory", "/dashboard/catalog", "Commodity Directory"],
  ["enquiries", "/dashboard/enquiries", "Enquiries"],
  ["sample-requests", "/dashboard/sample-requests", "Sample Requests"],
  ["orders", "/dashboard/orders", "Internal Orders"],
  ["documents", "/dashboard/documents", "Documents"],
  ["commercial-documents", "/dashboard/commercial-documents", "Pure Documents"],
  ["import-opportunities", "/dashboard/imports", "Import Opportunities"],
  ["my-import-listings", "/dashboard/imports/my-listings", "My Import Listings"],
  ["my-import-reservations", "/dashboard/imports/reservations", "My Reservations"],
  ["external-orders", "/dashboard/external-orders", "External Orders"],
  ["execution", "/dashboard/execution-enquiries", "Execution Panel"],
  ["warehouse-directory", "/dashboard/warehouse-rent", "Warehouse Directory"],
  ["quality-labs", "/dashboard/quality-labs", "Quality Labs"],
  ["my-lab", "/dashboard/quality-labs/my", "My Lab"],
  ["lab-execution", "/dashboard/quality-labs/execution", "Lab Execution"],
  ["inventory", "/dashboard/inventory", "Inventory"],
  ["my-warehouses", "/dashboard/warehouses", "My Warehouses"],
  ["warehouse-operations", "/dashboard/warehouses/operations", "Warehouse Operations"],
  ["company", "/dashboard/company", "My Company"],
  ["referrals", "/dashboard/referrals", "Referrals & Earnings"],
] as const;

export const SIDEBAR_ROUTE_PATHS = new Set(ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => path));
export const SIDEBAR_RESOLVED_SECTIONS = ["SEEKING", "PROVIDING", "OTHER_SERVICES"] as const;
export type SidebarResolvedSection = typeof SIDEBAR_RESOLVED_SECTIONS[number];

export const createDefaultSidebarSectionOrder = () => Object.fromEntries(
  SIDEBAR_RESOLVED_SECTIONS.map((section) => [section, ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => path)]),
) as Record<SidebarResolvedSection, string[]>;

export const deriveSidebarSectionOrder = (mappings: Array<{ routePath: string; placement: string; order: number }>) => {
  const defaults = createDefaultSidebarSectionOrder();
  return Object.fromEntries(SIDEBAR_RESOLVED_SECTIONS.map((section) => {
    const relevant = mappings.filter((row) => row.placement === section || (row.placement === "BOTH" && section !== "OTHER_SERVICES"));
    const minimum = new Map<string, number>();
    relevant.forEach((row) => minimum.set(row.routePath, Math.min(minimum.get(row.routePath) ?? Number.MAX_SAFE_INTEGER, row.order)));
    return [section, [...defaults[section]].sort((a, b) => (minimum.get(a) ?? Number.MAX_SAFE_INTEGER) - (minimum.get(b) ?? Number.MAX_SAFE_INTEGER) || defaults[section].indexOf(a) - defaults[section].indexOf(b))];
  })) as Record<SidebarResolvedSection, string[]>;
};

type GovernanceMapping = {
  functionSlug: string;
  routePath: string;
  placement: SidebarPlacement | string;
  status: SidebarPageStatus | string;
  order: number;
};

const STATUS_WEIGHT: Record<string, number> = { HIDDEN: 0, COMING_SOON: 1, LIVE: 2 };
const mergePlacement = (current: string, incoming: string) => {
  if (current === incoming) return current;
  if (current === "OTHER_SERVICES") return incoming;
  if (incoming === "OTHER_SERVICES") return current;
  return "BOTH";
};

export const canonicalizeGovernanceMappings = <T extends GovernanceMapping>(mappings: T[] = []) => {
  const merged = new Map<string, GovernanceMapping>();
  for (const input of mappings) {
    const row: GovernanceMapping = {
      functionSlug: canonicalizeCompanyFunctionTaxonomySlug(input.functionSlug),
      routePath: String(input.routePath || ""),
      placement: String(input.placement || "BOTH").toUpperCase(),
      status: String(input.status || "HIDDEN").toUpperCase(),
      order: Number(input.order || 0),
    };
    if (COMMON_ASSOCIATE_ROUTE_PATHS.has(row.routePath as any)) continue;
    const key = `${row.functionSlug}:${row.routePath}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, row);
      continue;
    }
    current.placement = mergePlacement(String(current.placement), String(row.placement));
    if ((STATUS_WEIGHT[row.status] || 0) > (STATUS_WEIGHT[current.status] || 0)) current.status = row.status;
    current.order = Math.min(current.order, row.order);
  }
  return Array.from(merged.values()).sort((a, b) => a.functionSlug.localeCompare(b.functionSlug) || a.order - b.order || a.routePath.localeCompare(b.routePath));
};

const LIVE_BY_FUNCTION: Record<string, string[]> = {
  buyer: ["/dashboard/bidding", "/dashboard/marketplace", "/dashboard/catalog", "/dashboard/enquiries", "/dashboard/sample-requests", "/dashboard/orders"],
  seller: ["/dashboard/bidding", "/dashboard/product", "/dashboard/marketplace", "/dashboard/inventory", "/dashboard/enquiries", "/dashboard/orders"],
  sourcing: ["/dashboard/marketplace", "/dashboard/enquiries", "/dashboard/orders"],
  packaging: ["/dashboard/execution-enquiries", "/dashboard/orders", "/dashboard/documents"],
  testing: ["/dashboard/quality-labs", "/dashboard/quality-labs/my", "/dashboard/quality-labs/execution", "/dashboard/sample-requests", "/dashboard/documents"],
  "warehouse-storage": ["/dashboard/warehouses", "/dashboard/warehouses/operations", "/dashboard/inventory", "/dashboard/warehouse-rent"],
  "finance-risk": ["/dashboard/orders", "/dashboard/commercial-documents"],
  "importing-to-india": ["/dashboard/imports", "/dashboard/imports/my-listings", "/dashboard/imports/reservations", "/dashboard/orders", "/dashboard/documents", "/dashboard/execution-enquiries"],
  "exporting-from-india": ["/dashboard/product", "/dashboard/orders", "/dashboard/documents", "/dashboard/execution-enquiries"],
  "freight-forwarding": ["/dashboard/execution-enquiries", "/dashboard/orders", "/dashboard/documents"],
  "inland-logistics": ["/dashboard/execution-enquiries", "/dashboard/orders", "/dashboard/warehouses"],
};

const ALWAYS_LIVE = ["/dashboard/company"];
const SEEKING_ROUTES = new Set(["/dashboard/quality-labs", "/dashboard/imports", "/dashboard/imports/reservations", "/dashboard/warehouse-rent"]);
const PROVIDING_ROUTES = new Set(["/dashboard/quality-labs/my", "/dashboard/quality-labs/execution", "/dashboard/imports/my-listings", "/dashboard/warehouses", "/dashboard/warehouses/operations"]);

export const createBaselineSidebarMappings = (functionSlugs: string[]) => functionSlugs.flatMap((functionSlug) => {
  const live = new Set([...(LIVE_BY_FUNCTION[functionSlug] || []), ...ALWAYS_LIVE]);
  return ASSOCIATE_SIDEBAR_ROUTES.map(([, routePath], order) => ({
    functionSlug,
    routePath,
    placement: (SEEKING_ROUTES.has(routePath) ? "SEEKING" : PROVIDING_ROUTES.has(routePath) ? "PROVIDING" : "BOTH") as SidebarPlacement,
    status: live.has(routePath) ? "LIVE" as SidebarPageStatus : "HIDDEN" as SidebarPageStatus,
    order,
  }));
});
