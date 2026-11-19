import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeProfileRole, processProfilePicture, PROFILE_PICTURE_MAX_BYTES, PROFILE_PICTURE_TYPES } from "./profilePictureService";

describe("profilePictureService", () => {
  it("normalizes supported account aliases", () => {
    expect(normalizeProfileRole("CUSTOMER")).toBe("associate");
    expect(normalizeProfileRole("team")).toBe("operator");
    expect(normalizeProfileRole("ADMIN")).toBe("admin");
  });

  it("accepts only expected image types with a five megabyte limit", () => {
    expect([...PROFILE_PICTURE_TYPES]).toEqual(["image/jpeg", "image/png", "image/webp"]);
    expect(PROFILE_PICTURE_MAX_BYTES).toBe(5 * 1024 * 1024);
  });

  it("creates a square 512px WebP image", async () => {
    const source = await sharp({ create: { width: 900, height: 500, channels: 3, background: "#f59e0b" } }).jpeg().toBuffer();
    const result = await processProfilePicture(source);
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
    expect(metadata.format).toBe("webp");
  });

  it("rejects malformed image content", async () => {
    await expect(processProfilePicture(Buffer.from("not an image"))).rejects.toThrow();
  });
});
