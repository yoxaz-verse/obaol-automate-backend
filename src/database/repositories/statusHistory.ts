import { StatusHistoryModel, IStatusHistory } from "../models/statusHistory";
import mongoose from "mongoose";

class StatusHistoryRepository {
  /**
   * ✅ Create a new status history entry
   */
  public async createStatusHistory(
    entityId: string,
    entityType: "Location" | "Activity" | "Project",
    changedById: string, // ✅ Store only user ID
    changedRole: string,
    previousStatus: string | null,
    newStatus: string,
    changedFields: { field: string; oldValue: any; newValue: any }[],
    changeType: string
  ): Promise<IStatusHistory> {
    try {
      return await StatusHistoryModel.create({
        entityId: new mongoose.Types.ObjectId(entityId),
        entityType,
        changedBy: new mongoose.Types.ObjectId(changedById), // ✅ Store ID
        changedRole,
        previousStatus,
        newStatus,
        changedFields,
        changeType,
      });
    } catch (error) {
      console.error("Error logging status history:", error);
      throw error;
    }
  }

  /**
   * ✅ Fetch status history for a given entity with filters
   */
  public async getStatusHistory(
    entityId: string,
    entityType: "Location" | "Activity" | "Project",
    filters: { startDate?: string; endDate?: string; changeType?: string }
  ) {
    try {
      const query: any = {
        entityId: new mongoose.Types.ObjectId(entityId),
        entityType,
      };

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      if (filters.changeType) {
        query.changeType = filters.changeType;
      }

      return await StatusHistoryModel.find(query)
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      console.error("Error fetching status history:", error);
      throw error;
    }
  }
}

export default StatusHistoryRepository;
