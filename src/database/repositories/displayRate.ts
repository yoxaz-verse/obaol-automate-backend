import { Request } from "express";
// Ensure correct path
import { logError } from "../../utils/errorLogger";
import { IPagination } from "@interfaces/pagination";
import { DisplayedRateModel } from "../models/displayedRate";
import {
  ICreateDisplayedRate,
  IDisplayedRate,
  IUpdateDisplayedRate,
} from "../../interfaces/displayedRate";
import { IVariantRate } from "../../interfaces/variantRate";
import { VariantRateModel } from "../../database/models/variantRate";
import { Types } from "mongoose";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { AssociateModel } from "../../database/models/associate";

class DisplayedRateRepository {
  public async getDisplayedRates(
    req: Request,
    pagination: IPagination,
    query: any
  ): Promise<{
    data: IDisplayedRate[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      // 1) Mongoose find
      const displayedRateDocs = await DisplayedRateModel.find(query)
        .populate({
          path: "variantRate",
          populate: {
            path: "productVariant",
            populate: { path: "product", select: "name" },
            select: "name product",
          },
        })
        .populate("associate")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      // 2) Convert to plain objects
      const displayedRates = displayedRateDocs.map(
        (doc) => doc.toObject() as IDisplayedRate
      );

      // 3) Count total
      const totalCount = await DisplayedRateModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: displayedRates,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "DisplayedRateRepository-getDisplayedRates");
      throw error;
    }
  }
  public async getDisplayedRateById(
    req: Request,
    id: string
  ): Promise<IDisplayedRate> {
    try {
      const displayedRate = await DisplayedRateModel.findById(id).populate(
        "variantRate associate"
      );

      if (!displayedRate) {
        throw new Error("Displayed Rate not found");
      }

      return displayedRate.toObject() as IDisplayedRate;
    } catch (error) {
      await logError(
        error,
        req,
        "DisplayedRateRepository-getDisplayedRateById"
      );
      throw error;
    }
  }

  public async createDisplayedRate(
    req: Request,
    displayedRateData: ICreateDisplayedRate
  ): Promise<IDisplayedRate> {
    try {
      const newDisplayedRate = await DisplayedRateModel.create(
        displayedRateData
      );
      return newDisplayedRate.toObject() as IDisplayedRate;
    } catch (error) {
      await logError(error, req, "DisplayedRateRepository-createDisplayedRate");
      throw error;
    }
  }

  public async updateDisplayedRate(
    req: Request,
    id: string,
    displayedRateData: Partial<IUpdateDisplayedRate>
  ): Promise<IDisplayedRate> {
    try {
      const updatedDisplayedRate = await DisplayedRateModel.findByIdAndUpdate(
        id,
        displayedRateData,
        { new: true }
      ).populate("variantRate associate");
      if (!updatedDisplayedRate) {
        throw new Error("Failed to update Displayed Rate");
      }
      return updatedDisplayedRate.toObject() as IDisplayedRate;
    } catch (error) {
      await logError(error, req, "DisplayedRateRepository-updateDisplayedRate");
      throw error;
    }
  }

  public async deleteDisplayedRate(
    req: Request,
    id: string
  ): Promise<IDisplayedRate> {
    try {
      const deletedDisplayedRate = await DisplayedRateModel.findByIdAndDelete(
        id
      );
      if (!deletedDisplayedRate) {
        throw new Error("Failed to delete Displayed Rate");
      }
      return deletedDisplayedRate.toObject() as IDisplayedRate;
    } catch (error) {
      await logError(error, req, "DisplayedRateRepository-deleteDisplayedRate");
      throw error;
    }
  }
}

export default DisplayedRateRepository;

/** Example normalizer for companyName => underscores->space, lower, trim */
function normalizeCompanyName(input: string): string {
  return input.trim().toLowerCase().replace(/_+/g, " ").replace(/\s+/g, " ");
}

/** Example normalizer for associateName => e.g. also underscores->space, etc. */
function normalizeAssociateName(input: string): string {
  return input.trim().toLowerCase().replace(/_+/g, " ").replace(/\s+/g, " ");
}
