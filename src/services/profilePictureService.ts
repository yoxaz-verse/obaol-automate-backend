import sharp from "sharp";

export const PROFILE_PICTURE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const PROFILE_PICTURE_MAX_BYTES = 5 * 1024 * 1024;

export const normalizeProfileRole = (value: unknown) => {
  const role = String(value || "").toLowerCase();
  if (role === "customer") return "associate";
  if (role === "team") return "operator";
  return role;
};

export async function processProfilePicture(input: Buffer) {
  return sharp(input, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate()
    .resize(512, 512, { fit: "cover", position: "centre", withoutEnlargement: false })
    .webp({ quality: 86, effort: 4 })
    .toBuffer();
}
