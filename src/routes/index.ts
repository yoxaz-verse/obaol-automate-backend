import { Router } from "express";
import exampleRoute from "./exampleRoute";
import adminRoute from "./adminRoute";
import errorRoute from "./error";
import customerRoute from "./customerRoute";

const router = Router();
const version = "v1";
const webRoute = "web";
export const prefix = `/${version}/${webRoute}`;

router.use(`${prefix}/example`, exampleRoute);
router.use(`${prefix}/error`, errorRoute);
router.use(`${prefix}/admin`, adminRoute);
router.use(`${prefix}/customer`, customerRoute);

export default router;
