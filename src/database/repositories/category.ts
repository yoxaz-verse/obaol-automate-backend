import { Request } from "express";

import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { CategoryModel } from "../../database/models/category";
import {
  ICategory,
  ICreateCategory,
  IUpdateCategory,
} from "../../interfaces/category";

class CategoryRepository {
  public async getCategories(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ICategory[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const categoriesDoc = await CategoryModel.find(query)
        .populate("inventoryManager") // Adjust based on your model relations
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const categories = categoriesDoc.map(
        (doc) => doc.toObject() as ICategory
      );

      const totalCount = await CategoryModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: categories,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "CategoryRepository-getCategories");
      throw error;
    }
  }

  public async getCategoryById(req: Request, id: string): Promise<ICategory> {
    try {
      const categoryDoc = await CategoryModel.findById(id).populate(
        "inventoryManager"
      );

      if (!categoryDoc) {
        throw new Error("Category not found");
      }

      return categoryDoc.toObject() as ICategory;
    } catch (error) {
      await logError(error, req, "CategoryRepository-getCategoryById");
      throw error;
    }
  }

  public async createCategory(
    req: Request,
    categoryData: ICreateCategory
  ): Promise<ICategory> {
    try {
      const newCategory = await CategoryModel.create(categoryData);
      return newCategory.toObject() as ICategory;
    } catch (error) {
      await logError(error, req, "CategoryRepository-createCategory");
      throw error;
    }
  }

  public async updateCategory(
    req: Request,
    id: string,
    categoryData: Partial<IUpdateCategory>
  ): Promise<ICategory> {
    try {
      const updatedCategory = await CategoryModel.findByIdAndUpdate(
        id,
        categoryData,
        { new: true }
      );
      if (!updatedCategory) {
        throw new Error("Failed to update category");
      }
      return updatedCategory.toObject() as ICategory;
    } catch (error) {
      await logError(error, req, "CategoryRepository-updateCategory");
      throw error;
    }
  }

  public async deleteCategory(req: Request, id: string): Promise<ICategory> {
    try {
      const deletedCategory = await CategoryModel.findByIdAndDelete(id);
      if (!deletedCategory) {
        throw new Error("Failed to delete category");
      }
      return deletedCategory.toObject() as ICategory;
    } catch (error) {
      await logError(error, req, "CategoryRepository-deleteCategory");
      throw error;
    }
  }
}

export default CategoryRepository;
