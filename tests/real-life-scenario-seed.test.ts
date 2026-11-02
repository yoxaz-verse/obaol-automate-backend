import { describe, expect, it } from "vitest";
import { ASSOCIATE_ROLE_SLUGS } from "../src/database/models/realLifeScenario";
import { buildInitialScenarioDocuments, INITIAL_SCENARIO_CATALOG } from "../src/scripts/seedRealLifeScenarios";

describe("initial real-life scenario catalog", () => {
  const documents = buildInitialScenarioDocuments(new Date("2026-01-01T00:00:00.000Z"));

  it("contains three complete, unique, published scenarios for every Associate role", () => {
    expect(INITIAL_SCENARIO_CATALOG).toHaveLength(15);
    expect(documents).toHaveLength(45);
    expect(new Set(documents.map((item) => item.seedKey)).size).toBe(45);
    expect(new Set(documents.map((item) => `${item.roleSlug}/${item.slug}`)).size).toBe(45);
    for (const roleSlug of ASSOCIATE_ROLE_SLUGS) {
      const roleDocuments = documents.filter((item) => item.roleSlug === roleSlug);
      expect(roleDocuments).toHaveLength(3);
      expect(roleDocuments.map((item) => item.displayOrder)).toEqual([0, 1, 2]);
    }
    for (const item of documents) {
      expect(item.status).toBe("PUBLISHED");
      expect(item.disclosureAccepted).toBe(true);
      expect(item.publishedAt).toBeInstanceOf(Date);
      expect(item.h1 && item.excerpt && item.primaryKeyword && item.audienceIntent).toBeTruthy();
      expect(item.seoTitle && item.seoDescription).toBeTruthy();
      expect(item.blocks.length).toBeGreaterThanOrEqual(8);
      expect(item.faqs.length).toBeGreaterThanOrEqual(2);
      expect(item.cta.href).toBe(`/roles/associate/${item.roleSlug}`);
    }
  });

  it("avoids testimonials, fabricated statistics, and guaranteed outcomes", () => {
    const copy = JSON.stringify(documents);
    for (const prohibited of [
      /customer testimonial/i,
      /verified case study/i,
      /guaranteed (result|revenue|transaction|funding|delivery)/i,
      /\b\d+%\b/,
    ]) expect(copy).not.toMatch(prohibited);
    expect(copy).toMatch(/representative educational scenario/i);
    expect(copy).toMatch(/does not guarantee/i);
  });
});
