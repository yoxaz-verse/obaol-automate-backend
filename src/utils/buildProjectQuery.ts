import { ActivityModel } from "../database/models/activity";
import { Request } from "express";

export const buildProjectQuery = async (req: Request): Promise<any> => {
  if (!req.user?.id && !req.user?.role) return;

  const userId = req.user.id; // Authenticated user ID
  const userRole = req.user.role; // User's role

  let query: any = { isDeleted: false };

  if (userRole === "Admin") {
    return query; // Admins can access all projects
  }

  if (userRole === "ProjectManager") {
    query.projectManager = userId; // Projects managed by the user
  } else if (userRole === "Customer") {
    query.customer = userId; // Projects associated with the customer
  } else if (userRole === "ActivityManager" || userRole === "Worker") {
    // Find activities linked to this role
    const activityQuery: any = {};

    if (userRole === "ActivityManager") {
      activityQuery.activityManager = userId;
    } else if (userRole === "Worker") {
      activityQuery.worker = userId;
    }

    const activities = await ActivityModel.find(activityQuery).select(
      "project"
    );
    const projectIds = activities.map((activity) => activity.project);
    query._id = { $in: projectIds }; // Filter by project IDs
  }

  return query;
};
