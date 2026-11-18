// src/config/validateEnv.ts

import logger from "../utils/logger";
import Joi from "joi";

const envSchema = Joi.object({
  PORT: Joi.number().default(5000),
  MONGODB_URI: Joi.string().uri().required(),
  UPLOAD_DIR: Joi.string().default("uploads"),
  AWS_REGION: Joi.string().allow("").optional(),
  AWS_S3_BUCKET: Joi.string().allow("").optional(),
  AWS_S3_PREFIX: Joi.string().allow("").optional(),
  AWS_S3_SSE: Joi.string().valid("BUCKET_DEFAULT", "NONE", "AES256", "aws:kms").default("BUCKET_DEFAULT"),
  AWS_S3_KMS_KEY_ID: Joi.string().allow("").optional(),
  AWS_S3_ENDPOINT: Joi.string().uri().allow("").optional(),
  AWS_S3_FORCE_PATH_STYLE: Joi.alternatives().try(Joi.boolean(), Joi.string().valid("true", "false")).optional(),
  BASE_URL: Joi.string().uri().required(),
  FRONTEND_URL: Joi.string().uri().when("NODE_ENV", {
    is: "production",
    then: Joi.string().uri({ scheme: ["https"] }).custom((value, helpers) => {
      const host = new URL(value).hostname.toLowerCase();
      return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)
        ? helpers.error("any.invalid")
        : value;
    }).required(),
    otherwise: Joi.optional(),
  }),
  JWT_SECRET: Joi.string().min(6).required(),
  REDIS_URL: Joi.string().uri().allow("").optional(),
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
