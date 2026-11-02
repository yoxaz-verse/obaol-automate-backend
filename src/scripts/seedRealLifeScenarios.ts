import "dotenv/config";
import mongoose from "mongoose";
import { RealLifeScenarioModel } from "../database/models/realLifeScenario";

type Story = { slug: string; h1: string; problem: string; impact: string; keyword: string; steps: string[] };
type RoleStories = { roleSlug: string; name: string; audience: string; stories: Story[] };
const s = (slug: string, h1: string, problem: string, impact: string, keyword: string, steps: string[]): Story => ({ slug, h1, problem, impact, keyword, steps });

export const INITIAL_SCENARIO_CATALOG: RoleStories[] = [
  { roleSlug: "traders", name: "Traders", audience: "commodity trading companies", stories: [
    s("qualifying-incomplete-bulk-commodity-enquiries", "How Traders Can Qualify Incomplete Bulk Commodity Enquiries", "An enquiry omits quantity, destination, quality parameters, timing, or decision authority.", "The team prices an opportunity that cannot yet support a responsible decision.", "bulk commodity enquiry qualification", ["Record missing commercial and product fields.", "Confirm authority and timing.", "Compare the completed requirement with supply context.", "Progress opportunities with clear owners and actions."]),
    s("keeping-buyer-and-supplier-terms-aligned", "Keeping Buyer and Supplier Terms Aligned During a Commodity Trade", "The latest specifications, price basis, documents, and delivery expectations sit in separate conversations.", "A party may act on an outdated version and create avoidable disputes.", "buyer supplier trade coordination", ["Create one current commercial record.", "Link both parties' responses.", "Record accepted changes and owners.", "Confirm alignment before execution."]),
    s("accountable-trade-workflow-from-enquiry-to-closure", "An Accountable Trader Workflow from Enquiry to Closure", "Samples, documents, providers, milestones, and exceptions are not connected after commercial interest.", "The trader cannot explain status or identify the next action quickly.", "accountable commodity trading workflow", ["Define demand and supply context.", "Coordinate samples and decisions.", "Assign documents and physical handoffs.", "Track delivery evidence and closure."]),
  ]},
  { roleSlug: "importers", name: "Importers", audience: "importing companies", stories: [
    s("confirming-import-requirements-before-sourcing", "Confirming Import Requirements Before Contacting Overseas Suppliers", "Supplier outreach begins before specifications, destination rules, quantity, incoterm, and delivery date are agreed.", "Offers use different assumptions and cannot be compared reliably.", "import requirement planning", ["Confirm product, quantity, destination, and timing.", "Record incoterm responsibilities.", "Identify destination approvals.", "Issue one comparable requirement."]),
    s("preventing-document-gaps-before-cargo-arrival", "Preventing Import Document Gaps Before Cargo Arrival", "Shipping, origin, product, and clearance records are requested through different channels.", "Missing records become visible close to arrival when options are narrower.", "import document coordination", ["List required documents.", "Assign each document owner.", "Review readiness before shipment and arrival.", "Record corrected versions and exceptions."]),
    s("overseas-supply-to-destination-delivery", "A Connected Import Workflow from Overseas Supply to Destination Delivery", "The supplier, forwarder, customs agency, carrier, warehouse, and procurement team track separate milestones.", "No participant has reliable end-to-end status.", "import execution workflow", ["Establish supplier and product context.", "Coordinate shipment readiness.", "Connect clearance and inland delivery.", "Record receipt and closure."]),
  ]},
  { roleSlug: "exporters", name: "Exporters", audience: "exporting companies", stories: [
    s("screening-export-buyer-enquiries", "Screening Export Buyer Enquiries Before Committing Resources", "Requests for prices and samples lack destination, quantity, specification, or purchasing process.", "Sales and operations spend time without knowing which enquiries can progress.", "export buyer enquiry screening", ["Capture destination and specification.", "Confirm buyer decision process.", "Match exportable supply.", "Prioritize complete enquiries."]),
    s("aligning-sample-approval-and-production", "Aligning Sample Approval with Export Production Readiness", "A buyer approves a sample while production, packaging, and quality teams use different specifications.", "Shipment preparation may not match the approved reference.", "export sample approval workflow", ["Attach the approved sample reference.", "Confirm production and packaging specifications.", "Assign quality evidence owners.", "Release preparation after alignment."]),
    s("buyer-requirement-to-export-dispatch", "An Export Workflow from Buyer Requirement to Dispatch", "Documents, packaging, inspection, freight, customs, and dispatch milestones are coordinated separately.", "Shipment readiness is difficult to verify.", "export shipment execution", ["Confirm commercial basis.", "Coordinate product and quality readiness.", "Connect freight and customs milestones.", "Record dispatch and closure."]),
  ]},
  { roleSlug: "suppliers", name: "Suppliers", audience: "commodity supply companies", stories: [
    s("responding-with-verifiable-supply-details", "Responding to Buyer Demand with Verifiable Supply Details", "Stock quantity, location, grade, ownership, and dispatch timing are not recorded consistently.", "The response may overstate readiness or require repeated clarification.", "commodity supply availability", ["Record quantity, grade, and location.", "Identify evidence and conditions.", "State realistic timing.", "Respond from the operations record."]),
    s("managing-quality-changes-between-lots", "Managing Quality Changes Between Commodity Lots", "Available lots differ in grade, test result, packing, or origin while the buyer requirement remains fixed.", "Non-equivalent lots may be treated as interchangeable.", "commodity lot quality coordination", ["Maintain lot-level context.", "Compare each lot with demand.", "Record deviations for approval.", "Link the selected lot to fulfilment."]),
    s("availability-to-supplier-dispatch", "A Supplier Workflow from Confirmed Availability to Dispatch", "Sampling, documents, packaging, pickup, and dispatch are coordinated outside the selected supply record.", "Readiness is difficult to demonstrate and handoffs are missed.", "supplier fulfilment workflow", ["Confirm selected supply.", "Coordinate samples and documents.", "Assign packaging and pickup milestones.", "Record dispatch evidence."]),
  ]},
  { roleSlug: "procurement-partners", name: "Procurement Partners", audience: "procurement companies", stories: [
    s("informal-request-to-procurement-brief", "Turning an Informal Commodity Request into a Usable Procurement Brief", "A request lacks specification, budget basis, delivery point, timing, or approval owner.", "Supplier outreach begins before consistent evaluation is possible.", "commodity procurement brief", ["Clarify product and quantity.", "Record the approval owner.", "Define evidence and commercial basis.", "Issue one structured brief."]),
    s("comparing-supplier-responses", "Comparing Commodity Supplier Responses on One Procurement Basis", "Offers use different units, quality descriptions, price bases, and delivery assumptions.", "A recommendation can hide material differences.", "supplier response comparison", ["Normalize units and assumptions.", "Record quality evidence.", "Compare aligned responses.", "Document the decision trail."]),
    s("requirement-to-execution-handoff", "A Procurement Workflow from Requirement Definition to Execution Handoff", "A selected supplier must move into samples, documents, services, and delivery coordination.", "Context is lost when sourcing selection is treated as completion.", "procurement execution handoff", ["Maintain the approved requirement.", "Record selection conditions.", "Assign documents and services.", "Transfer a complete execution record."]),
  ]},
  { roleSlug: "warehouse-owners", name: "Warehouse Owners", audience: "warehouse companies", stories: [
    s("confirming-warehouse-fit", "Confirming Warehouse Fit Before Accepting Commodity Cargo", "A storage request lacks commodity characteristics, quantity, handling needs, duration, or inbound schedule.", "Capacity appears available although the facility or plan may be unsuitable.", "commodity warehouse suitability", ["Capture cargo and duration.", "Check facility capability.", "Confirm capacity for the inbound window.", "Record acceptance conditions."]),
    s("reconciling-receipt-and-inventory", "Reconciling Receipt Condition with Warehouse Inventory Records", "Cargo arrives with quantity, packaging, seal, or document differences held only in calls and photographs.", "Later release questions lack a shared receipt record.", "warehouse commodity receipt", ["Record expected inbound references.", "Capture measured receipt and exceptions.", "Link evidence and acknowledgements.", "Update accepted inventory."]),
    s("capacity-booking-to-dispatch", "A Warehouse Workflow from Capacity Booking to Dispatch", "Inbound transport, receipt, inventory, release instructions, and pickup involve different companies.", "Unclear release status can delay or misdirect dispatch.", "warehouse execution workflow", ["Confirm capacity and appointment.", "Record receipt and inventory.", "Validate release instructions.", "Coordinate and record dispatch."]),
  ]},
  { roleSlug: "inland-transportation", name: "Inland Transportation", audience: "inland transport companies", stories: [
    s("complete-transport-load-details", "Accepting a Commodity Load with Complete Transport Details", "A vehicle is requested before weight, packaging, pickup readiness, route, or delivery constraints are confirmed.", "The assigned vehicle or schedule may not fit the movement.", "commodity transport requirement", ["Confirm cargo and vehicle need.", "Record locations and contacts.", "Check route and readiness.", "Accept explicit assumptions."]),
    s("pickup-delays-and-transit-exceptions", "Managing Pickup Delays and Transit Exceptions Across Companies", "Supplier, warehouse, carrier, and buyer receive different timing updates.", "Downstream services continue using stale plans.", "transport exception coordination", ["Record planned milestones.", "Log the exception once.", "Notify affected owners.", "Update revised timing."]),
    s("vehicle-assignment-to-proof-of-delivery", "A Transport Workflow from Vehicle Assignment to Proof of Delivery", "Assignment, loading evidence, transit status, receipt, and proof of delivery are stored separately.", "The movement cannot close with a complete record.", "inland transport execution workflow", ["Assign vehicle and contacts.", "Confirm loading evidence.", "Track transit exceptions.", "Attach receiving evidence."]),
  ]},
  { roleSlug: "freight-forwarders", name: "Freight Forwarders", audience: "freight-forwarding companies", stories: [
    s("shipment-ready-freight-request", "Requesting Freight with Shipment-Ready Information", "A request lacks cargo dimensions, weight, origin readiness, destination, incoterm, or sailing window.", "Rates and routing use assumptions that later change.", "freight booking request", ["Capture cargo and route.", "Confirm party responsibilities.", "Identify carrier information.", "Request comparable options."]),
    s("booking-cutoffs-and-document-handoffs", "Coordinating Freight Booking Cutoffs and Document Handoffs", "Cargo cutoff, shipping instructions, certificates, and customs records have different owners and deadlines.", "A missed dependency affects movement even when space is booked.", "freight document coordination", ["Record booking cutoffs.", "Assign document owners.", "Track deadline readiness.", "Escalate shipment impact."]),
    s("rate-request-to-shipment-handoff", "A Freight Forwarding Workflow from Rate Request to Shipment Handoff", "Exporter readiness, inland movement, customs, carrier events, and destination handoff fragment after booking.", "The selected option loses connected execution status.", "freight forwarding execution", ["Confirm route and basis.", "Connect origin and customs milestones.", "Maintain carrier events.", "Record final handoff."]),
  ]},
  { roleSlug: "logistics-providers", name: "Logistics Providers", audience: "multi-service logistics companies", stories: [
    s("multi-service-logistics-scope", "Scoping a Multi-Service Commodity Logistics Requirement", "A broad request covers transport, storage, handling, or forwarding without clear service boundaries.", "Responses omit dependencies or duplicate responsibility.", "commodity logistics scope", ["Break down required services.", "Define cargo and evidence.", "Identify dependencies.", "Confirm handoff owners."]),
    s("recovering-broken-logistics-handoff", "Recovering from a Broken Logistics Handoff", "Warehouse, carrier, forwarder, and receiver hold different appointment and release information.", "Equipment and teams wait while correction ownership is unclear.", "logistics handoff management", ["Record conflicting information.", "Identify authoritative owners.", "Agree corrected sequence.", "Track every affected handoff."]),
    s("end-to-end-bulk-trade-logistics", "An End-to-End Logistics Workflow for Bulk Trade", "Several logistics providers complete individual tasks while the overall delivery remains blocked.", "Local completion does not reveal end-to-end readiness.", "bulk trade logistics workflow", ["Map services to the requirement.", "Assign providers and milestones.", "Track cross-provider exceptions.", "Confirm delivery and closure."]),
  ]},
  { roleSlug: "packaging-companies", name: "Packaging Companies", audience: "commodity packaging companies", stories: [
    s("buyer-needs-to-packaging-specification", "Translating Buyer Requirements into Commodity Packaging Specifications", "A request lacks material, capacity, dimensions, markings, handling conditions, or destination needs.", "A quote may be accurate for the wrong packaging.", "commodity packaging specification", ["Capture product characteristics.", "Confirm pack and closure.", "Record quantity and timing.", "Approve one specification."]),
    s("label-and-marking-errors", "Preventing Label and Marking Errors Before Commodity Dispatch", "Buyer marks, regulatory text, batch information, and shipment references are approved separately.", "Packaging may carry outdated or missing markings.", "export packaging label approval", ["Create one marking reference.", "Assign approvals.", "Confirm version before printing.", "Record production evidence."]),
    s("packaging-to-cargo-readiness", "A Packaging Workflow from Specification to Cargo Readiness", "Artwork, production, delivery, packing, and shipment readiness do not align with the product schedule.", "Suitable packaging can still arrive too late.", "commodity packaging workflow", ["Approve technical specification.", "Coordinate production milestones.", "Link delivery to product readiness.", "Record packing completion."]),
  ]},
  { roleSlug: "quality-testing-labs", name: "Quality Testing Labs", audience: "commodity testing laboratories", stories: [
    s("correct-commodity-test-scope", "Defining the Correct Commodity Test Scope Before Sampling", "A sample lacks commodity identity, lot reference, parameters, method, limits, or reporting purpose.", "Testing may be valid but unsuitable for the intended decision.", "commodity laboratory test scope", ["Confirm commodity and lot.", "Record parameters and methods.", "Define sampling responsibility.", "Accept agreed reporting scope."]),
    s("sample-chain-of-custody", "Protecting Commodity Sample Identity and Chain of Custody", "A sample passes through several parties without one identifier or custody record.", "Parties may dispute whether results represent the intended lot.", "commodity sample chain of custody", ["Assign sample and lot references.", "Record collection context.", "Track seals and handoffs.", "Link sample to report."]),
    s("test-request-to-certificate", "A Laboratory Workflow from Test Request to Certificate", "Test scope, receipt, status, exceptions, review, and certificate delivery are separate.", "Buyer and supplier lack shared quality-evidence status.", "commodity testing workflow", ["Confirm scope and sampling.", "Record receipt condition.", "Track testing and review.", "Link the certificate."]),
  ]},
  { roleSlug: "customs-clearance-agencies", name: "Customs Clearance Agencies", audience: "customs-clearance companies", stories: [
    s("clearance-readiness-before-filing", "Checking Commodity Clearance Readiness Before Filing", "Classification context, invoice, packing list, origin evidence, permits, or party details remain incomplete.", "Preparation begins without filing-ready information.", "customs clearance readiness", ["Confirm shipment and parties.", "List required records.", "Record classification questions.", "Proceed with complete information."]),
    s("document-mismatches-before-arrival", "Resolving Customs Document Mismatches Before Cargo Arrival", "Quantity, description, value, marks, or origin differ across records.", "Late correction can disrupt filing and release.", "customs document mismatch", ["Compare the filing set.", "Identify mismatches and owners.", "Obtain corrections or explanations.", "Confirm the filing version."]),
    s("document-receipt-to-cargo-release", "A Customs Clearance Workflow from Document Receipt to Cargo Release", "Importer, exporter, forwarder, carrier, agency, and transporter depend on clearance milestones.", "Release may occur without usable pickup context reaching downstream parties.", "customs clearance workflow", ["Record shipment context.", "Track filing and queries.", "Maintain release status.", "Coordinate authorized pickup."]),
  ]},
  { roleSlug: "finance-partners", name: "Finance Partners", audience: "trade-finance providers", stories: [
    s("complete-trade-finance-request", "Receiving a Complete Commodity Trade Finance Request", "A request lacks coherent counterparties, documents, execution stage, amount, tenor, or facility structure.", "Eligibility review requires repeated information requests.", "commodity trade finance request", ["Capture applicant and purpose.", "Record amount and product.", "Attach available evidence.", "Route provider-led assessment."]),
    s("finance-conditions-and-execution", "Keeping Finance Conditions Aligned with Trade Execution", "Conditions and validity periods are separate from supply, shipment, and payment milestones.", "Execution can progress without satisfying a relevant condition.", "trade finance condition tracking", ["Record provider conditions.", "Connect execution milestones.", "Track submitted evidence.", "Escalate material changes."]),
    s("application-to-provider-decision", "A Trade Finance Workflow from Application to Provider Decision", "Applicant information, diligence questions, approvals, and updates arrive through separate channels.", "Applicant and provider lack reliable status.", "trade finance application workflow", ["Create an authorized request.", "Collect provider-required records.", "Track questions and conditions.", "Record the decision without guarantees."]),
  ]},
  { roleSlug: "insurance-partners", name: "Insurance Partners", audience: "trade and cargo insurance providers", stories: [
    s("usable-cargo-insurance-information", "Submitting Usable Information for Commodity Cargo Insurance", "A request lacks cargo value, commodity, packaging, route, conveyance, dates, or storage context.", "The provider cannot assess cover consistently.", "commodity cargo insurance request", ["Record assured-party context.", "Confirm cargo and route.", "Provide requested risk information.", "Submit provider-led assessment."]),
    s("risk-changes-before-shipment", "Recording Material Risk Changes Before Commodity Shipment", "Route, carrier, packaging, storage duration, or value changes after an insurance discussion.", "Coverage assumptions may no longer match the movement.", "cargo insurance risk change", ["Record original request basis.", "Log material changes.", "Notify the provider.", "Record revised terms or decisions."]),
    s("cover-request-to-claims-readiness", "An Insurance Workflow from Cover Request to Claims Readiness", "Coverage requests, policy evidence, milestones, incidents, and supporting records sit separately.", "A company must reconstruct the trade record after an incident.", "trade insurance workflow", ["Maintain risk context.", "Link policy evidence.", "Track milestones and incidents.", "Organize claims-supporting records."]),
  ]},
  { roleSlug: "agritech-companies", name: "Agritech Companies", audience: "agritech and technology companies", stories: [
    s("supply-data-to-trade-requirement", "Mapping Agritech Supply Data to a Buyer Requirement", "Farm, crop, quality, or availability data uses identifiers and units different from the trade requirement.", "Relevant supply cannot be interpreted reliably.", "agritech trade data mapping", ["Map product and quantity fields.", "Record source and update timing.", "Identify requirement gaps.", "Share normalized context."]),
    s("stale-data-across-connected-systems", "Preventing Stale Commodity Data Across Connected Systems", "Inventory, quality, location, or status changes while connected workflows retain older values.", "Companies may act on technically valid but stale information.", "commodity data synchronization", ["Define authoritative fields.", "Record update timestamps.", "Flag synchronization failures.", "Require review of stale data."]),
    s("data-source-to-execution-record", "An Agritech Integration from Data Source to Trade Execution Record", "Automation connects supply data to enquiries and milestones without retaining source or decision context.", "Data moves while accountability and meaning are lost.", "agritech trade integration", ["Define authorized scope.", "Map identifiers and provenance.", "Connect accountable review points.", "Monitor exceptions and audit records."]),
  ]},
];

