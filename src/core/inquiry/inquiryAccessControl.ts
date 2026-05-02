/**
 * Inquiry Access Control
 * Server-side access control with field-level visibility
 */

import { Types } from "mongoose";

export enum UserRole {
    ADMIN = "Admin",
    OPERATOR = "Operator",
    ASSOCIATE = "Associate"
}

export interface InquiryAccessContext {
    userId: Types.ObjectId | string;
    userRole: string;
    associateId?: Types.ObjectId | string | null;
    associateCompanyId?: Types.ObjectId | string | null;
}

export interface InquiryDocument {
    _id: Types.ObjectId;
    buyerAssociateId?: Types.ObjectId;
    sellerAssociateId?: Types.ObjectId;
    mediatorAssociateId?: Types.ObjectId | null;
    notes?: string;
    [key: string]: any;
}

export type OperatorPerspective = "buyer" | "supplier" | "both" | "none";

const getAttrId = (val: any) => {
    if (!val) return null;
    return (val._id || val).toString();
};

export function getOperatorPerspective(
    inquiry: InquiryDocument,
    userId: Types.ObjectId | string
): OperatorPerspective {
    const operatorId = userId.toString();
    const isHandler = getAttrId((inquiry as any).handlerOperatorId) === operatorId;
    const isBuyerOperator = getAttrId((inquiry as any).dealCloserOperatorId) === operatorId;
    const isSupplierOperator = getAttrId((inquiry as any).supplierOperatorId) === operatorId;

    if (isHandler || (isBuyerOperator && isSupplierOperator)) return "both";
    if (isBuyerOperator) return "buyer";
    if (isSupplierOperator) return "supplier";
    return "none";
}

export function canOperatorActOnPerspective(
    inquiry: InquiryDocument,
    userId: Types.ObjectId | string,
    required: "buyer" | "supplier" | "any"
): boolean {
    const perspective = getOperatorPerspective(inquiry, userId);
    if (perspective === "none") return false;
    if (required === "any") return true;
    if (perspective === "both") return true;
    return perspective === required;
}

export function isExecutionProviderForCompany(
    inquiry: InquiryDocument,
    associateCompanyId?: Types.ObjectId | string | null
): boolean {
    if (!associateCompanyId) return false;
    const companyId = associateCompanyId.toString();
    const tasks = Array.isArray((inquiry as any)?.executionInquiries)
        ? (inquiry as any).executionInquiries
        : [];
    return tasks.some((task: any) => {
        const candidates = Array.isArray(task?.candidateProviders) ? task.candidateProviders : [];
        return candidates.some((candidate: any) => getAttrId(candidate) === companyId);
    });
}

/**
 * Check if user has access to view an inquiry
 * @param inquiry - Inquiry document
 * @param context - User access context
 * @returns true if user has access, false otherwise
 */
export function canAccessInquiry(
    inquiry: InquiryDocument,
    context: InquiryAccessContext
): boolean {
    const { userId, userRole, associateId, associateCompanyId } = context;
    const roleLower = String(userRole || "").toLowerCase();

    // Admin has full access
    if (userRole === UserRole.ADMIN || roleLower === "admin") {
        return true;
    }

    // Operator: can access if assigned to buyer/supplier/handler perspective
    if (
        userRole === UserRole.OPERATOR ||
        roleLower === "operator" ||
        roleLower === "team"
    ) {
        return getOperatorPerspective(inquiry, userId) !== "none";
    }

    // Associate: can access if involved (buyer, seller, or mediator)
    if (userRole === UserRole.ASSOCIATE && associateId) {
        const assocIdStr = associateId.toString();
        const isCoreParty = (
            getAttrId(inquiry.buyerAssociateId) === assocIdStr ||
            getAttrId(inquiry.sellerAssociateId) === assocIdStr ||
            getAttrId(inquiry.mediatorAssociateId) === assocIdStr
        );
        if (isCoreParty) return true;
        return isExecutionProviderForCompany(inquiry, associateCompanyId);
    }

    return false;
}

/**
 * Determine which role the associate has in the inquiry
 * @param inquiry - Inquiry document
 * @param associateId - Associate ID to check
 * @returns Role name or null
 */
export function getAssociateRole(
    inquiry: InquiryDocument,
    associateId: Types.ObjectId | string
): "buyer" | "seller" | "mediator" | null {
    const assocIdStr = associateId.toString();

    if (getAttrId(inquiry.buyerAssociateId) === assocIdStr) {
        return "buyer";
    }
    if (getAttrId(inquiry.sellerAssociateId) === assocIdStr) {
        return "seller";
    }
    if (getAttrId(inquiry.mediatorAssociateId) === assocIdStr) {
        return "mediator";
    }

    return null;
}

/**
 * Filter inquiry fields based on user role and access level
 * CRITICAL: Internal notes must NEVER be returned to associates
 * @param inquiry - Inquiry document
 * @param context - User access context
 * @returns Filtered inquiry object
 */
