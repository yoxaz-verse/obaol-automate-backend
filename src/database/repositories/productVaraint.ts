import { ProductVariantModel } from "../models/productVariant";
import { IPagination } from "../../interfaces/pagination";
import {
  ICreateProductVariant,
  IProductVariant,
  IUpdateProductVariant,
} from "../../interfaces/productVariant";
import { logError } from "../../utils/errorLogger";
import { Request } from "express";

class ProductVariantRepository {
  public async getProductVariants(
    req: Request,
    pagination: IPagination,
    query: any
  ): Promise<{
    data: IProductVariant[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const productVariantsDoc = await ProductVariantModel.find(query)
        .populate("product")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const productVariants = productVariantsDoc.map(
        (doc) => doc.toObject() as any
      );

      const totalCount = await ProductVariantModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: productVariants,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ProductVariantRepository-getProductVariants");
      throw error;
    }
  }

  public async getProductVariantById(
    req: Request,
    id: string
  ): Promise<IProductVariant> {
    try {
      const productVariantDoc = await ProductVariantModel.findById(id).populate(
        "product"
      );

      if (!productVariantDoc) {
        throw new Error("Product variant not found");
      }

      return productVariantDoc.toObject() as IProductVariant;
    } catch (error) {
      await logError(
        error,
        req,
        "ProductVariantRepository-getProductVariantById"
      );
      throw error;
    }
  }

  public async createProductVariant(
    req: Request,
    variantData: ICreateProductVariant
  ): Promise<IProductVariant> {
    try {
      const newProductVariant = await ProductVariantModel.create(variantData);
      return newProductVariant.toObject() as IProductVariant;
    } catch (error) {
      await logError(
        error,
        req,
        "ProductVariantRepository-createProductVariant"
      );
      throw error;
    }
  }

  public async updateProductVariant(
    req: Request,
    id: string,
    variantData: Partial<IUpdateProductVariant>
  ): Promise<IProductVariant> {
    try {
      const updatedProductVariant = await ProductVariantModel.findByIdAndUpdate(
        id,
        variantData,
        { new: true }
      ).populate("product");
      if (!updatedProductVariant) {
        throw new Error("Failed to update product variant");
      }
      return updatedProductVariant.toObject() as IProductVariant;
    } catch (error) {
      await logError(
        error,
        req,
        "ProductVariantRepository-updateProductVariant"
      );
      throw error;
    }
  }

  public async deleteProductVariant(
    req: Request,
    id: string
  ): Promise<IProductVariant> {
    try {
      const deletedProductVariant = await ProductVariantModel.findByIdAndDelete(
        id
      );
      if (!deletedProductVariant) {
        throw new Error("Failed to delete product variant");
      }
      return deletedProductVariant.toObject() as IProductVariant;
    } catch (error) {
      await logError(
        error,
        req,
        "ProductVariantRepository-deleteProductVariant"
      );
      throw error;
    }
  }
}

export default ProductVariantRepository;
