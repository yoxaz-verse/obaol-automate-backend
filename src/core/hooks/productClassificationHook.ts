import { HookFunction } from "../types";

const toBool = (value: any): boolean => value === true || String(value).toLowerCase() === "true";

const toText = (value: any): string => String(value || "").trim();
const toPositiveNumber = (value: any): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};
const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const throwBadRequestWithLog = (message: string, context: Record<string, any> = {}) => {
  console.warn("[productClassificationPreWriteHook] validation_error", { message, ...context });
  throw Object.assign(new Error(message), { statusCode: 400 });
};

export const productClassificationPreWriteHook: HookFunction = async (payload) => {
  const nextPayload: Record<string, any> = { ...(payload || {}) };

  const hasNatural = Object.prototype.hasOwnProperty.call(nextPayload, "isNatural");
  const hasOrganic = Object.prototype.hasOwnProperty.call(nextPayload, "isOrganic");
  const hasIpmQuality = Object.prototype.hasOwnProperty.call(nextPayload, "isIpmQuality");
  const hasGiTagged = Object.prototype.hasOwnProperty.call(nextPayload, "isGiTagged");
  const hasConventional = Object.prototype.hasOwnProperty.call(nextPayload, "isConventional");
  const hasAnyClassification = hasNatural || hasOrganic || hasIpmQuality || hasGiTagged || hasConventional;

  if (hasAnyClassification) {
    const isNatural = toBool(nextPayload.isNatural);
    const isOrganic = toBool(nextPayload.isOrganic);
    const isIpmQuality = toBool(nextPayload.isIpmQuality);
    const isGiTagged = toBool(nextPayload.isGiTagged);
    const isConventional = !(isNatural || isOrganic || isIpmQuality);

    nextPayload.isNatural = isNatural;
    nextPayload.isOrganic = isOrganic;
    nextPayload.isIpmQuality = isIpmQuality;
    nextPayload.isGiTagged = isGiTagged;
    nextPayload.isConventional = isConventional;

    if (isOrganic) {
      const organicCertificationBody = toText(nextPayload.organicCertificationBody);
      const organicCertificationBodyOther = toText(nextPayload.organicCertificationBodyOther);
      const organicCertificateNumber = toText(nextPayload.organicCertificateNumber);
      const organicCertificateValidFrom = toDateOrNull(nextPayload.organicCertificateValidFrom);
      const organicCertificateValidTo = toDateOrNull(nextPayload.organicCertificateValidTo);
      const organicCertifiedQuantity = toPositiveNumber(nextPayload.organicCertifiedQuantity);
      const organicCertifiedQuantityUnit = toText(nextPayload.organicCertifiedQuantityUnit) || "KG";
      const organicCertificationScope = toText(nextPayload.organicCertificationScope) || "NPOP";
      const organicCertificateDocumentUrl = toText(nextPayload.organicCertificateDocumentUrl);

      if (!organicCertificationBody) {
        throwBadRequestWithLog("Organic certification body is required when Organic is enabled.");
      }
      if (organicCertificationBody.toUpperCase() === "OTHER" && !organicCertificationBodyOther) {
        throwBadRequestWithLog("Specify organic certification body when selecting Other.");
      }
      if (!organicCertificateNumber) {
        throwBadRequestWithLog("Organic certificate number is required when Organic is enabled.");
      }
      if (!organicCertificateValidFrom || !organicCertificateValidTo) {
        throwBadRequestWithLog("Organic certificate validity dates are required when Organic is enabled.");
      }
      if (organicCertificateValidTo && organicCertificateValidFrom && organicCertificateValidTo.getTime() < organicCertificateValidFrom.getTime()) {
        throwBadRequestWithLog("Organic certificate valid to date cannot be before valid from date.", {
          organicCertificateValidFrom,
          organicCertificateValidTo,
        });
      }
      if (!(organicCertifiedQuantity > 0)) {
        throwBadRequestWithLog("Organic certified quantity must be greater than zero.", {
          organicCertifiedQuantity,
        });
      }

      nextPayload.isOrganicCertified = true;
      nextPayload.organicCertificationBody = organicCertificationBody;
      nextPayload.organicCertificationBodyOther = organicCertificationBody.toUpperCase() === "OTHER" ? organicCertificationBodyOther : "";
      nextPayload.organicCertificateNumber = organicCertificateNumber;
      nextPayload.organicCertificateValidFrom = organicCertificateValidFrom;
      nextPayload.organicCertificateValidTo = organicCertificateValidTo;
      nextPayload.organicCertifiedQuantity = organicCertifiedQuantity;
      nextPayload.organicCertifiedQuantityUnit = organicCertifiedQuantityUnit;
      nextPayload.organicCertificationScope = organicCertificationScope;
      nextPayload.organicCertificateDocumentUrl = organicCertificateDocumentUrl;
    } else {
      nextPayload.isOrganicCertified = false;
      nextPayload.organicCertificationBody = "";
      nextPayload.organicCertificationBodyOther = "";
      nextPayload.organicCertificateNumber = "";
      nextPayload.organicCertificateValidFrom = null;
      nextPayload.organicCertificateValidTo = null;
      nextPayload.organicCertifiedQuantity = 0;
      nextPayload.organicCertifiedQuantityUnit = "KG";
      nextPayload.organicCertificationScope = "NPOP";
      nextPayload.organicCertificateDocumentUrl = "";
    }

    if (isGiTagged) {
      const giName = toText(nextPayload.giName);
      const giCertificateNumber = toText(nextPayload.giCertificateNumber);
      if (!giName || !giCertificateNumber) {
        throwBadRequestWithLog("GI details are required when GI Tag is enabled.");
      }
      nextPayload.giName = giName;
      nextPayload.giCertificateNumber = giCertificateNumber;
      if (Object.prototype.hasOwnProperty.call(nextPayload, "giDocumentUrl")) {
        nextPayload.giDocumentUrl = toText(nextPayload.giDocumentUrl);
      }
    } else {
      nextPayload.giName = "";
      nextPayload.giCertificateNumber = "";
      nextPayload.giDocumentUrl = "";
    }
  }

  return nextPayload;
};

