// src/config/validateEnv.ts

import logger from "../utils/logger";
import Joi from "joi";

const envSchema = Joi.object({
  PORT: Joi.number().default(5000),
  MONGODB_URI: Joi.string().uri().required(),
  UPLOAD_DIR: Joi.string().default("uploads"),
  BASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(6).required(),
  SMTP_HOST: Joi.string().hostname().required(),
  SMTP_PORT: Joi.number().port().required(),
  SMTP_SECURE: Joi.alternatives().try(Joi.boolean(), Joi.string().valid("true", "false", "1", "0", "yes", "no")).required(),
  SMTP_AUTH_PASSWORD: Joi.string().min(1).required(),
  SMTP_AUTH_USER: Joi.string().email().required(),
  SMTP_NOTIFY_USER: Joi.string().email().required(),
  SMTP_SUPPORT_USER: Joi.string().email().required(),
  SMTP_AUTH_FROM_NAME: Joi.string().allow("").optional(),
  SMTP_NOTIFY_FROM_NAME: Joi.string().allow("").optional(),
  SMTP_SUPPORT_FROM_NAME: Joi.string().allow("").optional(),
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
