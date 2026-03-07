import mongoose from "mongoose";
import { EmployeeModel } from "../../database/models/employee";
import { EmployeeHierarchyService } from "../../services/employeeHierarchy.service";
import { ExecutionMode, HookFunction } from "../types";

const badRequest = (message: string) => {
    const err: any = new Error(message);
    err.status = 400;
    err.statusCode = 400;
    return err;
};

export const employeeMentorValidationHook: HookFunction = async (payload, mode, id) => {
    if (mode !== ExecutionMode.CREATE && mode !== ExecutionMode.UPDATE) {
        return payload;
    }

    const hasMentorField = Object.prototype.hasOwnProperty.call(payload || {}, "mentorEmployee");
    if (!hasMentorField) {
        return payload;
    }

    const nextPayload: any = { ...(payload || {}) };
    const mentorRaw = nextPayload.mentorEmployee;
    if (mentorRaw === "" || mentorRaw === undefined) {
        nextPayload.mentorEmployee = null;
        return nextPayload;
    }

    if (mentorRaw === null) {
        return nextPayload;
    }

    const mentorId = String(mentorRaw).trim();
    if (!mongoose.Types.ObjectId.isValid(mentorId)) {
        throw badRequest("mentorEmployee must be a valid employee id.");
    }

    const mentorExists = await EmployeeModel.findOne({ _id: mentorId, isDeleted: { $ne: true } })
        .select("_id")
        .lean();
    if (!mentorExists) {
        throw badRequest("Selected mentor employee was not found.");
    }

    if (mode === ExecutionMode.UPDATE && id) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw badRequest("Invalid employee id for mentor update.");
        }

        if (mentorId === String(id)) {
            throw badRequest("Employee cannot be their own mentor.");
        }

        const createsLoop = await EmployeeHierarchyService.isInDownline(String(id), mentorId);
        if (createsLoop) {
            throw badRequest("Invalid mentor assignment. This creates a reporting loop.");
        }
    }

    nextPayload.mentorEmployee = mentorId;
    return nextPayload;
};
