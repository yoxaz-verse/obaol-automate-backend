import { Request, Response } from "express";
import StatusHistoryRepository from "../database/repositories/statusHistory";
import { logError } from "../utils/errorLogger";
import { AdminModel } from "./../database/models/admin";
import { ProjectManagerModel } from "./../database/models/projectManager";
import { ActivityManagerModel } from "./../database/models/activityManager";
import { WorkerModel } from "./../database/models/worker";
import { CustomerModel } from "./../database/models/customer";

class StatusHistoryService {
  private statusHistoryRepo: StatusHistoryRepository;

  constructor() {
    this.statusHistoryRepo = new StatusHistoryRepository();
  }

  /**
   * ✅ Log a status change with `changedById` (user ID stored)
   */
  public async logStatusChange(
    entityId: string,
    entityType: "Location" | "Activity" | "Project",
    changedById: string, // ✅ Store user ID instead of name
    changedRole: string,
    previousStatus: string | null,
    newStatus: string,
    changedFields: { field: string; oldValue: any; newValue: any }[],
    action: "Created" | "Updated" | "Deleted"
  ) {
    try {
      const changeType = `${entityType} ${action}`;

      await this.statusHistoryRepo.createStatusHistory(
        entityId,
        entityType,
        changedById, // ✅ Store only user ID in DB
        changedRole,
        previousStatus,
        newStatus,
        changedFields,
        changeType
      );
    } catch (error) {
      console.error("Error logging status change:", error);
    }
  }

  /**
   * ✅ Retrieve status history and replace `changedById` with `changedBy.name`
   */
  public async getStatusHistory(req: Request, res: Response) {
    try {
      const { entityId, entityType, startDate, endDate, changeType } =
        req.query;

      if (!entityId || !entityType) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      if (!["Location", "Activity", "Project"].includes(entityType as string)) {
        return res.status(400).json({ message: "Invalid entityType" });
      }

      // Fetch status history
      const history = await this.statusHistoryRepo.getStatusHistory(
        entityId as string,
        entityType as "Location" | "Activity" | "Project",
        {
          startDate: startDate as string,
          endDate: endDate as string,
          changeType: changeType as string,
        }
      );

      // 🔹 Replace `changedById` with `changedBy.name`
      const updatedHistory = await Promise.all(
        history.map(async (entry) => {
          let user = null;

          // Determine the correct model based on `changedRole`
          switch (entry.changedRole) {
            case "Admin":
              user = await AdminModel.findById(entry.changedBy).lean();
              break;
            case "ProjectManager":
              user = await ProjectManagerModel.findById(entry.changedBy).lean();
              break;
            case "ActivityManager":
              user = await ActivityManagerModel.findById(
                entry.changedBy
              ).lean();
              break;
            case "Worker":
              user = await WorkerModel.findById(entry.changedBy).lean();
              break;
            case "Customer":
              user = await CustomerModel.findById(entry.changedBy).lean();
              break;
          }

          return {
            ...entry,
            changedBy: user?.name, // ✅ Return name instead of ID
          };
        })
      );

      res.json({
        message: "Status history retrieved successfully",
        data: updatedHistory,
      });
    } catch (error) {
      await logError(error, req, "StatusHistoryService-getStatusHistory");
      res.status(500).json({ message: "Failed to retrieve status history" });
    }
  }

  public async getEntityName(
    model: any,
    id: string | null
  ): Promise<string | null> {
    if (!id) return null;
    const entity = await model.findById(id).select("name").lean();
    return entity ? entity.name : "Unknown";
  }
}

export default StatusHistoryService;
