import mongoose from "mongoose";
import { OperatorModel } from "../../database/models/operator";
import { OperatorHierarchyService } from "../../services/operatorHierarchy.service";
import { ExecutionMode, HookFunction } from "../types";

const badRequest = (message: string) => {
    const err: any = new Error(message);
    err.status = 400;
    err.statusCode = 400;
    return err;
};

export const operatorMentorValidationHook: HookFunction = async (payload, mode, id) => {
    if (mode !== ExecutionMode.CREATE && mode !== ExecutionMode.UPDATE) {
        return payload;
    }

    const hasMentorField = Object.prototype.hasOwnProperty.call(payload || {}, "mentorOperator");
    if (!hasMentorField) {
        return payload;
    }

    const nextPayload: any = { ...(payload || {}) };
    const mentorRaw = nextPayload.mentorOperator;
    if (mentorRaw === "" || mentorRaw === undefined) {
        nextPayload.mentorOperator = null;
        return nextPayload;
    }

    if (mentorRaw === null) {
        return nextPayload;
    }

    const mentorId = String(mentorRaw).trim();
    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
        throw badRequest("mentorOperator must be a valid operator id.");
    }

    const mentorExists = await OperatorModel.findOne({ _id: mentorId, isDeleted: { $ne: true } })
        .select("_id")
        .lean();
    if (!mentorExists) {
        throw badRequest("Selected mentor operator was not found.");
    }

    if (mode === ExecutionMode.UPDATE && id) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw badRequest("Invalid operator id for mentor update.");
        }

        if (mentorId === String(id)) {
            throw badRequest("Operator cannot be their own mentor.");
        }

        const createsLoop = await OperatorHierarchyService.isInDownline(String(id), mentorId);
        if (createsLoop) {
            throw badRequest("Invalid mentor assignment. This creates a reporting loop.");
        }
    }

    nextPayload.mentorOperator = mentorId;
    return nextPayload;
};
