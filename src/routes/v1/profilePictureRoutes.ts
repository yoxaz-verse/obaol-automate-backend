import { Router } from "express";
import multer from "multer";
import authenticateToken from "../../middlewares/auth";
import { AdminModel } from "../../database/models/admin";
import { AssociateModel } from "../../database/models/associate";
import { OperatorModel } from "../../database/models/operator";
import { deleteObject, getObjectStream, putObject } from "../../services/objectStorageService";
import { normalizeProfileRole, processProfilePicture, PROFILE_PICTURE_MAX_BYTES, PROFILE_PICTURE_TYPES } from "../../services/profilePictureService";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PROFILE_PICTURE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, PROFILE_PICTURE_TYPES.has(file.mimetype)),
});

const modelForRole = (roleValue: unknown) => {
  const role = normalizeProfileRole(roleValue);
  if (role === "associate") return AssociateModel;
  if (role === "operator") return OperatorModel;
  if (role === "admin") return AdminModel;
  return null;
};

const pictureUrl = (role: string, id: unknown, updatedAt: Date | string | null) =>
  `/v1/web/profile-pictures/${role}/${id}?v=${new Date(updatedAt || 0).getTime()}`;

router.put("/profile-picture", authenticateToken, upload.single("picture"), async (req: any, res, next) => {
  let uploadedKey = "";
  try {
    if (!req.file || !PROFILE_PICTURE_TYPES.has(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Choose a JPEG, PNG, or WebP image up to 5 MB." });
    }
    const role = normalizeProfileRole(req.user?.role);
    const Model: any = modelForRole(role);
    if (!Model) return res.status(403).json({ success: false, message: "Profile pictures are not supported for this account type." });

    let image: Buffer;
    try {
      image = await processProfilePicture(req.file.buffer);
    } catch {
      return res.status(400).json({ success: false, message: "The selected file is not a valid image." });
    }

    const current: any = await Model.findById(req.user.id).select("profilePicture").lean();
    if (!current) return res.status(404).json({ success: false, message: "Account not found." });
    const previousKey = String(current.profilePicture?.objectKey || "");
    const stored = await putObject({
      domain: `profile-pictures/${role}`,
      body: image,
      originalName: "profile-picture.webp",
      mimeType: "image/webp",
      metadata: { accountId: String(req.user.id), accountType: role },
    });
    uploadedKey = stored.objectKey;
    const updatedAt = new Date();
    const updated: any = await Model.findByIdAndUpdate(req.user.id, {
      $set: { profilePicture: { objectKey: stored.objectKey, mimeType: stored.mimeType, size: stored.size, checksum: stored.checksum, updatedAt } },
    }, { new: true }).select("profilePicture").lean();
    if (!updated) throw Object.assign(new Error("Account update failed."), { statusCode: 404 });
    if (previousKey && previousKey !== stored.objectKey) await deleteObject(previousKey).catch(() => undefined);
    return res.json({ success: true, data: { profilePictureUrl: pictureUrl(role, req.user.id, updatedAt) }, message: "Profile picture updated." });
  } catch (error) {
    if (uploadedKey) await deleteObject(uploadedKey).catch(() => undefined);
    next(error);
  }
});

router.delete("/profile-picture", authenticateToken, async (req: any, res, next) => {
  try {
    const role = normalizeProfileRole(req.user?.role);
    const Model: any = modelForRole(role);
    if (!Model) return res.status(403).json({ success: false, message: "Profile pictures are not supported for this account type." });
    const current: any = await Model.findById(req.user.id).select("profilePicture").lean();
    if (!current) return res.status(404).json({ success: false, message: "Account not found." });
    const objectKey = String(current.profilePicture?.objectKey || "");
    await Model.findByIdAndUpdate(req.user.id, { $unset: { profilePicture: 1 } });
    if (objectKey) await deleteObject(objectKey).catch(() => undefined);
    return res.json({ success: true, data: { profilePictureUrl: null }, message: "Profile picture removed." });
  } catch (error) { next(error); }
});

router.get("/profile-pictures/:accountType/:accountId", authenticateToken, async (req, res, next) => {
  try {
    const role = normalizeProfileRole(req.params.accountType);
    const Model: any = modelForRole(role);
    if (!Model) return res.status(404).json({ success: false, message: "Profile picture not found." });
    const account: any = await Model.findById(req.params.accountId).select("profilePicture isDeleted").lean();
    if (!account || account.isDeleted || !account.profilePicture?.objectKey) return res.status(404).json({ success: false, message: "Profile picture not found." });
    res.set({
      "Content-Type": account.profilePicture.mimeType || "image/webp",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline; filename=profile-picture.webp",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });
    return (await getObjectStream(account.profilePicture.objectKey)).pipe(res);
  } catch (error) { next(error); }
});

export default router;