const faqs = [
  { question: "Is this an actual customer case study?", answer: "No. This is a representative educational scenario based on situations businesses in this role may encounter." },
  { question: "Does OBAOL guarantee the described outcome?", answer: "No. Outcomes depend on participating companies, their decisions, diligence, contracts, regulated providers, and execution conditions." },
];

export const buildInitialScenarioDocuments = (publishedAt = new Date()) => INITIAL_SCENARIO_CATALOG.flatMap((role) => role.stories.map((item, displayOrder) => ({
  seedKey: `associate-scenario-v1:${role.roleSlug}:${item.slug}`, seedVersion: 1,
  internalTitle: item.h1, h1: item.h1, roleSlug: role.roleSlug, slug: item.slug,
  excerpt: `${item.problem} This representative scenario explains a structured response without promising a commercial outcome.`,
  scenarioType: "REPRESENTATIVE", disclosureAccepted: true,
  blocks: [
    { type: "heading", level: 2, text: "The operational situation" }, { type: "paragraph", text: item.problem },
    { type: "callout", title: "Why it affects execution", text: item.impact },
    { type: "heading", level: 2, text: "A structured workflow" }, { type: "workflow", items: item.steps },
    { type: "heading", level: 2, text: `How OBAOL supports ${role.name.toLowerCase()}` },
    { type: "paragraph", text: "OBAOL keeps requirements, company context, documents, responsibilities, and milestones connected. It supports coordination but does not replace the companies or regulated providers performing the work." },
    { type: "result", title: "Practical outcome", text: "Participants gain a clearer shared record of owners, exceptions, and next actions. This does not guarantee a transaction or operational result." },
    { type: "cta", title: `Explore the ${role.name} role`, text: `Review responsibilities and available OBAOL capabilities for ${role.name.toLowerCase()}.`, href: `/roles/associate/${role.roleSlug}` },
  ],
  primaryKeyword: item.keyword, supportingKeywords: [`${role.name.toLowerCase()} scenario`, `${item.keyword} workflow`, "B2B bulk trade execution"],
  audienceIntent: `Registered ${role.audience} looking for practical guidance about ${item.keyword}.`,
  seoTitle: `${item.h1} | OBAOL Scenario`, seoDescription: `A representative ${role.name.toLowerCase()} scenario about ${item.keyword} and a more accountable OBAOL workflow.`,
  faqs, cta: { label: `Explore ${role.name} on OBAOL`, href: `/roles/associate/${role.roleSlug}` },
  displayOrder, status: "PUBLISHED", scheduledAt: null, publishedAt,
})));

