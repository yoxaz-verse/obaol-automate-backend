// src/routes/activityManager.ts

import { Router } from "express";
import { validateInventoryManager } from "../middlewares/inventoryManager";
import { validateUniqueEmail } from "../database/models/emailChecker";
import InventoryManagerService from "../services/activityManager";

const router = Router();
const inventoryManagerService = new InventoryManagerService();

router.get(
  "/",
  inventoryManagerService.getInventoryManagers.bind(inventoryManagerService)
);
router.get(
  "/:id",
  inventoryManagerService.getInventoryManagerById.bind(inventoryManagerService)
);
router.post(
  "/",
  validateUniqueEmail,
  validateInventoryManager,
  inventoryManagerService.createInventoryManager.bind(inventoryManagerService)
);
router.patch(
  "/:id",
  inventoryManagerService.updateInventoryManager.bind(inventoryManagerService)
);
router.delete(
  "/:id",
  inventoryManagerService.deleteInventoryManager.bind(inventoryManagerService)
);

export default router;
