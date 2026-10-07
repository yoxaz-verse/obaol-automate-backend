import { Request, Response } from "express";
import { AssociateModel } from "../database/models/associate";
import { OperatorModel } from "../database/models/operator";
import { AdminModel } from "../database/models/admin";
import { InventoryManagerModel } from "../database/models/inventoryManager";

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
      } else if (roleLower === "operator" || roleLower === "team") {
        await OperatorModel.updateOne({ _id: user.id }, updateDoc);
      } else if (roleLower === "admin") {
        await AdminModel.updateOne({ _id: user.id }, updateDoc);
      } else if (roleLower === "inventorymanager" || roleLower === "inventory-manager") {
        await InventoryManagerModel.updateOne({ _id: user.id }, updateDoc);
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
