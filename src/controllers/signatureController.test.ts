import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeSignaturePng } from "./signatureController";

const file = (buffer: Buffer, mimetype = "image/png") => ({ buffer, mimetype, originalname: "signature.png" } as Express.Multer.File);

describe("signature image normalization", () => {
  it("accepts a visible transparent PNG and emits normalized PNG", async () => {
    const input = await sharp({ create: { width: 240, height: 80, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: Buffer.from('<svg width="200" height="40"><path d="M5 25 Q80 0 190 25" stroke="black" stroke-width="5" fill="none"/></svg>'), left: 20, top: 20 }]).png().toBuffer();
    const output = await normalizeSignaturePng(file(input));
    expect((await sharp(output).metadata()).format).toBe("png");
  });
  it("rejects spoofed non-PNG content", async () => {
    await expect(normalizeSignaturePng(file(Buffer.from("not an image")))).rejects.toThrow(/transparent PNG/);
  });
  it("rejects a fully transparent PNG", async () => {
    const input = await sharp({ create: { width: 100, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    await expect(normalizeSignaturePng(file(input))).rejects.toThrow(/visible signature/);
  });
});
