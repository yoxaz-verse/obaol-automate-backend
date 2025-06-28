import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import SubCategoryRepository from "../database/repositories/subCategory";
import { IPagination } from "@interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class SubCategoryService {
  private subCategoryRepository: SubCategoryRepository;

  constructor() {
    this.subCategoryRepository = new SubCategoryRepository();
  }

  public async getSubCategories(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters); // Build dynamic query using filters

      const subCategories = await this.subCategoryRepository.getSubCategories(
        req,
        pagination,
        dynamicQuery
      );

      res.json({
        data: subCategories,
        message: "Products retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "SubCategoryService-getSubCategories");
      res.status(500).send("SubCategories retrieval failed");
    }
  }

  public async getSubCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const subCategory = await this.subCategoryRepository.getSubCategoryById(
        req,
        id
      );
      if (subCategory) {
        res.json(subCategory);
      } else {
        res.status(404).send("SubCategory not found");
      }
    } catch (error) {
      logError(error, req, "SubCategoryService-getSubCategory");
      res.status(500).send("Error retrieving subCategory");
    }
  }

  public async createSubCategory(req: Request, res: Response) {
    try {
      const subCategoryData = req.body;
      const newSubCategory = await this.subCategoryRepository.createSubCategory(
        req,
        subCategoryData
      );
      res.status(201).json({
        data: newSubCategory,
        message: "SubCategory created successfully",
      });
    } catch (error) {
      logError(error, req, "SubCategoryService-createSubCategory");
      res.status(500).send("SubCategory creation failed");
    }
  }

  public async updateSubCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const subCategoryData = req.body;
      const updatedSubCategory =
        await this.subCategoryRepository.updateSubCategory(
          req,
          id,
          subCategoryData
        );
      if (updatedSubCategory) {
        res.json({
          data: updatedSubCategory,
          message: "SubCategory updated successfully",
        });
      } else {
        res.status(404).send("SubCategory not found for update");
      }
    } catch (error) {
      logError(error, req, "SubCategoryService-updateSubCategory");
      res.status(500).send("SubCategory update failed");
    }
  }

  public async deleteSubCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedSubCategory =
        await this.subCategoryRepository.deleteSubCategory(req, id);
      if (deletedSubCategory) {
        res.json({
          data: deletedSubCategory,
          message: "SubCategory deleted successfully",
        });
      } else {
        res.status(404).send("SubCategory not found for deletion");
      }
    } catch (error) {
      logError(error, req, "SubCategoryService-deleteSubCategory");
      res.status(500).send("SubCategory deletion failed");
    }
  }
}

export default SubCategoryService;
