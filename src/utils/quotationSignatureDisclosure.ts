export type MissingQuotationSignature = {
  leg: string;
  companyId: string | null;
  companyName: string;
};

type SignatureWarningContext = {
  viewerRole?: unknown;
  viewerCompanyId?: unknown;
  sellerCompanyId?: unknown;
  sellerRegistrationStatus?: unknown;
  sellerIsDeleted?: boolean;
  missingSignatures: MissingQuotationSignature[];
};

export const buildQuotationSignatureWarning = ({
  viewerRole,
  viewerCompanyId,
  sellerCompanyId,
  sellerRegistrationStatus,
  sellerIsDeleted,
  missingSignatures,
}: SignatureWarningContext) => {
  const authorized =
    String(viewerRole || "").trim().toLowerCase() === "associate" &&
    Boolean(viewerCompanyId) &&
    Boolean(sellerCompanyId) &&
    String(viewerCompanyId) === String(sellerCompanyId) &&
    String(sellerRegistrationStatus || "").toUpperCase() === "APPROVED" &&
    sellerIsDeleted !== true;

  if (!authorized || missingSignatures.length === 0) return null;

  return {
    message: `${missingSignatures.map(item => item.companyName).join(" and ")} must configure an authorized document signature before the quotation can be issued.`,
    missingSignatures,
  };
};
