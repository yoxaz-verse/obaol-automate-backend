import { Request } from "express";
import { ProductModel } from "../models/product";
import {
  ICreateProduct,
  IUpdateProduct,
  IProduct,
} from "../../interfaces/product";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ProductRepository {
  public async getProducts(
    req: Request,
    pagination: IPagination,
    query: any
  ): Promise<{
    data: IProduct[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const productsDoc = await ProductModel.find(query)
        .populate("subCategory")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const products = productsDoc.map((doc) => doc.toObject() as IProduct);

      const totalCount = await ProductModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: products,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ProductRepository-getProducts");
      throw error;
    }
  }

  public async getProductById(req: Request, id: string): Promise<IProduct> {
    try {
      const productDoc = await ProductModel.findById(id).populate(
        "subCategory"
      );

      if (!productDoc) {
        throw new Error("Product not found");
      }

      return productDoc.toObject() as IProduct;
    } catch (error) {
      await logError(error, req, "ProductRepository-getProductById");
      throw error;
    }
  }

  public async createProduct(
    req: Request,
    productData: ICreateProduct
  ): Promise<IProduct> {
    try {
      const newProduct = await ProductModel.create(productData);
      return newProduct.toObject() as IProduct;
    } catch (error) {
      await logError(error, req, "ProductRepository-createProduct");
      throw error;
    }
  }

  public async updateProduct(
    req: Request,
    id: string,
    productData: Partial<IUpdateProduct>
  ): Promise<IProduct> {
    try {
      const updatedProduct = await ProductModel.findByIdAndUpdate(
        id,
        productData,
        {
          new: true,
        }
      ).populate("subCategory");
      if (!updatedProduct) {
        throw new Error("Failed to update product");
      }
      return updatedProduct.toObject() as IProduct;
    } catch (error) {
      await logError(error, req, "ProductRepository-updateProduct");
      throw error;
    }
  }

  public async deleteProduct(req: Request, id: string): Promise<IProduct> {
    try {
      const deletedProduct = await ProductModel.findByIdAndDelete(id);
      if (!deletedProduct) {
        throw new Error("Failed to delete product");
      }
      return deletedProduct.toObject() as IProduct;
    } catch (error) {
      await logError(error, req, "ProductRepository-deleteProduct");
      throw error;
    }
  }
}

export default ProductRepository;
