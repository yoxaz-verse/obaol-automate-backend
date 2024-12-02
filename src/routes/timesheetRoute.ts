import { Router } from "express";
import TimeSheetService from "../services/timeSheet";
import TimesheetMiddleware from "../middlewares/timesheet";
import authenticateToken from "../middlewares/auth";

const router = Router();
const timeSheetService = new TimeSheetService();
const timeSheetMiddleware = new TimesheetMiddleware();

// GET all timeSheet
router.get("/", timeSheetService.getTimeSheets.bind(timeSheetService));

// GET timeSheet by ID
router.get(
  "/:id",
  timeSheetMiddleware.validateGet.bind(timeSheetMiddleware),
  timeSheetService.getTimeSheet.bind(timeSheetService)
);

// CREATE a new timeSheet
router.post(
  "/",
  authenticateToken,
  timeSheetMiddleware.validateCreate.bind(timeSheetMiddleware),
  timeSheetService.createTimeSheet.bind(timeSheetService)
);

// UPDATE a timeSheet
router.patch(
  "/:id",
  timeSheetMiddleware.validateUpdate.bind(timeSheetMiddleware),
  timeSheetService.updateTimeSheet.bind(timeSheetService)
);

// DELETE a timeSheet
router.delete(
  "/:id",
  timeSheetMiddleware.validateDelete.bind(timeSheetMiddleware),
  timeSheetService.deleteTimeSheet.bind(timeSheetService)
);

export default router;
