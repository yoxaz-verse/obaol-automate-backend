// src/config/validateEnv.ts

import logger from "../utils/logger";
import Joi from "joi";

const envSchema = Joi.object({
  PORT: Joi.number().default(5000),
  MONGODB_URI: Joi.string().uri().required(),
  UPLOAD_DIR: Joi.string().default("uploads"),
  BASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(6).required(),
})
  .unknown()
  .required();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  logger.error("Env Missing : ", {
    error: error.message,
  });
  throw new Error(`Config validation error: ${error.message}`);
}

export default envVars;
