import { Router } from "express";
import authenticateToken from "../middlewares/auth";
import UnLoCodeFunctionService from "../services/unLoCodeFunction";
import UnLoCodeFunctionMiddleware from "../middlewares/unLoCodeFunction";

const router = Router();
const service = new UnLoCodeFunctionService();
const middleware = new UnLoCodeFunctionMiddleware();

router.get("/", authenticateToken, service.getUnLoCodeFunctions.bind(service));
router.get(
  "/:id",
  authenticateToken,
  service.getUnLoCodeFunction.bind(service)
);
router.post(
  "/",
  authenticateToken,
  middleware.createUnLoCodeFunction.bind(middleware),
  service.createUnLoCodeFunction.bind(service)
);
router.patch(
  "/:id",
  authenticateToken,
  middleware.updateUnLoCodeFunction.bind(middleware),
  service.updateUnLoCodeFunction.bind(service)
);
router.delete(
  "/:id",
  authenticateToken,
  middleware.deleteUnLoCodeFunction.bind(middleware),
  service.deleteUnLoCodeFunction.bind(service)
);

export default router;