export function filterInquiryFields(
    inquiry: InquiryDocument,
    context: InquiryAccessContext
): Partial<InquiryDocument> {
    const { userRole, associateId, associateCompanyId, userId } = context;
    const roleLower = String(userRole || "").toLowerCase();
    const assignmentVisibility = {
        supplierOperatorAssigned: Boolean(getAttrId((inquiry as any)?.supplierOperatorId)),
        dealCloserOperatorAssigned: Boolean(getAttrId((inquiry as any)?.dealCloserOperatorId)),
        handlerOperatorAssigned: Boolean(getAttrId((inquiry as any)?.handlerOperatorId)),
    };

    // Admin: full access
    if (userRole === UserRole.ADMIN || roleLower === "admin") {
        return {
            ...(inquiry as any),
            ...assignmentVisibility,
        };
    }

    // Operator/Team: perspective-aware redaction
    if (userRole === UserRole.OPERATOR || roleLower === "operator" || roleLower === "team") {
        const perspective = getOperatorPerspective(inquiry, userId);
        if (perspective === "both") return inquiry;

        if (perspective === "buyer") {
            const {
                sellerAssociateId,
                supplierOperatorId,
                sellerAssociateName,
                sellerName,
                sellerPhone,
                sellerAssociateCompanyName,
                importListingId,
                ...safeFields
            } = inquiry as any;
            return {
                ...safeFields,
                ...assignmentVisibility,
                sellerAssociateId: undefined,
                supplierOperatorId: undefined,
                sellerAssociateName: undefined,
                sellerName: undefined,
                sellerPhone: undefined,
                sellerAssociateCompanyName: undefined,
                importListingId: undefined,
            };
        }

        if (perspective === "supplier") {
            const {
                buyerAssociateId,
                dealCloserOperatorId,
                buyerAssociateName,
                buyerName,
                buyerPhone,
                buyerAssociateCompanyName,
                ...safeFields
            } = inquiry as any;
            return {
                ...safeFields,
                ...assignmentVisibility,
                buyerAssociateId: undefined,
                dealCloserOperatorId: undefined,
                buyerAssociateName: undefined,
                buyerName: undefined,
                buyerPhone: undefined,
                buyerAssociateCompanyName: undefined,
            };
        }
    }

    // Associate: limited access based on role
    if (userRole === UserRole.ASSOCIATE && associateId) {
        const associateRole = getAssociateRole(inquiry, associateId);

        if (associateRole === "buyer") {
            // Buyer can see: product, quantity, specifications, status
            const {
                notes,
                sellerAssociateId,
                mediatorAssociateId,
                supplierOperatorId,
                dealCloserOperatorId,
                handlerOperatorId,
                ...safeFields
            } = inquiry;
            return {
                ...safeFields,
                ...assignmentVisibility,
                // Explicitly exclude sensitive fields and counterparties
                notes: undefined,
                supplierOperatorId: undefined,
                dealCloserOperatorId: undefined,
                handlerOperatorId: undefined,
                sellerAssociateId: undefined,
                mediatorAssociateId: undefined
            };
        }

        if (associateRole === "seller") {
            // Seller can see: product, quantity, status (no specifications, no buyer)
            const {
                notes,
                supplierOperatorId,
                dealCloserOperatorId,
                handlerOperatorId,
                specifications,
                buyerAssociateId,
                mediatorAssociateId,
                ...safeFields
            } = inquiry;
            return {
                ...safeFields,
                ...assignmentVisibility,
                notes: undefined,
                supplierOperatorId: undefined,
                dealCloserOperatorId: undefined,
                handlerOperatorId: undefined,
                specifications: undefined,
                buyerAssociateId: undefined,
                mediatorAssociateId: undefined
            };
        }

        if (associateRole === "mediator") {
            // Mediator can see: product, quantity, status (no specifications, no buyer/seller names)
            const {
                notes,
                supplierOperatorId,
                dealCloserOperatorId,
                handlerOperatorId,
                specifications,
                buyerAssociateId,
                sellerAssociateId,
                ...safeFields
            } = inquiry;
            return {
                ...safeFields,
                ...assignmentVisibility,
                notes: undefined,
                supplierOperatorId: undefined,
                dealCloserOperatorId: undefined,
                handlerOperatorId: undefined,
                specifications: undefined,
                buyerAssociateId: undefined,
                sellerAssociateId: undefined
            };
        }

        // Capability-matched provider companies can access execution task context only.
        if (isExecutionProviderForCompany(inquiry, associateCompanyId)) {
            const {
                notes,
                buyerAssociateId,
                sellerAssociateId,
                mediatorAssociateId,
                adminCommission,
                mediatorCommission,
                ...safeFields
            } = inquiry;
            return {
                ...safeFields,
                ...assignmentVisibility,
                notes: undefined,
                buyerAssociateId: undefined,
                sellerAssociateId: undefined,
                mediatorAssociateId: undefined,
                adminCommission: undefined,
                mediatorCommission: undefined,
            };
        }
    }

    // Default: return minimal safe fields
    return {
        _id: inquiry._id,
        status: inquiry.status,
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt,
        ...assignmentVisibility,
    };
}

/**
 * Build MongoDB query filter based on user access
 * @param context - User access context
 * @returns MongoDB query filter
 */
export function buildInquiryAccessFilter(
    context: InquiryAccessContext
): Record<string, any> {
    const { userId, userRole, associateId, associateCompanyId } = context;
    const roleLower = String(userRole || "").toLowerCase();

    // Admin: no filter (access all)
    if (userRole === UserRole.ADMIN || roleLower === "admin") {
        return {};
    }

    // Operator: only assigned inquiries
    if (
        userRole === UserRole.OPERATOR ||
        roleLower === "operator" ||
        roleLower === "team"
    ) {
        return {
            $or: [
                { supplierOperatorId: userId },
                { dealCloserOperatorId: userId },
                { handlerOperatorId: userId },
            ]
        };
    }

    // Associate: where involved as buyer, seller, or mediator
    if (userRole === UserRole.ASSOCIATE && associateId) {
        const providerFilter = associateCompanyId
            ? [{ "executionInquiries.candidateProviders": associateCompanyId }]
            : [];
        return {
            $or: [
                { buyerAssociateId: associateId },
                { sellerAssociateId: associateId },
                { mediatorAssociateId: associateId },
                ...providerFilter,
            ]
        };
    }

    // Default: return filter that matches nothing
    return { _id: null };
}
