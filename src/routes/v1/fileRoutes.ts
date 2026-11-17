import { Router } from "express";
import multer from "multer";
import authenticateToken from "../../middlewares/auth";
import FileModel from "../../database/models/file";
import { deleteObject, getObjectStream, putObject } from "../../services/objectStorageService";

const router = Router();
const allowed = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => allowed.has(file.mimetype) ? cb(null, true) : cb(new Error("Only JPEG, PNG, WebP, and PDF files are supported.")),
});

router.post("/", authenticateToken, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose a file to upload." });
    const stored = await putObject({ domain: req.file.mimetype.startsWith("image/") ? "images" : "files", body: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype, metadata: { uploader: String(req.user?.id || "") } });
    let row: any;
    try {
      row = await FileModel.create({ fileName: req.file.originalname, path: "", url: "", ...stored, uploadedBy: req.user?.id || null });
    } catch (error) {
      await deleteObject(stored.objectKey).catch(() => undefined);
      throw error;
    }
    row.url = `/v1/web/upload/${row._id}`; await row.save();
    return res.status(201).json({ success: true, data: { _id: row._id, fileId: row._id, fileURL: row.url, fileIds: [row._id], fileURLs: [row.url], mimeType: row.mimeType, size: row.size } });
  } catch (error) { next(error); }
});

router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const row: any = await FileModel.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: "File not found." });
    const isAdmin = String(req.user?.role || "").toLowerCase() === "admin";
    if (!isAdmin && row.uploadedBy && String(row.uploadedBy) !== String(req.user?.id || "")) return res.status(403).json({ success: false, message: "Access denied." });
    if (!row.objectKey) return res.status(404).json({ success: false, message: "Stored file is unavailable." });
    res.type(row.mimeType || "application/octet-stream"); res.setHeader("Content-Disposition", `inline; filename="${String(row.fileName).replace(/["\r\n]/g, "")}"`);
    return (await getObjectStream(row.objectKey)).pipe(res);
  } catch (error) { next(error); }
});

router.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const row: any = await FileModel.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: "File not found." });
    const isAdmin = String(req.user?.role || "").toLowerCase() === "admin";
    if (!isAdmin && String(row.uploadedBy || "") !== String(req.user?.id || "")) return res.status(403).json({ success: false, message: "Access denied." });
    if (row.objectKey) await deleteObject(row.objectKey);
    await row.deleteOne();
    return res.json({ success: true, message: "File deleted." });
  } catch (error) { next(error); }
});

export default router;
