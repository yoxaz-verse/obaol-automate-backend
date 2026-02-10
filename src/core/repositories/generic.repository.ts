import { Document } from "mongoose";
import { MongoRepository } from "./mongo.repository";

export class GenericRepository<T extends Document> extends MongoRepository<T> {
    // Concrete implementation of the abstract MongoRepository
    // No additional logic needed if MongoRepository covers all CRUD
}
