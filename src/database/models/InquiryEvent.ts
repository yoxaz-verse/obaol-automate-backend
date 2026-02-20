import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Event types for inquiry audit trail
 */
export enum InquiryEventType {
    STATUS_CHANGE = "STATUS_CHANGE",
    ASSIGNED = "ASSIGNED",
    NOTE_ADDED = "NOTE_ADDED",
    CREATED = "CREATED",
    UPDATED = "UPDATED"
}

/**
 * InquiryEvent interface for audit trail
 */
export interface IInquiryEvent extends Document {
    inquiryId: Types.ObjectId;
    eventType: InquiryEventType;
    previousValue?: string | null;
    newValue?: string | null;
    performedBy: Types.ObjectId;
    metadata?: Record<string, any>;
    createdAt: Date;
}

const InquiryEventSchema = new Schema<IInquiryEvent>(
    {
        inquiryId: {
            type: Schema.Types.ObjectId,
            ref: "Inquiry",
            required: true,
            index: true
        },
        eventType: {
            type: String,
            enum: Object.values(InquiryEventType),
            required: true
        },
        previousValue: {
            type: String,
            default: null
        },
        newValue: {
            type: String,
            default: null
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
);

// Compound index for efficient querying
InquiryEventSchema.index({ inquiryId: 1, createdAt: -1 });

export const InquiryEventModel = mongoose.model<IInquiryEvent>(
    "InquiryEvent",
    InquiryEventSchema
);

/**
 * Helper function to create an inquiry event
 */
export async function createInquiryEvent(
    inquiryId: Types.ObjectId | string,
    eventType: InquiryEventType,
    performedBy: Types.ObjectId | string,
    options: {
        previousValue?: string | null;
        newValue?: string | null;
        metadata?: Record<string, any>;
    } = {}
): Promise<IInquiryEvent> {
    return await InquiryEventModel.create({
        inquiryId,
        eventType,
        performedBy,
        previousValue: options.previousValue,
        newValue: options.newValue,
        metadata: options.metadata || {}
    });
}
