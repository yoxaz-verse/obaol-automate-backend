import { Router } from "express";
import TimesheetService from "../services/timesheet";
import TimesheetMiddleware from "../middlewares/timesheet";

const timesheetroute = Router();
const timesheetService = new TimesheetService();
const timesheetMiddleware = new TimesheetMiddleware();

timesheetroute.get(
  "/",
  timesheetService.getTimesheets.bind(timesheetService)
);
timesheetroute.get(
  "/:id",
  timesheetMiddleware.getTimesheet.bind(timesheetMiddleware),
  timesheetService.getTimesheet.bind(timesheetService)
);
timesheetroute.post(
  "/",
  timesheetMiddleware.createTimesheet.bind(timesheetMiddleware),
  timesheetService.createTimesheet.bind(timesheetService)
);
timesheetroute.patch(
  "/:id",
  timesheetMiddleware.updateTimesheet.bind(timesheetMiddleware),
  timesheetService.updateTimesheet.bind(timesheetService)
);
timesheetroute.delete(
  "/:id",
  timesheetMiddleware.deleteTimesheet.bind(timesheetMiddleware),
  timesheetService.deleteTimesheet.bind(timesheetService)
);

export default timesheetroute;
