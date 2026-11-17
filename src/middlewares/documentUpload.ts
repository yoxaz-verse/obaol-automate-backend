import multer from "multer";

const allowed = new Set(["application/pdf", "image/png", "image/jpeg"]);
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => allowed.has(file.mimetype) ? cb(null, true) : cb(new Error("Only PDF, PNG, and JPEG documents are supported.")),
});

