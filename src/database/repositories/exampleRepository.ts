import { Request } from "express";
import { IExampleInterface } from "../../interfaces/exampleInterface";
import { IPagination } from "../../interfaces/pagination";
import { logError } from "../../utils/errorLogger";
import Example from "../models/exampleModel";

class ExampleRepository {
  public async getExamples(
    req: Request,
    pagination: IPagination
  ): Promise<{
    examples: IExampleInterface[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      const examples = await Example.find()
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await Example.countDocuments();
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return { examples, totalCount, currentPage: pagination.page,totalPages:totalPages };
    } catch (error) {
      await logError(error, req, "Repository-getExamples");
      throw new Error("Example retrieval failed");
    }
  }

  public async createExample(
    req: Request,
    example: IExampleInterface
  ): Promise<IExampleInterface> {
    try {
      const newExample = new Example(example);
      return await newExample.save();
    } catch (error) {
      await logError(error, req, "Repository-createExample");
      throw new Error("Example creation failed");
    }
  }

  public async updateExample(
    req: Request,
    id: string,
    example: Partial<IExampleInterface>
  ): Promise<IExampleInterface | null> {
    try {
      return await Example.findByIdAndUpdate(
        id,
        { $set: example },
        { new: true }
      );
    } catch (error) {
      await logError(error, req, "Repository-updateExample");
      throw new Error("Example update failed");
    }
  }

  public async deleteExample(
    req: Request,
    id: string
  ): Promise<IExampleInterface | null> {
    try {
      return await Example.findByIdAndDelete(id);
    } catch (error) {
      await logError(error, req, "Repository-deleteExample");
      throw new Error("Example deletion failed");
    }
  }

  public async findExampleById(
    req: Request,
    id: string
  ): Promise<IExampleInterface | null> {
    try {
      return await Example.findById(id);
    } catch (error) {
      await logError(error, req, "Repository-findExampleById");
      throw new Error("Example retrieval failed");
    }
  }
}

export default ExampleRepository;