export const productClassificationPreReadHook: HookFunction = async (query) => {
  const nextQuery: Record<string, any> = { ...(query || {}) };
  const raw = nextQuery.classifications ?? nextQuery.classification;
  const classifications = Array.from(
    new Set(
      (Array.isArray(raw) ? raw : [raw])
        .flatMap((entry) => String(entry || "").split(","))
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  delete nextQuery.classification;
  delete nextQuery.classifications;

  const conditions: any[] = [];
  const pushByLabel = (label: string) => {
    if (label === "natural") conditions.push({ isNatural: true });
    else if (label === "organic") conditions.push({ isOrganic: true });
    else if (label === "ipm" || label === "ipm-quality" || label === "ipm_quality" || label === "ipmquality") conditions.push({ isIpmQuality: true });
    else if (label === "gi-tag" || label === "gi" || label === "gitag" || label === "gi_tag") conditions.push({ isGiTagged: true });
    else if (label === "conventional") {
      conditions.push({
        $or: [
          { isConventional: true },
          {
            $and: [
              { $or: [{ isNatural: { $exists: false } }, { isNatural: false }] },
              { $or: [{ isOrganic: { $exists: false } }, { isOrganic: false }] },
              { $or: [{ isIpmQuality: { $exists: false } }, { isIpmQuality: false }] },
            ],
          },
        ],
      });
    }
  };

  classifications.forEach(pushByLabel);

  if (!conditions.length) return nextQuery;
  if (conditions.length === 1) return { ...nextQuery, ...conditions[0] };
  return { ...nextQuery, $or: conditions };
};
