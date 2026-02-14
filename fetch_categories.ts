import mongoose from "mongoose";
import dotenv from "dotenv";
import { CategoryModel } from "./src/database/models/category";

dotenv.config();

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI is not defined");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");
        const categories = await CategoryModel.find({});
        console.log(JSON.stringify(categories, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

run();
