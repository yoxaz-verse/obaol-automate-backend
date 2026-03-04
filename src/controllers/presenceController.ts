import { Request, Response } from "express";
import { AssociateModel } from "../database/models/associate";
import { EmployeeModel } from "../database/models/employee";

export class PresenceController {
  static async ping(req: Request, res: Response) {
    try {
      const user = (req as any)?.user;
      if (!user?.id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const roleLower = String(user.role || "").toLowerCase();
      const now = new Date();
      const updateDoc = {
        $set: {
          lastSeenAt: now,
          presenceUpdatedAt: now,
          presenceSource: "HEARTBEAT",
        },
      };

      if (roleLower === "associate") {
        await AssociateModel.updateOne({ _id: user.id }, updateDoc);
      } else if (roleLower === "employee" || roleLower === "team") {
        await EmployeeModel.updateOne({ _id: user.id }, updateDoc);
      }

      return res.status(200).json({
        success: true,
        data: { lastSeenAt: now.toISOString() },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to update presence",
      });
    }
  }
}

