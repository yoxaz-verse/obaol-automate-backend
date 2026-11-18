import { canonicalizeCompanyFunctionTaxonomySlug } from "./companyCapabilities";

export const SIDEBAR_PLACEMENTS = ["SEEKING", "PROVIDING", "BOTH", "OTHER_SERVICES", "UNASSIGNED"] as const;
export const SIDEBAR_STATUSES = ["LIVE", "COMING_SOON", "HIDDEN"] as const;

export const DOCUMENTATION_ROUTE = "/dashboard/documentation";
export const LEGACY_DOCUMENT_STUDIO_ROUTE = "/dashboard/commercial-documents";
export const REQUIREMENTS_ROUTE = "/dashboard/requirements";
export const LEGACY_EXTERNAL_ORDERS_ROUTE = "/dashboard/external-orders";
export const canonicalizeSidebarRoutePath = (value: unknown) => {
  const routePath = String(value || "").trim();
  if (routePath === LEGACY_DOCUMENT_STUDIO_ROUTE) return DOCUMENTATION_ROUTE;
  if (routePath === LEGACY_EXTERNAL_ORDERS_ROUTE || routePath === `${LEGACY_EXTERNAL_ORDERS_ROUTE}/new`) return REQUIREMENTS_ROUTE;
  return routePath;
};

export type SidebarPlacement = typeof SIDEBAR_PLACEMENTS[number];
export type SidebarPageStatus = typeof SIDEBAR_STATUSES[number];

export const COMMON_ASSOCIATE_SIDEBAR_ROUTES = [
  ["dashboard", "/dashboard", "Dashboard", "TOP"],
  ["notifications", "/dashboard/notifications", "Notifications", "BOTTOM"],
  ["guidance", "/dashboard/guidance", "Guidance", "BOTTOM"],
  ["settings", "/dashboard/settings", "Settings", "BOTTOM"],
  ["customer-support", "/dashboard/customer-support", "Customer Support", "BOTTOM"],
] as const;

export const COMMON_ASSOCIATE_ROUTE_PATHS = new Set(COMMON_ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => path));

export type AssociateNavigationPage = {
  pageId: string;
  path: string;
  label: string;
  parentPageId?: string;
  section: "TRADE" | "DOCUMENTATION" | "SERVICES" | "WAREHOUSE" | "ORGANIZATION";
  permissionKey: string;
  order: number;
  active: boolean;
  governanceMode: "CONFIGURABLE";
};

const associatePage = (pageId: string, path: string, label: string, section: AssociateNavigationPage["section"], order: number, parentPageId?: string): AssociateNavigationPage => ({
  pageId, path, label, section, order, parentPageId, permissionKey: `associate.navigation.${pageId}`, active: true, governanceMode: "CONFIGURABLE",
});

