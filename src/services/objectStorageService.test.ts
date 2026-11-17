import { describe, expect, it } from "vitest";
import { buildObjectKey, storageConfiguration } from "./objectStorageService";

describe("objectStorageService", () => {
  it("builds private object keys without unsafe filename characters", () => {
    const key = buildObjectKey("Trade Documents", "../../My Invoice (Final).PDF");
    expect(key).toContain("trade-documents/");
    expect(key).toMatch(/my-invoice-final\.pdf$/);
    expect(key).not.toContain("..");
    expect(key).not.toContain(" ");
  });

  it("reports configuration without exposing credentials", () => {
    const config = storageConfiguration();
    expect(config).toHaveProperty("credentialSource");
    expect(config).not.toHaveProperty("accessKeyId");
    expect(config).not.toHaveProperty("secretAccessKey");
  });
});
