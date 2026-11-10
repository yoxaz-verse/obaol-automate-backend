import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processSignatureImage } from "../src/controllers/companySignatureController";

const file = (buffer: Buffer, mimetype = "image/png") => ({ buffer, mimetype, originalname: "signature.png" } as Express.Multer.File);

describe("company document signature processing", () => {
  it("normalizes a light-background signature to a transparent cropped PNG", async () => {
    const input = await sharp({ create: { width: 300, height: 100, channels: 3, background: "white" } }).composite([{ input: Buffer.from('<svg width="300" height="100"><path d="M30 65 C90 10 160 90 260 35" stroke="black" stroke-width="5" fill="none"/></svg>') }]).jpeg().toBuffer();
    const result = await processSignatureImage(file(input, "image/jpeg"));
    expect(result).toMatch(/^data:image\/png;base64,/);
    const output = Buffer.from(result.split(",")[1], "base64");
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("png");
    expect(meta.hasAlpha).toBe(true);
    expect(meta.width).toBeLessThan(300);
  });

  it("rejects unsupported image types", async () => {
    await expect(processSignatureImage(file(Buffer.from("not an image"), "application/pdf"))).rejects.toThrow("PNG or JPG");
  });
});
