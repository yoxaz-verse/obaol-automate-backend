import { Request } from "express";
import { CustomerModel } from "../models/customer";
import {
  ICustomer,
  ICreateCustomer,
  IUpdateCustomer,
} from "../../interfaces/customer";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class CustomerRepository {
  public async getCustomers(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ICustomer[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = { isDeleted: false };
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const customersDoc = await CustomerModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const customers = customersDoc.map((doc) => doc.toObject() as ICustomer);

      const totalCount = await CustomerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: customers,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "CustomerRepository-getCustomers");
      throw error;
    }
  }

  public async getCustomerById(req: Request, id: string): Promise<ICustomer> {
    try {
      const customerDoc = await CustomerModel.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!customerDoc) {
        throw new Error("Customer not found");
      }

      const customer = customerDoc.toObject() as ICustomer;

      return customer;
    } catch (error) {
      await logError(error, req, "CustomerRepository-getCustomerById");
      throw error;
    }
  }

  public async createCustomer(
    req: Request,
    customerData: ICreateCustomer
  ): Promise<ICustomer> {
    try {
      const newCustomer = await CustomerModel.create(customerData);
      return newCustomer.toObject();
    } catch (error) {
      await logError(error, req, "CustomerRepository-createCustomer");
      throw error;
    }
  }

  public async updateCustomer(
    req: Request,
    id: string,
    customerData: Partial<IUpdateCustomer>
  ): Promise<ICustomer> {
    try {
      const updatedCustomer = await CustomerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        customerData,
        { new: true }
      );
      if (!updatedCustomer) {
        throw new Error("Failed to update customer");
      }
      return updatedCustomer.toObject();
    } catch (error) {
      await logError(error, req, "CustomerRepository-updateCustomer");
      throw error;
    }
  }

  public async deleteCustomer(req: Request, id: string): Promise<ICustomer> {
    try {
      const deletedCustomer = await CustomerModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      );
      if (!deletedCustomer) {
        throw new Error("Failed to delete customer");
      }
      return deletedCustomer.toObject();
    } catch (error) {
      await logError(error, req, "CustomerRepository-deleteCustomer");
      throw error;
    }
  }
}

export default CustomerRepository;