/** Canonical source for every configurable associate sidebar destination. */
export const ASSOCIATE_NAVIGATION_REGISTRY: AssociateNavigationPage[] = [
  associatePage("bidding", "/dashboard/bidding", "Purchase Opportunities", "TRADE", 0),
  associatePage("my-buying-requests", "/dashboard/bidding/my", "My Purchase Requests", "TRADE", 1),
  associatePage("trade-listings", "/dashboard/marketplace", "Browse Listings", "TRADE", 2),
  associatePage("my-trade-listings", "/dashboard/product", "My Listings", "TRADE", 3),
  associatePage("commodity-directory", "/dashboard/catalog", "Commodity Catalog", "TRADE", 4),
  associatePage("my-catalog-additions", "/dashboard/catalog/additions", "My Catalog Additions", "TRADE", 5, "commodity-directory"),
  associatePage("enquiries", "/dashboard/enquiries", "Enquiries", "TRADE", 6),
  associatePage("sample-requests", "/dashboard/sample-requests", "Sample Requests", "TRADE", 7),
  associatePage("orders", "/dashboard/orders", "Orders", "TRADE", 8),
  associatePage("documents", "/dashboard/documents", "Documents", "DOCUMENTATION", 9),
  associatePage("documentation", DOCUMENTATION_ROUTE, "Documentation", "DOCUMENTATION", 10),
  associatePage("gst-returns", "/dashboard/gst", "GST Returns", "DOCUMENTATION", 11),
  associatePage("import-opportunities", "/dashboard/imports", "Import Opportunities", "SERVICES", 12),
  associatePage("my-import-listings", "/dashboard/imports/my-listings", "My Import Listings", "SERVICES", 13, "import-opportunities"),
  associatePage("my-import-reservations", "/dashboard/imports/reservations", "My Import Reservations", "SERVICES", 14, "import-opportunities"),
  associatePage("requirements", REQUIREMENTS_ROUTE, "Requirements", "TRADE", 15),
  associatePage("execution", "/dashboard/execution-enquiries", "Execution Panel", "TRADE", 16),
  associatePage("service-providers", "/dashboard/services", "Service Providers", "SERVICES", 17),
  associatePage("warehouse-directory", "/dashboard/warehouse-rent", "Warehouse Directory", "WAREHOUSE", 18),
  associatePage("quality-labs", "/dashboard/quality-labs", "Quality Labs", "SERVICES", 19),
  associatePage("my-lab", "/dashboard/quality-labs/my", "My Lab", "SERVICES", 20, "quality-labs"),
  associatePage("lab-execution", "/dashboard/quality-labs/execution", "Lab Execution", "SERVICES", 21, "quality-labs"),
  associatePage("agritech-startups", "/dashboard/agritech-startups", "Agritech Startups", "SERVICES", 22),
  associatePage("my-agritech-startup", "/dashboard/agritech-startups/my", "My Agritech Startup", "SERVICES", 23, "agritech-startups"),
  associatePage("packaging-services", "/dashboard/packaging", "Packaging Services", "SERVICES", 24),
  associatePage("my-packaging", "/dashboard/packaging/my", "My Packaging", "SERVICES", 25, "packaging-services"),
  associatePage("packaging-execution", "/dashboard/packaging/execution", "Packaging Execution", "SERVICES", 26, "packaging-services"),
  associatePage("financial-partners", "/dashboard/financial-partners", "Financial Partners", "SERVICES", 27),
  associatePage("my-financial-portfolio", "/dashboard/financial-partners/my", "My Financial Portfolio", "SERVICES", 28, "financial-partners"),
  associatePage("finance-applications", "/dashboard/financial-partners/applications", "Finance Applications", "SERVICES", 29, "financial-partners"),
  associatePage("insurance-companies", "/dashboard/insurance-partners", "Insurance Companies", "SERVICES", 30),
  associatePage("my-insurance-portfolio", "/dashboard/insurance-partners/my", "My Insurance Portfolio", "SERVICES", 31, "insurance-companies"),
  associatePage("insurance-requests", "/dashboard/insurance-partners/requests", "Insurance Requests", "SERVICES", 32, "insurance-companies"),
  associatePage("freight-forwarding", "/dashboard/freight-forwarding", "Freight Forwarding", "SERVICES", 33),
  associatePage("my-freight-profile", "/dashboard/freight-forwarding/my", "My Freight Profile", "SERVICES", 34, "freight-forwarding"),
  associatePage("freight-shipments", "/dashboard/freight-forwarding/shipments", "Freight Shipments", "SERVICES", 35, "freight-forwarding"),
  associatePage("freight-customs", "/dashboard/freight-forwarding/customs", "Freight Customs", "SERVICES", 36, "freight-forwarding"),
  associatePage("freight-finance", "/dashboard/freight-forwarding/finance", "Freight Finance", "SERVICES", 37, "freight-forwarding"),
  associatePage("freight-eway-bills", "/dashboard/freight-forwarding/eway-bills", "E-Way Bills", "SERVICES", 38, "freight-forwarding"),
  associatePage("inventory", "/dashboard/inventory", "Inventory", "ORGANIZATION", 39),
  associatePage("my-warehouses", "/dashboard/warehouses", "My Warehouses", "WAREHOUSE", 40),
  associatePage("warehouse-operations", "/dashboard/warehouses/operations", "Warehouse Operations", "WAREHOUSE", 41, "my-warehouses"),
  associatePage("company", "/dashboard/company", "My Company", "ORGANIZATION", 42),
  associatePage("referrals", "/dashboard/referrals", "Referrals & Earnings", "ORGANIZATION", 43),
  associatePage("inland-transport-overview", "/dashboard/inland-transportation", "Transport Overview", "SERVICES", 44),
  associatePage("inland-transport-directory", "/dashboard/inland-transportation/directory", "Truck Directory", "SERVICES", 45, "inland-transport-overview"),
  associatePage("inland-transport-opportunities", "/dashboard/inland-transportation/opportunities", "Transport Opportunities", "SERVICES", 46, "inland-transport-overview"),
  associatePage("inland-transport-trips", "/dashboard/inland-transportation/trips", "Transport Trips", "SERVICES", 47, "inland-transport-overview"),
  associatePage("inland-transport-fleet", "/dashboard/inland-transportation/fleet", "Fleet & Drivers", "SERVICES", 48, "inland-transport-overview"),
  associatePage("inland-transport-documents", "/dashboard/inland-transportation/documents", "Transport Documents", "SERVICES", 49, "inland-transport-overview"),
  associatePage("inland-transport-profile", "/dashboard/inland-transportation/profile", "Transport Profile", "SERVICES", 50, "inland-transport-overview"),
];

