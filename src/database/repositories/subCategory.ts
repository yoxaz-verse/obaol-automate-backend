import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { SubCategoryModel } from "../../database/models/subCategory";
import {
  ICreateSubCategory,
  ISubCategory,
  IUpdateSubCategory,
} from "../../interfaces/subCategory";

class SubCategoryRepository {
  public async getSubCategories(
    req: Request,
    pagination: IPagination,
    query: any
  ): Promise<{
    data: ISubCategory[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      const subCategoriesDoc = await SubCategoryModel.find(query)
        .populate("category") // Adjust based on your model relations
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const subCategories = subCategoriesDoc.map(
        (doc) => doc.toObject() as ISubCategory
      );

      const totalCount = await SubCategoryModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: subCategories,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      logError(error, req, "SubCategoryRepository-getSubCategories");
      throw error;
    }
  }

  public async getSubCategoryById(
    req: Request,
    id: string
  ): Promise<ISubCategory> {
    try {
      const subCategoryDoc = await SubCategoryModel.findById(id).populate(
        "category"
      );

      if (!subCategoryDoc) {
        throw new Error("SubCategory not found");
      }

      return subCategoryDoc.toObject() as ISubCategory;
    } catch (error) {
      await logError(error, req, "SubCategoryRepository-getSubCategoryById");
      throw error;
    }
  }

  public async createSubCategory(
    req: Request,
    subCategoryData: ICreateSubCategory
  ): Promise<ISubCategory> {
    try {
      const newSubCategory = await SubCategoryModel.create(subCategoryData);
      return newSubCategory.toObject() as ISubCategory;
    } catch (error) {
      await logError(error, req, "SubCategoryRepository-createSubCategory");
      throw error;
    }
  }

  public async updateSubCategory(
    req: Request,
    id: string,
    subCategoryData: Partial<IUpdateSubCategory>
  ): Promise<ISubCategory> {
    try {
      const updatedSubCategory = await SubCategoryModel.findByIdAndUpdate(
        id,
        subCategoryData,
        { new: true }
      );
      if (!updatedSubCategory) {
        throw new Error("Failed to update subCategory");
      }
      return updatedSubCategory.toObject() as ISubCategory;
    } catch (error) {
      await logError(error, req, "SubCategoryRepository-updateSubCategory");
      throw error;
    }
  }

  public async deleteSubCategory(
    req: Request,
    id: string
  ): Promise<ISubCategory> {
    try {
      const deletedSubCategory = await SubCategoryModel.findByIdAndDelete(id);
      if (!deletedSubCategory) {
        throw new Error("Failed to delete subCategory");
      }
      return deletedSubCategory.toObject() as ISubCategory;
    } catch (error) {
      await logError(error, req, "SubCategoryRepository-deleteSubCategory");
      throw error;
    }
  }
}

export default SubCategoryRepository;
