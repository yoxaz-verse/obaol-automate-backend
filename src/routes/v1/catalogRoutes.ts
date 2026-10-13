import { Router } from "express";
import { CatalogController } from "../../controllers/CatalogController";
import authenticateToken from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const router = Router();

// Canonical no-cache hierarchy used by product-listing pickers for every dashboard role.
router.get("/hierarchy-options", authenticateToken, CatalogController.getHierarchyOptions);
router.get("/hierarchy-integrity", authenticateToken, authorizeRoles("Admin"), CatalogController.getHierarchyIntegrity);

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
