import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const controller = readFileSync(new URL("./warehouseController.ts", import.meta.url), "utf8");
const directory = readFileSync(new URL("./directoryController.ts", import.meta.url), "utf8");
const model = readFileSync(new URL("../database/models/warehouse.ts", import.meta.url), "utf8");

describe("warehouse WhatsApp contact contract", () => {
  it("accepts, normalizes, validates, and clears a dedicated optional number", () => {
    expect(controller).toContain("normalizeOptionalWhatsapp");
    expect(controller).toContain('/^\\+[1-9]\\d{7,14}$/');
    expect(controller).toContain('payload.whatsappPhone = normalizedWhatsapp?.e164 || ""');
    expect(model).toContain("whatsappPhoneNational");
    expect(model).toContain("normalizedWhatsapp.e164");
  });

  it("exposes the dedicated WhatsApp field in the scoped directory projection", () => {
    expect(directory).toMatch(/const projection = \{[\s\S]*whatsappPhone: 1/);
  });
});
