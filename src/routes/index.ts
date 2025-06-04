import { Router } from "express";

import customerRoute from "./customerRoute";
import adminRoute from "./adminRoute";

import timeSheetRoute from "./timesheetRoute";

import activityStatusRoute from "./activityStatusRoute";
import activityTypeRoute from "./activityTypeRoute";
import activityFileRoute from "./activityFileRoute";
import activityRoute from "./activityRoute";
import projectTypeRoute from "./projectTypeRoute";
import projectRoute from "./projectRoute";
import projectStatusRoute from "./projectStatusRoute";
import locationTypeRoute from "./locationTypeRoute";
import locationRoute from "./locationRoute";
import locationManagerRoute from "./locationManagerRoute";
import authRoute from "./authRoute";
import verifyTokenRoute from "./verifyTokenRoute";
import inventoryManagerRoute from "./inventoryManagerRoute";
import projectManagerRoute from "./projectManagerRoute";
import statusHistoryRoute from "./statusHistoryRoute";

import associateRoute from "./associateRoute";
import associateCompanyRoute from "./associateCompanyRoute";

import categoryRoute from "./categoryRoute";
import subCategoryRoute from "./subCategoryRoute";

import productRoute from "./productRoute";
import productVariantRoute from "./productVariantRoute";
import variantRateRoute from "./variantRateRoute";
import displayedRateRoute from "./displayedRateRoute";

import enquiryRoute from "./enquiryRoute";
import quantityUnitRoute from "./quantityUnitRoute";
import verificationRoutes from "./verificationRoutes";
import rateAttachmentRoute from "./rateAttachmentRoute";

import abbreviationRoute from "./abbreviationRoute";
import cityRoute from "./cityRoute";
import stateRoute from "./stateRoute";
import districtRoute from "./districtRoute";

// Initialize the main router
const router = Router();
const version = "v1";
const webRoute = "web";
export const prefix = `/${version}/${webRoute}`;

//Auth
router.use(`${prefix}/login`, authRoute);
router.use(`${prefix}/verify-token`, verifyTokenRoute);
router.use(`${prefix}/verification`, verificationRoutes);

// Users
router.use(`${prefix}/admin`, adminRoute);
router.use(`${prefix}/customer`, customerRoute);
router.use(`${prefix}/associate`, associateRoute);

router.use(`${prefix}/timeSheet`, timeSheetRoute);

router.use(`${prefix}/projects`, projectRoute);
router.use(`${prefix}/projectType`, projectTypeRoute);
router.use(`${prefix}/projectStatus`, projectStatusRoute);
router.use(`${prefix}/projectManager`, projectManagerRoute);

router.use(`${prefix}/activity`, activityRoute);
router.use(`${prefix}/activityFile`, activityFileRoute);
router.use(`${prefix}/activityStatus`, activityStatusRoute);
router.use(`${prefix}/activityType`, activityTypeRoute);
router.use(`${prefix}/inventoryManager`, inventoryManagerRoute);
router.use(`${prefix}/rateAttachment`, rateAttachmentRoute);

router.use(`${prefix}/locationType`, locationTypeRoute);
router.use(`${prefix}/locationManager`, locationManagerRoute);
router.use(`${prefix}/location`, locationRoute);
router.use(`${prefix}/associateCompany`, associateCompanyRoute);

router.use(`${prefix}/category`, categoryRoute);
router.use(`${prefix}/subCategory`, subCategoryRoute);

router.use(`${prefix}/product`, productRoute);
router.use(`${prefix}/productVariant`, productVariantRoute);
router.use(`${prefix}/variantRate`, variantRateRoute);
router.use(`${prefix}/displayedRate`, displayedRateRoute);

router.use(`${prefix}/enquiry`, enquiryRoute);

router.use(`${prefix}/abbreviation`, abbreviationRoute);
router.use(`${prefix}/city`, cityRoute);
router.use(`${prefix}/district`, districtRoute);
router.use(`${prefix}/state`, stateRoute);

// router.use(`${prefix}/variantRate`, variantRateRoute);

//file
// router.use(`${prefix}/upload`, fileRoute);
router.use(`${prefix}/statusHistory`, statusHistoryRoute);

// Export the main router
export default router;
