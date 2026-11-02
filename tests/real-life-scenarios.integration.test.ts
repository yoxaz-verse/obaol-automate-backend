import mongoose from "mongoose";
import request from "supertest";
import app from "../src/app";
import { RealLifeScenarioModel } from "../src/database/models/realLifeScenario";
import { generateJWTToken } from "../src/utils/tokenUtils";

const api = request(app);
const adminToken = generateJWTToken({ _id: new mongoose.Types.ObjectId(), email: "scenario-admin@example.com", role: "Admin" } as any, "1h");
const associateToken = generateJWTToken({ _id: new mongoose.Types.ObjectId(), email: "scenario-user@example.com", role: "Associate" } as any, "1h");

const payload = (suffix: string) => ({
  internalTitle: `Exporter scenario ${suffix}`,
  h1: `How exporters qualify buyer enquiries ${suffix}`,
  roleSlug: "exporters",
  slug: `qualify-buyer-enquiries-${suffix}`,
  excerpt: "An illustrative scenario about qualifying buyer requirements before committing export resources.",
  disclosureAccepted: true,
  blocks: [
    { type: "heading", level: 2, text: "The challenge" },
    { type: "paragraph", text: "<script>alert(1)</script>Buyer requirements arrive without complete specifications." },
  ],
  primaryKeyword: "export buyer enquiry qualification",
  supportingKeywords: ["export workflow"],
  audienceIntent: "Exporters evaluating international buyer enquiries.",
  seoTitle: "How Exporters Qualify Buyer Enquiries | OBAOL",
  seoDescription: "A representative scenario showing how exporters can qualify buyer requirements and coordinate next steps.",
  faqs: [{ question: "Is this a customer case?", answer: "No. It is representative." }],
  cta: { label: "Explore exporters", href: "/roles/associate/exporters" },
});

describe("real-life scenarios", () => {
  it("enforces admin access, sanitizes blocks, and keeps drafts private", async () => {
    const suffix = new mongoose.Types.ObjectId().toHexString().slice(-8);
    await api.post("/api/v1/web/real-life-scenarios/admin").set("Authorization", `Bearer ${associateToken}`).send(payload(suffix)).expect(403);
    const created = await api.post("/api/v1/web/real-life-scenarios/admin").set("Authorization", `Bearer ${adminToken}`).send(payload(suffix)).expect(201);
    expect(created.body.data.status).toBe("DRAFT");
    expect(created.body.data.blocks[1].text).not.toContain("<script>");
    await api.get(`/api/v1/web/real-life-scenarios/public/exporters/${payload(suffix).slug}`).expect(404);
  });

  it("validates publication, publishes eligible content, and prevents duplicate role slugs", async () => {
    const suffix = new mongoose.Types.ObjectId().toHexString().slice(-8);
    const created = await api.post("/api/v1/web/real-life-scenarios/admin").set("Authorization", `Bearer ${adminToken}`).send(payload(suffix)).expect(201);
    const id = created.body.data._id;
    await api.post("/api/v1/web/real-life-scenarios/admin").set("Authorization", `Bearer ${adminToken}`).send(payload(suffix)).expect(409);
    await api.post(`/api/v1/web/real-life-scenarios/admin/${id}/transition`).set("Authorization", `Bearer ${adminToken}`).send({ action: "PUBLISH" }).expect(200);
    const publicRow = await api.get(`/api/v1/web/real-life-scenarios/public/exporters/${payload(suffix).slug}`).expect(200);
    expect(publicRow.body.data.h1).toContain(suffix);
    expect(publicRow.body.data).not.toHaveProperty("previewTokenHash");
  });

  it("excludes future schedules and serves expiring private previews", async () => {
    const suffix = new mongoose.Types.ObjectId().toHexString().slice(-8);
    const created = await api.post("/api/v1/web/real-life-scenarios/admin").set("Authorization", `Bearer ${adminToken}`).send(payload(suffix)).expect(201);
    const id = created.body.data._id;
    await api.post(`/api/v1/web/real-life-scenarios/admin/${id}/transition`).set("Authorization", `Bearer ${adminToken}`).send({ action: "SCHEDULE", scheduledAt: new Date(Date.now() + 86_400_000).toISOString() }).expect(200);
    await api.get(`/api/v1/web/real-life-scenarios/public/exporters/${payload(suffix).slug}`).expect(404);
    const tokenResponse = await api.post(`/api/v1/web/real-life-scenarios/admin/${id}/preview-token`).set("Authorization", `Bearer ${adminToken}`).send({}).expect(200);
    await api.get(`/api/v1/web/real-life-scenarios/preview/${id}`).query({ token: tokenResponse.body.data.token }).expect(200);
    await RealLifeScenarioModel.deleteMany({ slug: new RegExp(suffix) });
  });

  it("returns more than three published scenarios in display order", async () => {
    const suffix = new mongoose.Types.ObjectId().toHexString().slice(-8);
    const rows = Array.from({ length: 4 }, (_, index) => ({
      ...payload(`${suffix}-${index}`),
      displayOrder: 3 - index,
      status: "PUBLISHED",
      publishedAt: new Date(),
    }));
    await RealLifeScenarioModel.create(rows);
    const response = await api.get("/api/v1/web/real-life-scenarios/public").query({ roleSlug: "exporters" }).expect(200);
    const matching = response.body.data.filter((item: any) => item.slug.includes(suffix));
    expect(matching).toHaveLength(4);
    expect(matching.map((item: any) => item.displayOrder)).toEqual([0, 1, 2, 3]);
    await RealLifeScenarioModel.deleteMany({ slug: new RegExp(suffix) });
  });
});
