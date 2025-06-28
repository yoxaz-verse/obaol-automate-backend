import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import ProductVariantRepository from "../database/repositories/productVaraint";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";
import { IPagination } from "../interfaces/pagination";

class ProductVariantService {
  private productVariantRepository: ProductVariantRepository;

  constructor() {
    this.productVariantRepository = new ProductVariantRepository();
  }

  public async getProductVariants(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters); // Build dynamic query using filters
      const result = await this.productVariantRepository.getProductVariants(
        req,
        pagination,
        dynamicQuery
      );
      res.json({ data: result, message: "Products retrieved successfully" });
    } catch (error) {
      logError(error, req, "ProductVariantService-getProductVariants");
      res.status(500).send("Product Variants retrieval failed");
    }
  }

  public async getProductVariant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const productVariant =
        await this.productVariantRepository.getProductVariantById(req, id);
      if (!productVariant) {
        res.status(404).send("Product Variant not found");
        return;
      }
      res.json(productVariant);
    } catch (error) {
      logError(error, req, "ProductVariantService-getProductVariant");
      res.status(500).send("Product Variant retrieval failed");
    }
  }

  public async createProductVariant(req: Request, res: Response) {
    try {
      const variantData = req.body;
      const newProductVariant =
        await this.productVariantRepository.createProductVariant(
          req,
          variantData
        );
      res.status(201).json({
        data: newProductVariant,
        message: "Product Variant created successfully",
      });
    } catch (error) {
      logError(error, req, "ProductVariantService-createProductVariant");
      res.status(500).send("Product Variant creation failed");
    }
  }

  public async updateProductVariant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const variantData = req.body;
      const updatedProductVariant =
        await this.productVariantRepository.updateProductVariant(
          req,
          id,
          variantData
        );
      if (!updatedProductVariant) {
        res.status(404).send("Product Variant not found or no changes made");
        return;
      }
      res.json({
        data: updatedProductVariant,
        message: "Product Variant updated successfully",
      });
    } catch (error) {
      logError(error, req, "ProductVariantService-updateProductVariant");
      res.status(500).send("Product Variant update failed");
    }
  }

  public async deleteProductVariant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProductVariant =
        await this.productVariantRepository.deleteProductVariant(req, id);
      if (!deletedProductVariant) {
        res.status(404).send("Product Variant not found or already deleted");
        return;
      }
      res.json({
        data: deletedProductVariant,
        message: "Product Variant deleted successfully",
      });
    } catch (error) {
      logError(error, req, "ProductVariantService-deleteProductVariant");
      res.status(500).send("Product Variant deletion failed");
    }
  }
}

export default ProductVariantService;
