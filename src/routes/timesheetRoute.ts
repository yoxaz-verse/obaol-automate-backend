import { Router } from "express";
import TimesheetService from "../services/timeSheetRoute";
import TimesheetMiddleware from "../middlewares/timesheet";

const router = Router();
const timesheetService = new TimesheetService();
const timesheetMiddleware = new TimesheetMiddleware();

// GET all timesheets
router.get("/", timesheetService.getTimesheets.bind(timesheetService));

// GET timesheet by ID
router.get(
  "/:id",
  timesheetMiddleware.validateGet.bind(timesheetMiddleware),
  timesheetService.getTimesheet.bind(timesheetService)
);

// CREATE a new timesheet
router.post(
  "/",
  timesheetMiddleware.validateCreate.bind(timesheetMiddleware),
  timesheetService.createTimesheet.bind(timesheetService)
);

// UPDATE a timesheet
router.patch(
  "/:id",
  timesheetMiddleware.validateUpdate.bind(timesheetMiddleware),
  timesheetService.updateTimesheet.bind(timesheetService)
);

// DELETE a timesheet
router.delete(
  "/:id",
  timesheetMiddleware.validateDelete.bind(timesheetMiddleware),
  timesheetService.deleteTimesheet.bind(timesheetService)
);

export default router;
