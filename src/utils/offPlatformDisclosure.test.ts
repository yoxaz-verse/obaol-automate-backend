import { describe, expect, it } from "vitest";
import { detectOffPlatformDisclosure } from "./offPlatformDisclosure";

const detect = (value: unknown, companyNames: string[] = []) => detectOffPlatformDisclosure(value, { companyNames });

describe("off-platform disclosure detector", () => {
  it.each(["", "6-7mm", "Grade 1", "10% moisture", "2 x 25 kg bags", "Deliver on 16 Oct 2026", "Route through INNSA port", "Use food-grade bags"])("allows %j", (value) => {
    expect(detect(value)).toBeNull();
  });

  it.each(["+91 70282 55569", "702-825-5569", "７０２８２５５５６９", "seven zero two eight two triple five six nine", "91 seven zero two 825 five five six nine"])("detects phone disclosure in %j", (value) => {
    expect(detect(value)?.kind).toBe("phone");
  });

  it("detects email and website disclosures", () => {
    expect(detect("business@example.com")?.kind).toBe("email");
    expect(detect("business at example dot com")?.kind).toBe("email");
    expect(detect("https://example.com/contact")?.kind).toBe("website");
    expect(detect("Visit example.com")?.kind).toBe("website");
    expect(detect("example dot com")?.kind).toBe("website");
  });

  it("detects messaging details", () => {
    expect(detect("Telegram me at @trade_user")?.kind).toBe("social_handle");
    expect(detect("@trade_user")?.kind).toBe("social_handle");
    expect(detect("contact me via Signal")?.kind).toBe("social_handle");
  });

  it("detects company variants without partial-word matches", () => {
    const names = ["Acme Foods Private Limited", "Acme Exports"];
    expect(detect("We are Acme Foods Pvt. Ltd.", names)?.kind).toBe("company_name");
    expect(detect("Contact ACME FOODS directly", names)?.kind).toBe("company_name");
    expect(detect("Use acme-grade packaging", names)).toBeNull();
  });
});
