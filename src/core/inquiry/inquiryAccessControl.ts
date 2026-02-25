/**
 * Inquiry Access Control
 * Server-side access control with field-level visibility
 */

import { Types } from "mongoose";

export enum UserRole {
    ADMIN = "Admin",
    EMPLOYEE = "Employee",
    ASSOCIATE = "Associate"
}

export interface InquiryAccessContext {
    userId: Types.ObjectId | string;
    userRole: string;
    associateId?: Types.ObjectId | string | null;
}

export interface InquiryDocument {
    _id: Types.ObjectId;
    buyerAssociateId?: Types.ObjectId;
    sellerAssociateId?: Types.ObjectId;
    mediatorAssociateId?: Types.ObjectId | null;
    assignedEmployeeId?: Types.ObjectId | null;
    notes?: string;
    [key: string]: any;
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
    const { userId, userRole, associateId } = context;

    const getAttrId = (val: any) => {
        if (!val) return null;
        return (val._id || val).toString();
    };

    // Admin has full access
    if (userRole === UserRole.ADMIN) {
        return true;
    }

    // Employee: can access if assigned
    if (userRole === UserRole.EMPLOYEE) {
        return getAttrId(inquiry.assignedEmployeeId) === userId.toString();
    }

    // Associate: can access if involved (buyer, seller, or mediator)
    if (userRole === UserRole.ASSOCIATE && associateId) {
        const assocIdStr = associateId.toString();
        return (
            getAttrId(inquiry.buyerAssociateId) === assocIdStr ||
            getAttrId(inquiry.sellerAssociateId) === assocIdStr ||
            getAttrId(inquiry.mediatorAssociateId) === assocIdStr
        );
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

    const getAttrId = (val: any) => {
        if (!val) return null;
        return (val._id || val).toString();
    };

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
    const { userRole, associateId } = context;

    // Admin and assigned employee: full access
    if (
        userRole === UserRole.ADMIN ||
        (userRole === UserRole.EMPLOYEE &&
            inquiry.assignedEmployeeId?.toString() === context.userId.toString())
    ) {
        return inquiry;
    }

    // Associate: limited access based on role
    if (userRole === UserRole.ASSOCIATE && associateId) {
        const associateRole = getAssociateRole(inquiry, associateId);

        if (associateRole === "buyer") {
            // Buyer can see: product, quantity, specifications, status
            const { notes, assignedEmployeeId, sellerAssociateId, mediatorAssociateId, ...safeFields } = inquiry;
            return {
                ...safeFields,
                // Explicitly exclude sensitive fields and counterparties
                notes: undefined,
                assignedEmployeeId: undefined,
                sellerAssociateId: undefined,
                mediatorAssociateId: undefined
            };
        }

        if (associateRole === "seller") {
            // Seller can see: product, quantity, status (no specifications, no buyer)
            const {
                notes,
                assignedEmployeeId,
                specifications,
                buyerAssociateId,
                mediatorAssociateId,
                ...safeFields
            } = inquiry;
            return {
                ...safeFields,
                notes: undefined,
                assignedEmployeeId: undefined,
                specifications: undefined,
                buyerAssociateId: undefined,
                mediatorAssociateId: undefined
            };
        }

        if (associateRole === "mediator") {
            // Mediator can see: product, quantity, status (no specifications, no buyer/seller names)
            const {
                notes,
                assignedEmployeeId,
                specifications,
                buyerAssociateId,
                sellerAssociateId,
                ...safeFields
            } = inquiry;
            return {
                ...safeFields,
                notes: undefined,
                assignedEmployeeId: undefined,
                specifications: undefined,
                buyerAssociateId: undefined,
                sellerAssociateId: undefined
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
    const { userId, userRole, associateId } = context;

    // Admin: no filter (access all)
    if (userRole === UserRole.ADMIN) {
        return {};
    }

    // Employee: only assigned inquiries
    if (userRole === UserRole.EMPLOYEE) {
        return { assignedEmployeeId: userId };
    }

    // Associate: where involved as buyer, seller, or mediator
    if (userRole === UserRole.ASSOCIATE && associateId) {
        return {
            $or: [
                { buyerAssociateId: associateId },
                { sellerAssociateId: associateId },
                { mediatorAssociateId: associateId }
            ]
        };
    }

    // Default: return filter that matches nothing
    return { _id: null };
}
