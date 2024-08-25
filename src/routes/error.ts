import { Router } from "express";
import ErrorService from "../services/error";
import ErrorMiddleware from "../middlewares/error";

const router = Router();
const errorService = new ErrorService();
const errorMiddleware = new ErrorMiddleware();

router.get(
  "/",
  errorService.getErrors.bind(errorService)
);

router.patch(
  "/:id/resolve",
  errorMiddleware.resolveError.bind(errorMiddleware),
  errorService.resolveError.bind(errorService)
);

router.delete(
  "/:id",
  errorMiddleware.deleteError.bind(errorMiddleware),
  errorService.deleteError.bind(errorService)
);

router.post(
  "/batch-delete",
  errorMiddleware.batchDeleteErrors.bind(errorMiddleware),
  errorService.batchDeleteErrors.bind(errorService)
);

export default router;

