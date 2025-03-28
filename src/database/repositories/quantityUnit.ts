import { Request } from "express";

import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import {
  ICreateQuantityUnit,
  IQuantityUnit,
  IUpdateQuantityUnit,
} from "../../interfaces/quantityUnit";
import { QuantityUnitModel } from "../../database/models/quantityUnit";

class QuantityUnitRepository {
  public async getQuantityUnits(
    req: Request,
    pagination: IPagination,
    query: any
  ): Promise<{
    data: IQuantityUnit[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const quantityUnitDoc = await QuantityUnitModel.find(query)
        .populate("subCategory")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const quantityUnit = quantityUnitDoc.map(
        (doc) => doc.toObject() as IQuantityUnit
      );

      const totalCount = await QuantityUnitModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: quantityUnit,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "QuantityUnitRepository-getQuantityUnit");
      throw error;
    }
  }

  public async getQuantityUnitById(
    req: Request,
    id: string
  ): Promise<IQuantityUnit> {
    try {
      const QuantityUnitDoc = await QuantityUnitModel.findById(id).populate(
        "subCategory"
      );

      if (!QuantityUnitDoc) {
        throw new Error("Product not found");
      }

      return QuantityUnitDoc.toObject() as IQuantityUnit;
    } catch (error) {
      await logError(error, req, "QuantityUnitRepository-getQuantityUnitById");
      throw error;
    }
  }

  public async createQuantityUnit(
    req: Request,
    quantityUnitData: ICreateQuantityUnit
  ): Promise<IQuantityUnit> {
    try {
      const newQuantityUnit = await QuantityUnitModel.create(quantityUnitData);
      return newQuantityUnit.toObject() as IQuantityUnit;
    } catch (error) {
      await logError(error, req, "QuantityUnitRepository-createQuantityUnit");
      throw error;
    }
  }

  public async updateQuantityUnit(
    req: Request,
    id: string,
    quantityUnitData: Partial<IUpdateQuantityUnit>
  ): Promise<IQuantityUnit> {
    try {
      const updatedQuantityUnit = await QuantityUnitModel.findByIdAndUpdate(
        id,
        quantityUnitData,
        {
          new: true,
        }
      ).populate("subCategory");
      if (!updatedQuantityUnit) {
        throw new Error("Failed to update QuantityUnit");
      }
      return updatedQuantityUnit.toObject() as IQuantityUnit;
    } catch (error) {
      await logError(error, req, "QuantityUnitRepository-updateQuantityUnit");
      throw error;
    }
  }

  public async deleteQuantityUnit(
    req: Request,
    id: string
  ): Promise<IQuantityUnit> {
    try {
      const deletedQuantityUnit = await QuantityUnitModel.findByIdAndDelete(id);
      if (!deletedQuantityUnit) {
        throw new Error("Failed to delete QuantityUnit");
      }
      return deletedQuantityUnit.toObject() as IQuantityUnit;
    } catch (error) {
      await logError(error, req, "QuantityUnitRepository-deleteQuantityUnit");
      throw error;
    }
  }
}

export default QuantityUnitRepository;
