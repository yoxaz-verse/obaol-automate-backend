import { Router } from "express";
import { CatalogController } from "../../controllers/CatalogController";
import authenticateToken from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import multer from "multer";

const router = Router();
const catalogWorkbookUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, /\.(xlsx|xls)$/i.test(file.originalname)),
});

// Canonical no-cache hierarchy used by product-listing pickers for every dashboard role.
router.get("/hierarchy-options", authenticateToken, CatalogController.getHierarchyOptions);
router.get("/hierarchy-integrity", authenticateToken, authorizeRoles("Admin"), CatalogController.getHierarchyIntegrity);
router.get("/products/search", authenticateToken, CatalogController.searchProducts);
router.get("/import/template", authenticateToken, authorizeRoles("Admin"), CatalogController.downloadImportTemplate);
router.post("/import", authenticateToken, authorizeRoles("Admin"), catalogWorkbookUpload.single("file"), CatalogController.importCatalog);

// --- Secured Routes (Associate Only) ---
// Add item to logged-in associate's catalog
router.post("/add", authenticateToken, CatalogController.addToCatalog);

// Update item (margin, visibility)
router.patch("/:id", authenticateToken, CatalogController.updateCatalogItem);

// Remove item (by catalog item ID)
router.delete("/:id", authenticateToken, CatalogController.removeFromCatalog);

// Remove item (by variant rate ID - for Marketplace/My Products view)
router.delete("/variant-rate/:variantRateId", authenticateToken, CatalogController.removeFromCatalogByVariantRate);


// --- Public Routes ---
// Get public catalog by company slug
router.get("/public/:companySlug", CatalogController.getPublicCatalog);

// Get specific public product details
router.get("/public/:companySlug/:productSlug", CatalogController.getPublicProductDetails);

export default router;
