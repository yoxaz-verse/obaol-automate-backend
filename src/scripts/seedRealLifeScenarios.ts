import "dotenv/config";
import mongoose from "mongoose";
import { RealLifeScenarioModel } from "../database/models/realLifeScenario";

const roles = [
  ["traders", "Traders", "commodity trading", "buyer and supplier decisions"],
  ["importers", "Importers", "commodity importing", "overseas sourcing and destination delivery"],
  ["exporters", "Exporters", "commodity exporting", "buyer qualification and shipment readiness"],
  ["suppliers", "Suppliers", "commodity supply", "credible stock and fulfilment"],
  ["procurement-partners", "Procurement Partners", "commodity procurement", "requirements and supplier evaluation"],
  ["warehouse-owners", "Warehouse Owners", "commodity warehousing", "capacity, receipt and dispatch"],
  ["inland-transportation", "Inland Transportation", "commodity transportation", "pickup, transit and delivery"],
  ["freight-forwarders", "Freight Forwarders", "freight forwarding", "bookings, documents and shipment handoffs"],
  ["logistics-providers", "Logistics Providers", "trade logistics", "multi-party execution milestones"],
  ["packaging-companies", "Packaging Companies", "export packaging", "specifications, readiness and dispatch"],
  ["quality-testing-labs", "Quality Testing Labs", "commodity quality testing", "sampling, testing and certificates"],
  ["customs-clearance-agencies", "Customs Clearance Agencies", "customs clearance", "filings, documents and release"],
  ["finance-partners", "Finance Partners", "trade finance", "eligibility, evidence and funding decisions"],
  ["insurance-partners", "Insurance Partners", "trade insurance", "risk information, cover and claims readiness"],
  ["agritech-companies", "Agritech Companies", "agritech integration", "trade data and connected workflows"],
] as const;

const themes = [
  {
    slug: "separating-serious-opportunities-from-noise",
    title: (name: string) => `How ${name} Can Separate Serious Opportunities from Noise`,
    problem: (activity: string) => `Teams working in ${activity} can receive frequent requests that look active but lack confirmed specifications, authority, timing, or commercial readiness.`,
    impact: "Time is spent following up on incomplete opportunities while genuinely executable work waits for attention.",
  },
  {
    slug: "preventing-coordination-gaps-during-execution",
    title: (name: string) => `Preventing Coordination Gaps During ${name} Execution`,
    problem: (_activity: string, coordination: string) => `Once work begins, ${coordination} may be spread across calls, inboxes, spreadsheets, and different companies.`,
    impact: "The team loses a reliable view of ownership, documents, dependencies, exceptions, and the next required action.",
  },
  {
    slug: "building-an-accountable-workflow-from-request-to-closure",
    title: (name: string) => `A More Accountable ${name} Workflow from Request to Closure`,
    problem: (activity: string) => `A ${activity} requirement may be commercially sound but still stall when qualification, evidence, decisions, and execution milestones are not connected.`,
    impact: "Participants repeat questions, act on outdated information, and cannot easily establish whether the requirement is ready to progress.",
  },
] as const;

const buildBlocks = (name: string, activity: string, coordination: string, theme: typeof themes[number]) => [
  { type: "heading", level: 2, text: "The real-world challenge" },
  { type: "paragraph", text: theme.problem(activity, coordination) },
  { type: "callout", title: "Why this matters", text: theme.impact },
  { type: "heading", level: 2, text: "A structured way to respond" },
  { type: "workflow", items: [
    "Capture the requirement, scope, timing, locations, and decision owner in one record.",
    `Confirm the evidence and capabilities relevant to ${activity} before committing resources.`,
    `Coordinate ${coordination} against visible owners and milestones.`,
    "Record decisions, documents, exceptions, and completion status as the work progresses.",
  ] },
  { type: "heading", level: 2, text: `How OBAOL supports ${name.toLowerCase()}` },
  { type: "paragraph", text: `OBAOL provides a shared workflow where registered companies can keep the requirement, participants, documents, and execution status connected. It does not guarantee a transaction or replace the qualified companies performing the work.` },
  { type: "result", title: "Practical outcome", text: "The team can focus on better-qualified work, identify the next action faster, and maintain an accountable record from request through closure." },
  { type: "cta", title: `Explore the ${name} role`, text: `Review eligibility, responsibilities, and available OBAOL capabilities for ${name.toLowerCase()}.`, href: `/roles/associate/${roles.find((row) => row[1] === name)?.[0]}` },
];

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI or MONGODB_URI is required.");
  await mongoose.connect(uri);
  let created = 0;
  for (const [roleSlug, name, activity, coordination] of roles) {
    for (let index = 0; index < themes.length; index += 1) {
      const theme = themes[index];
      const h1 = theme.title(name);
      const result = await RealLifeScenarioModel.updateOne(
        { roleSlug, slug: theme.slug },
        { $setOnInsert: {
          internalTitle: h1, h1, roleSlug, slug: theme.slug,
          excerpt: `${theme.problem(activity, coordination)} This representative scenario shows a more structured way to manage the work.`,
          scenarioType: "REPRESENTATIVE", disclosureAccepted: true,
          blocks: buildBlocks(name, activity, coordination, theme),
          primaryKeyword: `${activity} workflow`,
          supportingKeywords: [`${name.toLowerCase()} scenario`, `${activity} coordination`, "B2B trade execution"],
          audienceIntent: `Organizations searching for practical guidance about ${activity} challenges and workflows.`,
          seoTitle: `${h1} | OBAOL Real-Life Scenario`,
          seoDescription: `A representative ${activity} scenario showing how ${name.toLowerCase()} can organize ${coordination} through a more accountable workflow.`,
          faqs: [
            { question: "Is this an actual customer case study?", answer: "No. It is an illustrative scenario based on challenges commonly encountered by businesses in this role." },
            { question: "Does OBAOL guarantee this outcome?", answer: "No. Outcomes depend on the participating companies, verification, commercial decisions, and execution conditions." },
          ],
          cta: { label: `Explore ${name} on OBAOL`, href: `/roles/associate/${roleSlug}` },
          displayOrder: index, status: "DRAFT",
        } },
        { upsert: true },
      );
      if (result.upsertedCount) created += 1;
    }
  }
  console.log(`Real-life scenario seed complete. Created ${created}; existing records were preserved.`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
