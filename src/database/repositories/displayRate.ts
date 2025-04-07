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
        .populate("associateCompany")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      // 2) Convert to plain objects
      let displayedRates = displayedRateDocs.map(
        (doc) => doc.toObject() as IDisplayedRate
      );
      displayedRates = displayedRates
        .map((dr) => {
          const userRole = req.user?.role;
          const userId = req.user?.id;
          const associateId = dr.associate?._id?.toString();

          const isVariantRateObject =
            dr.variantRate &&
            typeof dr.variantRate === "object" &&
            "rate" in dr.variantRate;

          if (!isVariantRateObject) return dr;

          const variantRate = dr.variantRate as IVariantRate;

          if (userRole !== "Admin") {
            const isNotOwnerAssociate =
              !req.user || (userRole === "Associate" && userId !== associateId);

            if (isNotOwnerAssociate) {
              variantRate.rate +=
                (dr.commission || 0) + (variantRate.commission || 0);

              if (!variantRate.isLive) return null; // 🔥 Kill this entry only in this condition

              delete dr.commission;
            } else {
              variantRate.rate += variantRate.commission || 0;
            }
          }

          return dr;
        })
        .filter((dr) => dr !== null); // 🚿 Clean up the ones we nuked

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
