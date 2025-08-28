import { Router } from "express";

import customerRoute from "./customerRoute";
import adminRoute from "./adminRoute";

import authRoute from "./authRoute";
import verifyTokenRoute from "./verifyTokenRoute";
import inventoryManagerRoute from "./inventoryManagerRoute";
import statusHistoryRoute from "./statusHistoryRoute";

import employeeRoute from "./employeeRoute";
import associateRoute from "./associateRoute";
import associateCompanyRoute from "./associateCompanyRoute";

import categoryRoute from "./categoryRoute";
import subCategoryRoute from "./subCategoryRoute";

import productRoute from "./productRoute";
import productVariantRoute from "./productVariantRoute";
import variantRateRoute from "./variantRateRoute";
import displayedRateRoute from "./displayedRateRoute";

import enquiryRoute from "./enquiryRoute";
import verificationRoutes from "./verificationRoutes";

import abbreviationRoute from "./abbreviationRoute";
import pincodeEntryRoute from "./pincodeEntryRoute";
import stateRoute from "./stateRoute";
import districtRoute from "./districtRoute";
import divisionRoute from "./divisionRoute";

import jobRoleRoute from "./jobRoleRoute";
import jobTypeRoute from "./jobTypeRoute";
import languageRoute from "./languageRoute";
import designationRoute from "./designationRoute";

import enquiryProcessStatusRoute from "./enquiryProcessStatusRoute";
import companyTypeRoute from "./companyTypeRoute";
import unLoCodeRoute from "./unLoCodeRoute";
import unLoCodeFunctionRoute from "./unLoCodeFunctionRoute";
import unLoCodeStatusRoute from "./unLoCodeStatusRoute";
import countryRoute from "./countryRoute";
import {
  calculateCIF,
  calculateDomesticCost,
} from "../controllers/cif.controller";

import certificationRoute from "./certificationRoute";
import companyBusinessModelRoute from "./companyBusinessModelRoute";
import companyStageRoute from "./companyStageRoute";
import generalIntentRoute from "./generalIntentRoute";
import researchedCompanyRoute from "./researchedCompanyRoute";
import subIntentRoute from "./subIntentRoute";
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
router.use(`${prefix}/employee`, employeeRoute);
router.use(`${prefix}/inventoryManager`, inventoryManagerRoute);

// User Essentials
router.use(`${prefix}/designation`, designationRoute);
router.use(`${prefix}/jobRole`, jobRoleRoute);
router.use(`${prefix}/jobType`, jobTypeRoute);
router.use(`${prefix}/language`, languageRoute);

// Company
router.use(`${prefix}/associateCompany`, associateCompanyRoute);
router.use(`${prefix}/researchedCompany`, researchedCompanyRoute);

// Company & Research Essential
router.use(`${prefix}/certification`, certificationRoute);
router.use(`${prefix}/companyBusinessModel`, companyBusinessModelRoute);
router.use(`${prefix}/generalIntent`, generalIntentRoute);
router.use(`${prefix}/subIntent`, subIntentRoute);
router.use(`${prefix}/companyStage`, companyStageRoute);
router.use(`${prefix}/companyType`, companyTypeRoute);

// Catalog
router.use(`${prefix}/category`, categoryRoute);
router.use(`${prefix}/subCategory`, subCategoryRoute);
router.use(`${prefix}/product`, productRoute);
router.use(`${prefix}/productVariant`, productVariantRoute);
router.use(`${prefix}/variantRate`, variantRateRoute);
router.use(`${prefix}/displayedRate`, displayedRateRoute);

// Enquiry
router.use(`${prefix}/enquiry`, enquiryRoute);
router.use(`${prefix}/enquiryProcessStatus`, enquiryProcessStatusRoute);

// Address
router.use(`${prefix}/abbreviation`, abbreviationRoute);
router.use(`${prefix}/pincodeEntry`, pincodeEntryRoute);
router.use(`${prefix}/division`, divisionRoute);
router.use(`${prefix}/district`, districtRoute);
router.use(`${prefix}/state`, stateRoute);

// Logistics
router.post(`${prefix}/cif`, calculateCIF);
router.post(`${prefix}/cif/domestic`, calculateDomesticCost);
router.use(`${prefix}/unLoCodeFunction`, unLoCodeFunctionRoute);
router.use(`${prefix}/unLoCodeStatus`, unLoCodeStatusRoute);
router.use(`${prefix}/country`, countryRoute);
router.use(`${prefix}/unLoCode`, unLoCodeRoute);

// router.use(`${prefix}/variantRate`, variantRateRoute);

//file
// router.use(`${prefix}/upload`, fileRoute);
router.use(`${prefix}/statusHistory`, statusHistoryRoute);

// Export the main router
export default router;
