import multer from "multer";
import path from "path";
import fs from "fs";
import sanitize from "sanitize-filename";

const root = path.resolve(process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), "private-uploads", "documents"));
fs.mkdirSync(root, { recursive: true });

const allowed = new Set(["application/pdf", "image/png", "image/jpeg"]);
export const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, root),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitize(file.originalname)}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => allowed.has(file.mimetype) ? cb(null, true) : cb(new Error("Only PDF, PNG, and JPEG documents are supported.")),
});

export const documentUploadRoot = root;
