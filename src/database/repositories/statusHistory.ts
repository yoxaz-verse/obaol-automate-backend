import { StatusHistoryModel, IStatusHistory } from "../models/statusHistory";
import mongoose from "mongoose";

class StatusHistoryRepository {
  // ✅ Create a new status history record
  public async createStatusHistory(
    entityId: string,
    entityType: "Location" | "Activity" | "Project",
    changedBy: string,
    changedRole:
      | "Admin"
      | "ProjectManager"
      | "ActivityManager"
      | "Worker"
      | "Customer",
    previousStatus: string | null,
    newStatus: string,
    changedFields: { field: string; oldValue: any; newValue: any }[],
    changeType: string // e.g., "Location Updated"
  ): Promise<IStatusHistory> {
    try {
      const statusHistory = new StatusHistoryModel({
        entityId: new mongoose.Types.ObjectId(entityId),
        entityType,
        changedBy: new mongoose.Types.ObjectId(changedBy),
        changedRole,
        previousStatus,
        newStatus,
        changedFields,
        changeType,
      });

      return await statusHistory.save();
    } catch (error) {
      console.error("Error logging status history:", error);
      throw error;
    }
  }

  // ✅ Fetch status history for a given entity
  // ✅ Fetch status history for an entity with optional filters
  public async getStatusHistory(
    entityId: string,
    entityType: "Location" | "Activity" | "Project",
    filters: { startDate?: string; endDate?: string; changeType?: string }
  ) {
    try {
      const query: any = {
        entityId: new mongoose.Types.ObjectId(entityId), // Ensure ObjectId
        entityType,
      };

      // ✅ Filter by Date Range (if provided)
      if (filters.startDate || filters.endDate) {
        query.changedAt = {};
        if (filters.startDate) {
          query.changedAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.changedAt.$lte = new Date(filters.endDate);
        }
      }

      // ✅ Filter by Change Type (if provided)
      if (filters.changeType) {
        query.changeType = filters.changeType;
      }

      return await StatusHistoryModel.find(query)
        .populate("changedBy", "name") // Populate user info
        .sort({ changedAt: -1 });
    } catch (error) {
      console.error("Error fetching status history:", error);
      throw error;
    }
  }
}

export default StatusHistoryRepository;
