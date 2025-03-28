import { Request } from "express";
import { InventoryManagerModel } from "../models/inventoryManager";
import {
  ICreateInventoryManager,
  IUpdateInventoryManager,
} from "../../interfaces/inventoryManager";
import { logError } from "../../utils/errorLogger";
import { IInventoryManager } from "../../interfaces/inventoryManager";
import mongoose from "mongoose";

class InventoryManagerRepository {
  public async getInventoryManagers(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: IInventoryManager[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await InventoryManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const inventoryManagers = await InventoryManagerModel.find(query)
        .populate("admin", "_id name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: inventoryManagers, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(
        error,
        req,
        "InventoryManagerRepository-getInventoryManagers"
      );
      throw error;
    }
  }

  public async getInventoryManagerById(
    req: Request,
    id: string
  ): Promise<IInventoryManager> {
    try {
      const inventoryManagerDoc = await InventoryManagerModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("admin");

      if (!inventoryManagerDoc) {
        throw new Error("InventoryManager not found");
      }

      return inventoryManagerDoc;
    } catch (error) {
      await logError(
        error,
        req,
        "InventoryManagerRepository-getInventoryManagerById"
      );
      throw error;
    }
  }

  public async createInventoryManager(
    req: Request,
    inventoryManagerData: ICreateInventoryManager
  ): Promise<IInventoryManager> {
    try {
      const newInventoryManager = await InventoryManagerModel.create(
        inventoryManagerData
      );
      return newInventoryManager;
    } catch (error) {
      await logError(
        error,
        req,
        "InventoryManagerRepository-createInventoryManager"
      );
      throw error;
    }
  }

  public async updateInventoryManager(
    req: Request,
    id: string,
    inventoryManagerData: Partial<IUpdateInventoryManager>
  ) {
    try {
      const updatedInventoryManager =
        await InventoryManagerModel.findOneAndUpdate(
          { _id: id },
          inventoryManagerData,
          {
            new: true,
          }
        ).populate("admin", "_id name");

      if (!updatedInventoryManager) {
        throw new Error("Failed to update InventoryManager");
      }
      return updatedInventoryManager;
    } catch (error) {
      await logError(
        error,
        req,
        "InventoryManagerRepository-updateInventoryManager"
      );
      throw error;
    }
  }

  public async deleteInventoryManager(
    req: Request,
    id: string
  ): Promise<IInventoryManager> {
    try {
      const deletedInventoryManager =
        await InventoryManagerModel.findOneAndUpdate(
          { _id: id, isDeleted: false },
          { isDeleted: true },
          { new: true }
        ).populate("admin", "name");
      if (!deletedInventoryManager) {
        throw new Error("Failed to delete InventoryManager");
      }
      return deletedInventoryManager;
    } catch (error) {
      await logError(
        error,
        req,
        "InventoryManagerRepository-deleteInventoryManager"
      );
      throw error;
    }
  }
}

export default InventoryManagerRepository;