export const ASSOCIATE_SIDEBAR_ROUTES = ASSOCIATE_NAVIGATION_REGISTRY.map(({ pageId, path, label }) => [pageId, path, label] as const);

export const SIDEBAR_ROUTE_PATHS = new Set(ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => path));
export const SIDEBAR_RESOLVED_SECTIONS = ["IMPORTANT", "SEEKING", "PROVIDING", "OTHER_SERVICES"] as const;
export type SidebarResolvedSection = typeof SIDEBAR_RESOLVED_SECTIONS[number];

export const createDefaultSidebarSectionOrder = () => Object.fromEntries(
  SIDEBAR_RESOLVED_SECTIONS.map((section) => [section, ASSOCIATE_SIDEBAR_ROUTES.map(([, path]) => path)]),
) as Record<SidebarResolvedSection, string[]>;

export const deriveSidebarSectionOrder = (mappings: Array<{ routePath: string; placement: string; order: number }>) => {
  const defaults = createDefaultSidebarSectionOrder();
  const workPlacementsByRoute = mappings.reduce((index, row) => {
    const placements = index.get(row.routePath) || new Set<string>();
    if (row.placement === "BOTH") {
      placements.add("SEEKING");
      placements.add("PROVIDING");
    } else if (row.placement === "SEEKING" || row.placement === "PROVIDING") {
      placements.add(row.placement);
    }
    index.set(row.routePath, placements);
    return index;
  }, new Map<string, Set<string>>());
  return Object.fromEntries(SIDEBAR_RESOLVED_SECTIONS.map((section) => {
    const relevant = mappings.filter((row) => section === "IMPORTANT"
      ? workPlacementsByRoute.get(row.routePath)?.has("SEEKING") && workPlacementsByRoute.get(row.routePath)?.has("PROVIDING")
      : row.placement === section || (row.placement === "BOTH" && section !== "OTHER_SERVICES"));
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
  if (current === "UNASSIGNED") return incoming;
  if (incoming === "UNASSIGNED") return current;
  if (current === "OTHER_SERVICES") return incoming;
  if (incoming === "OTHER_SERVICES") return current;
  return "BOTH";
};

export const canonicalizeGovernanceMappings = <T extends GovernanceMapping>(mappings: T[] = []) => {
  const merged = new Map<string, GovernanceMapping>();
  for (const input of mappings) {
    const row: GovernanceMapping = {
      functionSlug: canonicalizeCompanyFunctionTaxonomySlug(input.functionSlug),
      routePath: canonicalizeSidebarRoutePath(input.routePath),
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

export type SidebarRouteAudience = { functionSlug: string; placement: "SEEKING" | "PROVIDING" };

export const deriveSidebarRouteAudience = (mappings: GovernanceMapping[]) => canonicalizeGovernanceMappings(mappings)
  .reduce((result, row) => {
    if (row.placement === "UNASSIGNED" || row.placement === "OTHER_SERVICES" || row.status === "HIDDEN") return result;
    const placements: SidebarRouteAudience["placement"][] = row.placement === "BOTH"
      ? ["SEEKING", "PROVIDING"]
      : [row.placement as SidebarRouteAudience["placement"]];
    const audience = result[row.routePath] || [];
    placements.forEach((placement) => {
      if (!audience.some((item) => item.functionSlug === row.functionSlug && item.placement === placement)) {
        audience.push({ functionSlug: row.functionSlug, placement });
      }
    });
    result[row.routePath] = audience;
    return result;
  }, {} as Record<string, SidebarRouteAudience[]>);

const LIVE_BY_FUNCTION: Record<string, string[]> = {
  buyer: ["/dashboard/bidding/my", "/dashboard/marketplace", "/dashboard/catalog", "/dashboard/enquiries", "/dashboard/sample-requests", "/dashboard/orders"],
  seller: ["/dashboard/bidding", "/dashboard/product", "/dashboard/marketplace", "/dashboard/inventory", "/dashboard/enquiries", "/dashboard/orders"],
  sourcing: ["/dashboard/marketplace", "/dashboard/enquiries", "/dashboard/orders"],
  packaging: ["/dashboard/packaging", "/dashboard/packaging/my", "/dashboard/packaging/execution", "/dashboard/execution-enquiries", "/dashboard/orders", "/dashboard/documents"],
  testing: ["/dashboard/quality-labs", "/dashboard/quality-labs/my", "/dashboard/quality-labs/execution", "/dashboard/sample-requests", "/dashboard/documents"],
  "warehouse-storage": ["/dashboard/warehouses", "/dashboard/warehouses/operations", "/dashboard/inventory", "/dashboard/warehouse-rent"],
  "finance-risk": ["/dashboard/orders", DOCUMENTATION_ROUTE],
  "importing-to-india": ["/dashboard/imports", "/dashboard/imports/my-listings", "/dashboard/imports/reservations", "/dashboard/orders", "/dashboard/documents", "/dashboard/execution-enquiries"],
  "exporting-from-india": ["/dashboard/product", "/dashboard/orders", "/dashboard/documents", "/dashboard/execution-enquiries"],
  "freight-forwarding": ["/dashboard/execution-enquiries", "/dashboard/orders", "/dashboard/documents"],
  "inland-logistics": ["/dashboard/execution-enquiries", "/dashboard/orders", "/dashboard/warehouses", "/dashboard/inland-transportation", "/dashboard/inland-transportation/directory", "/dashboard/inland-transportation/opportunities", "/dashboard/inland-transportation/trips", "/dashboard/inland-transportation/fleet", "/dashboard/inland-transportation/documents", "/dashboard/inland-transportation/profile"],
};

const ALWAYS_LIVE = ["/dashboard/company", "/dashboard/requirements"];
const INLAND_TRANSPORT_ROUTES = new Set(ASSOCIATE_SIDEBAR_ROUTES.map(([, routePath]) => routePath).filter((routePath) => routePath.startsWith("/dashboard/inland-transportation")));
const SEEKING_ROUTES = new Set(["/dashboard/bidding/my", "/dashboard/quality-labs", "/dashboard/packaging", "/dashboard/imports", "/dashboard/imports/reservations", "/dashboard/warehouse-rent"]);
const PROVIDING_ROUTES = new Set(["/dashboard/bidding", "/dashboard/quality-labs/my", "/dashboard/quality-labs/execution", "/dashboard/packaging/my", "/dashboard/packaging/execution", "/dashboard/imports/my-listings", "/dashboard/warehouses", "/dashboard/warehouses/operations", "/dashboard/inland-transportation", "/dashboard/inland-transportation/directory", "/dashboard/inland-transportation/opportunities", "/dashboard/inland-transportation/trips", "/dashboard/inland-transportation/fleet", "/dashboard/inland-transportation/documents", "/dashboard/inland-transportation/profile"]);

export const createBaselineSidebarMappings = (functionSlugs: string[]) => functionSlugs.flatMap((functionSlug) => {
  const live = new Set([...(LIVE_BY_FUNCTION[functionSlug] || []), ...ALWAYS_LIVE]);
  return ASSOCIATE_SIDEBAR_ROUTES.map(([, routePath], order) => {
    const status = routePath === "/dashboard/bidding" ? (functionSlug === "seller" ? "LIVE" : "HIDDEN") as SidebarPageStatus : live.has(routePath) ? "LIVE" as SidebarPageStatus : "HIDDEN" as SidebarPageStatus;
    const initialPlacement = (routePath === "/dashboard/bidding" ? (functionSlug === "seller" ? "PROVIDING" : "OTHER_SERVICES") : SEEKING_ROUTES.has(routePath) ? "SEEKING" : PROVIDING_ROUTES.has(routePath) ? "PROVIDING" : "BOTH") as SidebarPlacement;
    const placement = (INLAND_TRANSPORT_ROUTES.has(routePath) && functionSlug !== "inland-logistics") || (initialPlacement === "OTHER_SERVICES" && status === "HIDDEN") ? "UNASSIGNED" as const : initialPlacement;
    return { functionSlug, routePath, placement, status, order };
  });
});

export const normalizeBiddingForSeller = <T extends GovernanceMapping>(mappings: T[]) => mappings.map((row) => row.routePath === "/dashboard/bidding"
  ? { ...row, placement: row.functionSlug === "seller" ? "PROVIDING" : "UNASSIGNED", status: row.functionSlug === "seller" ? "LIVE" : "HIDDEN" }
  : row);

export const migrateUnassignedFallbacks = <T extends GovernanceMapping>(mappings: T[]) => mappings.map((row) => row.placement === "OTHER_SERVICES" && row.status === "HIDDEN"
  ? { ...row, placement: "UNASSIGNED" }
  : row) as T[];

export const enforceBuyerSellerBiddingSplit = <T extends GovernanceMapping>(mappings: T[]) => mappings.map((row) => {
  if (row.routePath === "/dashboard/bidding") {
    return { ...row, placement: row.functionSlug === "seller" ? "PROVIDING" : "UNASSIGNED", status: row.functionSlug === "seller" ? "LIVE" : "HIDDEN" };
  }
  if (row.routePath === "/dashboard/bidding/my") {
    return { ...row, placement: row.functionSlug === "buyer" ? "SEEKING" : "UNASSIGNED", status: row.functionSlug === "buyer" ? "LIVE" : "HIDDEN" };
  }
  return row;
}) as T[];

export const migrateBiddingSplit = <T extends GovernanceMapping>(mappings: T[]) => {
  if (mappings.some((row) => row.routePath === "/dashboard/bidding/my")) return mappings;
  const migrated: GovernanceMapping[] = mappings.map((row) => {
    if (row.routePath !== "/dashboard/bidding") return row;
    if (row.functionSlug === "seller") return { ...row, placement: "PROVIDING" };
    return { ...row, placement: "PROVIDING", status: "HIDDEN" };
  });
  const buyerLegacy = mappings.find((row) => row.functionSlug === "buyer" && row.routePath === "/dashboard/bidding");
  if (buyerLegacy) migrated.push({ ...buyerLegacy, routePath: "/dashboard/bidding/my", placement: "SEEKING" });
  return migrated as T[];
};
