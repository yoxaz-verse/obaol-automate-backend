import { Router } from "express";
import authenticateToken from "../../middlewares/auth";
import { WarehouseController } from "../../controllers/warehouseController";

const router = Router();
const controller = new WarehouseController();

router.post("/warehouses", authenticateToken, (req, res, next) =>
    controller.createWarehouse(req, res, next)
);
router.get("/warehouses", authenticateToken, (req, res, next) =>
    controller.listWarehouses(req, res, next)
);
router.patch("/warehouses/:id", authenticateToken, (req, res, next) =>
    controller.updateWarehouse(req, res, next)
);
router.post("/warehouse/assignments", authenticateToken, (req, res, next) =>
    controller.createWarehouseAssignment(req, res, next)
);
router.get("/warehouse/assignments", authenticateToken, (req, res, next) =>
    controller.listWarehouseAssignments(req, res, next)
);

router.post("/warehouse/inbound", authenticateToken, (req, res, next) =>
    controller.recordInbound(req, res, next)
);
router.post("/warehouse/outbound", authenticateToken, (req, res, next) =>
    controller.recordOutbound(req, res, next)
);
router.post("/warehouse/adjust", authenticateToken, (req, res, next) =>
    controller.recordAdjustment(req, res, next)
);
router.get("/warehouse/movements", authenticateToken, (req, res, next) =>
    controller.listMovements(req, res, next)
);

router.get("/warehouse/storage-charges", authenticateToken, (req, res, next) =>
    controller.listStorageCharges(req, res, next)
);
router.post("/warehouse/storage-charges/calculate", authenticateToken, (req, res, next) =>
    controller.calculateStorageCharge(req, res, next)
);

export default router;
