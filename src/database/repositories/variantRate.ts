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
      variantRates = variantRates
        .map((vr) => {
          const userRole = req.user?.role;
          const userId = req.user?.id;
          const associateId = vr.associate?._id.toString(); // Assuming associate is ObjectId
          console.log(userRole);
          console.log(userId);
          console.log(associateId);

          const isNotOwnerAssociate =
            !req.user || (userRole === "Associate" && userId !== associateId);

          if (userRole !== "Admin" && isNotOwnerAssociate) {
            if (!vr.isLive) return null; // 🔥 Remove this rate — not live + not owner/admin
            vr.rate = (vr.rate || 0) + (vr.commission || 0);
            delete vr.commission;
          }

          return vr;
        })
        .filter((vr) => vr !== null); // 🧹 Clean the list from removed ones

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
      const existingRate = await VariantRateModel.findById(id);

      if (!existingRate) {
        throw new Error("Variant rate not found");
      }

      const now = new Date();
      const lastEditTime = existingRate.lastEditTime || existingRate.createdAt;
      const cooldownStart = existingRate.coolingStartTime;

      const durationMs = (existingRate.duration ?? 0) * 60 * 1000;
      const cooldownMs = 15 * 60 * 1000;

      const nextAllowedEditTime = new Date(
        lastEditTime!.getTime() + durationMs
      );
      const cooldownEndTime = cooldownStart
        ? new Date(cooldownStart.getTime() + cooldownMs)
        : null;

      const isCooldownActive = cooldownEndTime && now < cooldownEndTime;
      const isDurationLocked = now < nextAllowedEditTime;

      if (isDurationLocked || isCooldownActive) {
        // 🧠 Create a draft instead
        const draft = await VariantRateModel.create({
          ...existingRate.toObject(),
          ...variantRateData,
          _id: undefined, // Let MongoDB create new ID
          isLive: false,
          hiddenDraftOf: existingRate._id,
          lastEditTime: now,
          coolingStartTime: now,
        });

        return draft.toObject() as IVariantRate;
      } else {
        // 🛠 Update the live rate
        const updated = await VariantRateModel.findByIdAndUpdate(
          id,
          {
            ...variantRateData,
            lastEditTime: now,
            coolingStartTime: now,
          },
          { new: true }
        ).populate("productVariant associate");

        if (!updated) throw new Error("Failed to update variant rate");

        return updated.toObject() as IVariantRate;
      }
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
