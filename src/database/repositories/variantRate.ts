import { Request } from "express";
import { VariantRateModel } from "../models/variantRate"; // Ensure correct path
import {
  ICreateVariantRate,
  IUpdateVariantRate,
  IVariantRate,
} from "../../interfaces/variantRate"; // Ensure correct path
import { logError } from "../../utils/errorLogger";
import { IPagination } from "@interfaces/pagination";

class VariantRateRepository {
  public async getVariantRates(
    req: Request,
    pagination: IPagination,
    query: any
  ): Promise<{
    data: IVariantRate[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      const variantRatesDoc = await VariantRateModel.find(query)
        .populate({
          path: "productVariant",
          populate: { path: "product", select: "name" },
          select: "name product",
        })
        .populate("associate associateCompany")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      // Convert to plain objects
      let variantRates = variantRatesDoc.map(
        (doc) => doc.toObject() as IVariantRate
      );

      // Adjust the rate if user is NOT Admin and also NOT the associate
      variantRates = variantRates.map((vr) => {
        const userRole = req.user?.role;
        const userId = req.user?.id; // or req.user?._id, depending on your setup
        const associateId = vr.associate?._id?.toString();
        // If 'associate' was populated, vr.associate is an object. We can do ._id.

        // Check if user is Admin or is the Associate for this VariantRate
        if (userRole !== "Admin") {
          if (
            req.user === undefined ||
            (userRole === "Associate" && userId !== associateId)
          )
            vr.rate = (vr.rate || 0) + (vr.commission || 0);
          // Add up the commission into the rate
          delete vr.commission;
        }
        return vr;
      });
      const totalCount = await VariantRateModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: variantRates,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "VariantRateRepository-getVariantRates");
      throw error;
    }
  }

  public async getVariantRateById(
    req: Request,
    id: string
  ): Promise<IVariantRate> {
    try {
      const variantRate = await VariantRateModel.findById(id).populate(
        "productVariant associateName"
      );

      if (!variantRate) {
        throw new Error("Variant rate not found");
      }

      return variantRate.toObject() as IVariantRate;
    } catch (error) {
      await logError(error, req, "VariantRateRepository-getVariantRateById");
      throw error;
    }
  }

  public async createVariantRate(
    req: Request,
    variantRateData: ICreateVariantRate
  ): Promise<IVariantRate> {
    try {
      const newVariantRate = await VariantRateModel.create(variantRateData);
      return newVariantRate.toObject() as IVariantRate;
    } catch (error) {
      await logError(error, req, "VariantRateRepository-createVariantRate");
      throw error;
    }
  }

  public async updateVariantRate(
    req: Request,
    id: string,
    variantRateData: Partial<IUpdateVariantRate>
  ): Promise<IVariantRate> {
    try {
      const updatedVariantRate = await VariantRateModel.findByIdAndUpdate(
        id,
        variantRateData,
        { new: true }
      ).populate("productVariant associate");
      if (!updatedVariantRate) {
        throw new Error("Failed to update variant rate");
      }
      return updatedVariantRate.toObject() as IVariantRate;
    } catch (error) {
      await logError(error, req, "VariantRateRepository-updateVariantRate");
      throw error;
    }
  }

  public async deleteVariantRate(
    req: Request,
    id: string
  ): Promise<IVariantRate> {
    try {
      const deletedVariantRate = await VariantRateModel.findByIdAndDelete(id);
      if (!deletedVariantRate) {
        throw new Error("Failed to delete variant rate");
      }
      return deletedVariantRate.toObject() as IVariantRate;
    } catch (error) {
      await logError(error, req, "VariantRateRepository-deleteVariantRate");
      throw error;
    }
  }
}

export default VariantRateRepository;
