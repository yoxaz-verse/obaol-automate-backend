import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import CategoryRepository from "../database/repositories/category";

class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  public async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const categories = await this.categoryRepository.getCategories(
        req,
        pagination,
        search
      );
      res.json({
        data: categories,
        message: "Categories retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "CategoryService-getCategories");
      res
        .status(500)
        .json({ message: "Categories retrieval failed", error: error });
    }
  }

  public async getCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const category = await this.categoryRepository.getCategoryById(req, id);
      if (category) {
        res.json(category);
      } else {
        res.status(404).send("Category not found");
      }
    } catch (error) {
      logError(error, req, "CategoryService-getCategory");
      res.status(500).send("Error retrieving category");
    }
  }

  public async createCategory(req: Request, res: Response) {
    try {
      const categoryData = req.body;
      const newCategory = await this.categoryRepository.createCategory(
        req,
        categoryData
      );
      res.status(201).json({
        data: newCategory,
        message: "Category created successfully",
      });
    } catch (error) {
      logError(error, req, "CategoryService-createCategory");
      res.status(500).send("Category creation failed");
    }
  }

  public async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const categoryData = req.body;
      const updatedCategory = await this.categoryRepository.updateCategory(
        req,
        id,
        categoryData
      );
      if (updatedCategory) {
        res.json({
          data: updatedCategory,
          message: "Category updated successfully",
        });
      } else {
        res.status(404).send("Category not found for update");
      }
    } catch (error) {
      logError(error, req, "CategoryService-updateCategory");
      res.status(500).send("Category update failed");
    }
  }

  public async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedCategory = await this.categoryRepository.deleteCategory(
        req,
        id
      );
      if (deletedCategory) {
        res.json({
          data: deletedCategory,
          message: "Category deleted successfully",
        });
      } else {
        res.status(404).send("Category not found for deletion");
      }
    } catch (error) {
      logError(error, req, "CategoryService-deleteCategory");
      res.status(500).send("Category deletion failed");
    }
  }
}

export default CategoryService;
