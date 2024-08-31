import { Router } from "express";
import exampleRoute from "./exampleRoute";
import adminRoute from "./adminRoute";
import errorRoute from "./error";
import customerRoute from "./customerRoute";
import serviceCompanyRoute from "./serviceCompanyRoute";
import managerRoute from "./managerRoute";
import workerRoute from "./workerRoute";
import projectStatusroute from "./projectStatusRoute";
import locationTyperoute from "./locationTypeRoute";
import locationManagerroute from "./locationManagerRoute";
import locationroute from "./locationRoute";
import projectroute from "./projectRoute";
import activityStatusroute from "./activityStatusRoute";
import timesheetroute from "./timesheetRoute";

const router = Router();
const version = "v1";
const webRoute = "web";
export const prefix = `/${version}/${webRoute}`;

router.use(`${prefix}/example`, exampleRoute);
router.use(`${prefix}/error`, errorRoute);
router.use(`${prefix}/admin`, adminRoute);
router.use(`${prefix}/customer`, customerRoute);
router.use(`${prefix}/serviceCompany`, serviceCompanyRoute);
router.use(`${prefix}/manager`, managerRoute);
router.use(`${prefix}/worker`, workerRoute);
router.use(`${prefix}/projectStatus`, projectStatusroute);
router.use(`${prefix}/locationType`, locationTyperoute);
router.use(`${prefix}/locationManager`, locationManagerroute);
router.use(`${prefix}/location`, locationroute);
router.use(`${prefix}/project`, projectroute);
router.use(`${prefix}/activityStatus`, activityStatusroute);
router.use(`${prefix}/timesheet`, timesheetroute );

export default router;
