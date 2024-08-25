import { Router } from "express";
import ExampleMiddleware from "../middlewares/exampleMiddleware";
import ExampleService from "../services/exampleService";

const router = Router();
const exampleMiddleware = new ExampleMiddleware();
const exampleService = new ExampleService();

router.post(
  "/",
  exampleMiddleware.create.bind(exampleMiddleware),
  exampleService.createExample.bind(exampleService)
);

router.get("/", exampleService.getExamples.bind(exampleService));

router.patch(
  "/:id",
  exampleMiddleware.update.bind(exampleMiddleware),
  exampleService.updateExample.bind(exampleService)
);

router.delete(
  "/:id",
  exampleMiddleware.delete.bind(exampleMiddleware),
  exampleService.deleteExample.bind(exampleService)
);

export default router;
