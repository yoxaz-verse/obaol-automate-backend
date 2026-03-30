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

const getAttrId = (val: any) => {
    if (!val) return null;
    return (val._id || val).toString();
};

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

    // Operator: can access if assigned
    if (
        userRole === UserRole.OPERATOR ||
        roleLower === "operator" ||
        roleLower === "operator" ||
        roleLower === "team"
    ) {
        return (
            getAttrId((inquiry as any).supplierOperatorId) === userId.toString() ||
            getAttrId((inquiry as any).dealCloserOperatorId) === userId.toString() ||
            getAttrId((inquiry as any).createdBy) === userId.toString()
        );
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
    const { userRole, associateId, associateCompanyId } = context;
    const roleLower = String(userRole || "").toLowerCase();

    // Admin and assigned operators: full access
    if (
        userRole === UserRole.ADMIN ||
        roleLower === "admin" ||
        ((userRole === UserRole.OPERATOR || roleLower === "operator" || roleLower === "team") &&
            (getAttrId((inquiry as any).supplierOperatorId) === context.userId.toString() ||
                getAttrId((inquiry as any).dealCloserOperatorId) === context.userId.toString() ||
                getAttrId((inquiry as any).createdBy) === context.userId.toString()))
    ) {
        return inquiry;
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
                ...safeFields
            } = inquiry;
            return {
                ...safeFields,
                // Explicitly exclude sensitive fields and counterparties
                notes: undefined,
                supplierOperatorId: undefined,
                dealCloserOperatorId: undefined,
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
                specifications,
                buyerAssociateId,
                mediatorAssociateId,
                ...safeFields
            } = inquiry;
            return {
                ...safeFields,
                notes: undefined,
                supplierOperatorId: undefined,
                dealCloserOperatorId: undefined,
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
                specifications,
                buyerAssociateId,
                sellerAssociateId,
                ...safeFields
            } = inquiry;
            return {
                ...safeFields,
                notes: undefined,
                supplierOperatorId: undefined,
                dealCloserOperatorId: undefined,
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
        updatedAt: inquiry.updatedAt
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
                { createdBy: userId }
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
