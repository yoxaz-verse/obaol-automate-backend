const enabled = (value: unknown) => String(value || "").trim().toLowerCase() === "true";

export const featureFlags = {
  associateWhatsappIntegration: enabled(process.env.ASSOCIATE_WHATSAPP_ENABLED),
};