export async function seedInitialScenarios() {
  if (!process.argv.includes("--publish")) throw new Error("Publication is explicit. Run this seed with --publish.");
  const documents = buildInitialScenarioDocuments();
  let created = 0, updated = 0, skipped = 0, published = 0;
  for (const document of documents) {
    const existing: any = await RealLifeScenarioModel.findOne({ seedKey: document.seedKey }).select("+seedKey +seedVersion status publishedAt").lean();
    if (!existing) {
      if (await RealLifeScenarioModel.exists({ roleSlug: document.roleSlug, slug: document.slug })) throw new Error(`Cannot seed ${document.seedKey}: role/slug belongs to an unmarked record.`);
      await RealLifeScenarioModel.create(document); created += 1; published += 1; continue;
    }
    if (Number(existing.seedVersion || 0) >= document.seedVersion && existing.status === "PUBLISHED") { skipped += 1; continue; }
    await RealLifeScenarioModel.updateOne({ _id: existing._id, seedKey: document.seedKey }, { $set: { ...document, publishedAt: existing.publishedAt || document.publishedAt } }, { runValidators: true });
    updated += 1; if (existing.status !== "PUBLISHED") published += 1;
  }
  const seededCount = await RealLifeScenarioModel.countDocuments({ seedKey: { $in: documents.map((item) => item.seedKey) }, status: "PUBLISHED" });
  if (documents.length !== 45 || INITIAL_SCENARIO_CATALOG.length !== 15 || seededCount !== 45) throw new Error(`Seed verification failed: catalog=${documents.length}, roles=${INITIAL_SCENARIO_CATALOG.length}, published=${seededCount}.`);
  console.log(JSON.stringify({ created, updated, skipped, published, verifiedPublished: seededCount }));
}

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI or MONGODB_URI is required.");
  await mongoose.connect(uri); await seedInitialScenarios(); await mongoose.disconnect();
}

if (require.main === module) run().catch(async (error) => { console.error(error); await mongoose.disconnect(); process.exit(1); });
