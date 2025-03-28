import { Request, Response } from "express";
import { logError } from "../utils/errorLogger";
import ProductRepository from "../database/repositories/product";
import { IPagination } from "../interfaces/pagination";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  public async getProducts(req: Request, res: Response) {
    try {
      const pagination: IPagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const { page, limit, ...filters } = req.query;
      const dynamicQuery = buildDynamicQuery(filters); // Build dynamic query using filters

      const products = await this.productRepository.getProducts(
        req,
        pagination,
        dynamicQuery
      );
      res.json({ data: products, message: "Products retrieved successfully" });
    } catch (error) {
      logError(error, req, "ProductService-getProducts");
      res.status(500).json({ error: "Products retrieval failed" });
    }
  }

  public async getProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await this.productRepository.getProductById(req, id);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json({ data: product, message: "Product retrieved successfully" });
    } catch (error) {
      logError(error, req, "ProductService-getProduct");
      res.status(500).json({ error: "Product retrieval failed" });
    }
  }

  public async createProduct(req: Request, res: Response) {
    try {
      const productData = req.body;
      const newProduct = await this.productRepository.createProduct(
        req,
        productData
      );
      res
        .status(201)
        .json({ data: newProduct, message: "Product created successfully" });
    } catch (error) {
      logError(error, req, "ProductService-createProduct");
      res.status(500).json({ error: "Product creation failed" });
    }
  }

  public async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const productData = req.body;
      const updatedProduct = await this.productRepository.updateProduct(
        req,
        id,
        productData
      );
      if (!updatedProduct) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json({
        data: updatedProduct,
        message: "Product updated successfully",
      });
    } catch (error) {
      logError(error, req, "ProductService-updateProduct");
      res.status(500).json({ error: "Product update failed" });
    }
  }

  public async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedProduct = await this.productRepository.deleteProduct(
        req,
        id
      );
      if (!deletedProduct) {
        res.status(404).json({ error: "Product not found or already deleted" });
        return;
      }
      res.json({
        data: deletedProduct,
        message: "Product deleted successfully",
      });
    } catch (error) {
      logError(error, req, "ProductService-deleteProduct");
      res.status(500).json({ error: "Product deletion failed" });
    }
  }
}

export default ProductService;
