import { Router } from "express";

// Import Manager routes
import managerRoute from "./manager";
import customerRoute from "./customerRoute";
import workerRoute from "./workerRoute";
import adminRoute from "./adminRoute";

import timeSheetRoute  from "./timesheetRoute";

import activityStatusRoute from "./activityStatusRoute";
import activityTypeRoute from "./activityTypeRoute";
import activityRoute from "./activityRoute";
import projectTypeRoute from "./projectTypeRoute";
import projectRoute from "./projectRoute";
import projectStatusRoute from "./projectStatusRoute";
import locationTypeRoute from "./locationTypeRoute";
import locationRoute from "./locationRoute";
import locationManagerRoute from "./locationManagerRoute";
import fileRoute from "./fileRoute";
import authRoute from "./authRoute";
import serviceCompanyRoute from "./serviceCompanyRoute";
import verifyTokenRoute from "./verifyTokenRoute";
import activityManagerRoute from "./activityManagerRoute";
import projectManagerRoute from "./projectManagerRoute";

// Initialize the main router
const router = Router();
const version = "v1";
const webRoute = "web";
export const prefix = `/${version}/${webRoute}`;

//Auth
router.use(`${prefix}/login`, authRoute);
router.use(`${prefix}/verify-token`, verifyTokenRoute);

// Users
router.use(`${prefix}/manager`, managerRoute);
router.use(`${prefix}/admin`, adminRoute);
router.use(`${prefix}/customer`, customerRoute);
router.use(`${prefix}/worker`, workerRoute);
router.use(`${prefix}/worker`, workerRoute);

router.use(`${prefix}/timeSheet`, timeSheetRoute);

router.use(`${prefix}/projects`, projectRoute);
router.use(`${prefix}/projectType`, projectTypeRoute);
router.use(`${prefix}/projectStatus`, projectStatusRoute);
router.use(`${prefix}/projectManager`, projectManagerRoute);

router.use(`${prefix}/activity`, activityRoute);
router.use(`${prefix}/activityStatus`, activityStatusRoute);
router.use(`${prefix}/activityType`, activityTypeRoute);
router.use(`${prefix}/activityManager`, activityManagerRoute);

router.use(`${prefix}/serviceCompany`, serviceCompanyRoute);

router.use(`${prefix}/locationType`, locationTypeRoute);
router.use(`${prefix}/locationManager`, locationManagerRoute);
router.use(`${prefix}/location`, locationRoute);

//file
router.use(`${prefix}/upload`, fileRoute);

// Export the main router
export default router;
