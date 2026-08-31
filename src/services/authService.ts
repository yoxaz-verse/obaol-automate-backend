import { Request, Response } from "express";
import mongoose from "mongoose";
import { AdminModel } from "../database/models/admin";
import { ProjectManagerModel } from "../database/models/projectManager";
import { OperatorModel } from "../database/models/operator";
import { AssociateModel as AgentModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { InventoryManagerModel } from "../database/models/inventoryManager";
import { CompanyTypeModel } from "../database/models/companyType";
import { DesignationModel } from "../database/models/designation";
import { CompanyInterestProfileModel } from "../database/models/companyInterestProfile";
import { StateModel } from "../database/models/state";
import { DistrictModel } from "../database/models/district";
import { DivisionModel } from "../database/models/division";
import { PincodeEntryModel } from "../database/models/pincodeEntry";
import { CountryModel } from "../database/models/country";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { CompanySubFunctionModel } from "../database/models/companySubFunction";
import { JobRoleModel } from "../database/models/jobRole";
import { JobTypeModel } from "../database/models/jobType";
import { LanguageModel } from "../database/models/language";
import { CompanyFunctionMappingModel } from "../database/models/companyFunctionMapping";
import { comparePasswords, hashPassword } from "../utils/passwordUtils";
import { generateJWTToken } from "../utils/tokenUtils";
import verificationService from "./verification.service";
import logger from "../utils/apiLogger";
import { normalizePhoneInput } from "../utils/phone";
import { getAuthCookieOptions } from "../utils/cookieOptions";
import {
    COMPANY_INTERESTS,
    normalizeAssociateInterests,
    normalizeCompanyInterests,
} from "../constants/companyInterests";
import { notificationService } from "./notificationService";
import { NotificationEntityTypes, NotificationTypes } from "../constants/notificationTypes";
import { verifyGoogleIdToken } from "../utils/googleAuth";
import { VerificationModel } from "../database/models/verification";
import {
    PRE_AUTH_BLOCKED_MESSAGE,
    toBlockedResponsePayload,
} from "../utils/preAuthGuard";

const generateRandomPassword = (length = 12) => {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const all = `${upper}${lower}${numbers}`;
    let password = `${upper[Math.floor(Math.random() * upper.length)]}${numbers[Math.floor(Math.random() * numbers.length)]}`;
    while (password.length < length) {
        password += all[Math.floor(Math.random() * all.length)];
    }
    return password;
};

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const COUNTRY_ALIAS_TO_CODE: Record<string, string> = {
    UAE: "AE",
    USA: "US",
    UK: "GB",
    KSA: "SA",
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeCountryToken = (value: string) => String(value || "").trim().toUpperCase().replace(/[^A-Z]/g, "");

const DRAFT_PHONE_E164 = "+910000000000";
const DRAFT_PHONE_COUNTRY = "+91";
const DRAFT_PHONE_NATIONAL = "0000000000";
const DRAFT_OPERATOR_ADDRESS = "Pending";
const BLOCKED_ACCOUNT_MESSAGE = PRE_AUTH_BLOCKED_MESSAGE;
const PENDING_APPROVAL_MESSAGE = "Account pending admin approval.";
const LOGIN_COOLDOWN_CODE = "LOGIN_COOLDOWN";
export const LOGIN_COOLDOWN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_DURATIONS_MS = [
    5 * 60 * 1000,
    15 * 60 * 1000,
    60 * 60 * 1000,
    24 * 60 * 60 * 1000,
];
const TRADE_MODES = ["BUY", "SELL", "BOTH", "SERVICE"] as const;
type TradeMode = typeof TRADE_MODES[number];
const isTradeMode = (value: unknown): value is TradeMode =>
    TRADE_MODES.includes(String(value || "").trim().toUpperCase() as TradeMode);
const normalizeTradeMode = (value: unknown): TradeMode => {
    const normalized = String(value || "").trim().toUpperCase();
    return isTradeMode(normalized)
        ? normalized as TradeMode
        : "BOTH";
};

const deriveDisplayName = (email: string) => {
    const local = String(email || "").split("@")[0] || "New User";
    const cleaned = local.replace(/[._-]+/g, " ").trim();
    return cleaned ? cleaned.replace(/\b\w/g, (c) => c.toUpperCase()) : "New User";
};

const sendRejectedAccountResponse = (res: Response, userDoc?: any) => {
    return res.status(403).json({
        success: false,
        status: "rejected",
        isRejected: true,
        message: BLOCKED_ACCOUNT_MESSAGE,
    });
};

const isCooldownRole = (role: any) => {
    const normalized = String(role || "").toLowerCase();
    return [
        "admin",
        "projectmanager",
        "project_manager",
        "operator",
        "team",
        "warehouse_operator",
        "warehouse-operator",
        "warehouseoperator",
        "associate",
        "activitymanager",
        "inventorymanager",
        "worker",
    ].includes(normalized);
};

const getLoginCooldownPayload = (userDoc: any, now = new Date()) => {
    const lockedUntilValue = userDoc?.loginLockedUntil ? new Date(userDoc.loginLockedUntil) : null;
    if (!lockedUntilValue || Number.isNaN(lockedUntilValue.getTime()) || lockedUntilValue.getTime() <= now.getTime()) {
        return null;
    }
    return {
        success: false,
        code: LOGIN_COOLDOWN_CODE,
        message: "Too many incorrect password attempts. Please wait before trying again.",
        retryAfterSeconds: Math.max(1, Math.ceil((lockedUntilValue.getTime() - now.getTime()) / 1000)),
        lockedUntil: lockedUntilValue.toISOString(),
        failedAttempts: Number(userDoc?.failedLoginAttempts || 0),
        maxAttempts: LOGIN_COOLDOWN_MAX_ATTEMPTS,
        lockoutLevel: Number(userDoc?.loginLockoutLevel || 0),
    };
};

const sendLoginCooldownResponse = (res: Response, userDoc: any) => {
    const lockedUntil = userDoc?.loginLockedUntil ? new Date(userDoc.loginLockedUntil) : new Date(Date.now() + LOGIN_LOCKOUT_DURATIONS_MS[0]);
    const payload = getLoginCooldownPayload(userDoc) || {
        success: false,
        code: LOGIN_COOLDOWN_CODE,
        message: "Too many incorrect password attempts. Please wait before trying again.",
        retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)),
        lockedUntil: lockedUntil.toISOString(),
        failedAttempts: Number(userDoc?.failedLoginAttempts || LOGIN_COOLDOWN_MAX_ATTEMPTS),
        maxAttempts: LOGIN_COOLDOWN_MAX_ATTEMPTS,
        lockoutLevel: Number(userDoc?.loginLockoutLevel || 1),
    };
    res.setHeader("Retry-After", String(payload.retryAfterSeconds));
    return res.status(429).json(payload);
};

const recordFailedPasswordAttempt = async (userDoc: any) => {
    const nextAttempts = Number(userDoc?.failedLoginAttempts || 0) + 1;
    userDoc.failedLoginAttempts = nextAttempts;
    userDoc.lastFailedLoginAt = new Date();
    if (nextAttempts >= LOGIN_COOLDOWN_MAX_ATTEMPTS) {
        const nextLevel = Math.max(1, Number(userDoc?.loginLockoutLevel || 0) + 1);
        const duration = LOGIN_LOCKOUT_DURATIONS_MS[Math.min(nextLevel - 1, LOGIN_LOCKOUT_DURATIONS_MS.length - 1)];
        userDoc.loginLockoutLevel = nextLevel;
        userDoc.loginLockedUntil = new Date(Date.now() + duration);
    }
    await userDoc.save();
    return nextAttempts >= LOGIN_COOLDOWN_MAX_ATTEMPTS;
};

const resetLoginCooldown = async (userDoc: any) => {
    if (!userDoc) return;
    const hasFailedAttempts = Number(userDoc.failedLoginAttempts || 0) > 0;
    const hasLock = Boolean(userDoc.loginLockedUntil || userDoc.lastFailedLoginAt);
    if (!hasFailedAttempts && !hasLock) return;
    userDoc.failedLoginAttempts = 0;
    userDoc.loginLockedUntil = null;
    userDoc.lastFailedLoginAt = null;
    userDoc.loginLockoutLevel = 0;
    await userDoc.save();
};

export const normalizeAuthRole = (role: any) => {
    const normalized = String(role || "").trim().toLowerCase();
    if (normalized === "admin") return "Admin";
    if (normalized === "projectmanager" || normalized === "project_manager" || normalized === "project-manager") return "ProjectManager";
    if (normalized === "activitymanager" || normalized === "inventorymanager" || normalized === "inventory_manager") return "InventoryManager";
    if (normalized === "operator" || normalized === "team" || normalized === "warehouse_operator" || normalized === "warehouse-operator" || normalized === "warehouseoperator" || normalized === "worker") return "Operator";
    if (normalized === "associate") return "Associate";
    return "";
};

export const getAuthModelForRole = (role: any) => {
    const canonicalRole = normalizeAuthRole(role);
    const models: Record<string, any> = {
        Admin: AdminModel,
        ProjectManager: ProjectManagerModel,
        InventoryManager: InventoryManagerModel,
        Operator: OperatorModel,
        Associate: AgentModel,
    };
    return { canonicalRole, model: models[canonicalRole] || null };
};

const isDuplicateKeyError = (error: any) => Number(error?.code) === 11000;
const isValidationError = (error: any) => String(error?.name || "") === "ValidationError" || String(error?.name || "") === "CastError";

const sendNormalizedAuthError = (
    res: Response,
    error: any,
    fallbackMessage = "Request failed. Please check the details and try again."
) => {
    if (isDuplicateKeyError(error)) {
        return res.status(400).json({
            success: false,
            message: "Registration failed. This email or company is already registered.",
        });
    }
    if (isValidationError(error)) {
        return res.status(400).json({
            success: false,
            message: error?.message || fallbackMessage,
        });
    }
    return res.status(500).json({
        success: false,
        message: error?.message || fallbackMessage,
    });
};

const hasVerifiedOnboardingEmail = async (userDoc: any, role: "Associate" | "Operator", requestedEmail: any) => {
    const currentEmail = String(userDoc?.email || "").trim().toLowerCase();
    const nextEmail = String(requestedEmail || "").trim().toLowerCase();
    if (!currentEmail || !nextEmail || currentEmail !== nextEmail) {
        return {
            ok: false,
            message: "Verified email cannot be changed during onboarding. Please restart verification for the new email.",
        };
    }

    const authProvider = String(userDoc?.authProvider || "LOCAL").toUpperCase();
    if (authProvider === "GOOGLE" && (userDoc?.googleEmailVerified === true || userDoc?.isEmailVerified === true)) {
        return { ok: true };
    }

    if (userDoc?.isEmailVerified !== true) {
        return { ok: false, message: "Please verify your email OTP before completing onboarding." };
    }

    const verifiedRecord = await VerificationModel.findOne({
        userId: String(userDoc._id),
        userType: role,
        method: "email",
        verified: true,
    }).sort({ createdAt: -1, _id: -1 }).lean();

    if (!verifiedRecord) {
        return { ok: false, message: "Please verify your email OTP before completing onboarding." };
    }

    return { ok: true };
};

export const issueAuthCookie = (res: Response, userForToken: any, rememberMe = false) => {
    const jwtExpiresIn = rememberMe ? "24h" : "2h";
    const cookieMaxAge = rememberMe ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
    const token = generateJWTToken(userForToken, jwtExpiresIn);
    const host = String(res.req?.headers["x-forwarded-host"] || res.req?.headers.host || "");
    const cookieOptions = getAuthCookieOptions(host, cookieMaxAge);
    res.setHeader("Cache-Control", "no-store");
    res.cookie("auth_token", token, cookieOptions);
};
const countryAcronym = (name: string) =>
    String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("");

const resolveCountry = async (countryInput: any) => {
    const raw = String(countryInput || "").trim();
    if (!raw) return null;

    if (mongoose.Types.ObjectId.isValid(raw)) {
        const byId = await CountryModel.findById(raw).select("_id name code").lean();
        if (byId) return byId;
    }

    const token = normalizeCountryToken(raw);
    const mappedCode = COUNTRY_ALIAS_TO_CODE[token] || token;

    let found = await CountryModel.findOne({
        $or: [
            { code: mappedCode },
            { name: new RegExp(`^${escapeRegex(raw)}$`, "i") },
        ],
    })
        .select("_id name code")
        .lean();
    if (found) return found;

    const words = raw.split(/\s+/).map((w) => w.trim()).filter(Boolean);
    if (words.length > 0) {
        found = await CountryModel.findOne({
            $and: words.map((word) => ({ name: new RegExp(escapeRegex(word), "i") })),
        })
            .select("_id name code")
            .lean();
        if (found) return found;
    }

    if (token.length >= 2 && token.length <= 4) {
        const countries = await CountryModel.find({ isDeleted: { $ne: true } }).select("_id name code").lean();
        const byAcronym = countries.find((row: any) => countryAcronym(String(row?.name || "")) === token);
        if (byAcronym) return byAcronym;
    }

    return null;
};

const syncCompanyInterests = async (params: {
    associateCompanyId: any;
    interests: string[];
    updatedBy?: any;
    updatedByRole?: string;
}) => {
    const associateCompanyId = params.associateCompanyId;
    const interests = normalizeCompanyInterests(params.interests);
    await CompanyInterestProfileModel.findOneAndUpdate(
        { associateCompanyId },
        {
            $set: {
                interests,
                isConfigured: interests.length > 0,
                updatedBy: params.updatedBy || null,
                updatedByRole: params.updatedByRole || null,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await AssociateCompanyModel.findByIdAndUpdate(associateCompanyId, {
        $set: { serviceCapabilities: interests },
    });
    return interests;
};

const syncCompanyFunctionMappings = async (params: {
    companyId: any;
    selectedSubFunctionIds: any[];
}) => {
    const companyId = params.companyId;
    const subFunctionIds = Array.from(
        new Set((params.selectedSubFunctionIds || []).map((id) => String(id || "").trim()).filter(Boolean))
    );
    if (!subFunctionIds.length) {
        throw new Error("At least one company sub-function is required.");
    }

    const subFunctions = await CompanySubFunctionModel.find({
        _id: { $in: subFunctionIds },
        isActive: true,
    })
        .select("_id functionId")
        .lean();

    if (subFunctions.length !== subFunctionIds.length) {
        throw new Error("One or more selected company sub-functions are invalid or inactive.");
    }

    await CompanyFunctionMappingModel.deleteMany({ companyId });
    await CompanyFunctionMappingModel.insertMany(
        subFunctions.map((sub: any) => ({
            companyId,
            functionId: sub.functionId,
            subFunctionId: sub._id,
            isVerified: false,
        }))
    );

    const functionIds = Array.from(new Set(subFunctions.map((sub: any) => String(sub.functionId))));
    const functionRows = await CompanyFunctionModel.find({ _id: { $in: functionIds } })
        .select("slug")
        .lean();
    const capabilitySlugs = Array.from(
        new Set(functionRows.map((row: any) => String(row.slug || "").toUpperCase()).filter(Boolean))
    );

    await AssociateCompanyModel.findByIdAndUpdate(companyId, {
        $set: { serviceCapabilities: capabilitySlugs },
    });
};

const syncCompanyFunctions = async (params: {
    companyId: any;
    selectedFunctionIds: any[];
    selectedFunctionPriorities?: any[];
}) => {
    const companyId = params.companyId;
    const functionIds = Array.from(
        new Set((params.selectedFunctionIds || []).map((id) => String(id || "").trim()).filter(Boolean))
    ).filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!functionIds.length) {
        throw new Error("At least one company category is required.");
    }

    const priorityIds = Array.from(
        new Set((params.selectedFunctionPriorities || []).map((id) => String(id || "").trim()).filter(Boolean))
    ).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const prioritySubset = priorityIds.filter((id) => functionIds.includes(id)).slice(0, 3);

    const functions = await CompanyFunctionModel.find({
        _id: { $in: functionIds },
        isActive: true,
    })
        .select("_id slug")
        .lean();

    if (functions.length !== functionIds.length) {
        throw new Error("One or more selected company categories are invalid or inactive.");
    }

    await CompanyFunctionMappingModel.deleteMany({ companyId });

    const capabilitySlugs = Array.from(
        new Set(functions.map((row: any) => String(row.slug || "").toUpperCase()).filter(Boolean))
    );

    await AssociateCompanyModel.findByIdAndUpdate(companyId, {
        $set: { serviceCapabilities: capabilitySlugs, companyFunctionPriorities: prioritySubset },
    });
};

export const authenticateUser = async (req: Request, res: Response) => {
    // ... (existing code, unchanged)
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        let user: any = null;
        let finalRole = normalizeAuthRole(role);
        const { canonicalRole, model } = getAuthModelForRole(role);

        if (role && model) {
            user = await model.findOne({ email });
            finalRole = canonicalRole;
        } else {
            user = await AdminModel.findOne({ email });
            if (user) finalRole = "Admin";
        }

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (user.isDeleted) {
            return res.status(401).json({ message: "Account has been deleted" });
        }

        const roleLower = String(finalRole || "").toLowerCase();
        if (roleLower === "associate") {
            const registrationStatus = String((user as any).registrationStatus || "PENDING_REVIEW").toUpperCase();
            if (registrationStatus === "REJECTED") {
                return sendRejectedAccountResponse(res, user);
            }
            if (registrationStatus === "APPROVED" && user.isActive === false) {
                return res.status(401).json({ message: "Account is inactive. Please contact support at info@support.obaol.com." });
            }
        } else if (roleLower === "operator" || roleLower === "team" || roleLower === "warehouse_operator" || roleLower === "warehouse-operator" || roleLower === "warehouseoperator") {
            const registrationStatus = String((user as any).registrationStatus || "APPROVED").toUpperCase();
            if (registrationStatus === "REJECTED") {
                return sendRejectedAccountResponse(res, user);
            }
            if (registrationStatus === "APPROVED" && user.isActive === false) {
                return res.status(401).json({ message: "Account is inactive. Please contact support at info@support.obaol.com." });
            }
        } else if (user.isActive === false) {
            return res.status(401).json({ message: "Account is inactive. Please contact support at info@support.obaol.com." });
        }

        if (isCooldownRole(roleLower)) {
            const cooldownPayload = getLoginCooldownPayload(user);
            if (cooldownPayload) {
                res.setHeader("Retry-After", String(cooldownPayload.retryAfterSeconds));
                return res.status(429).json(cooldownPayload);
            }
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            if (isCooldownRole(roleLower)) {
                const isLocked = await recordFailedPasswordAttempt(user);
                if (isLocked) {
                    return sendLoginCooldownResponse(res, user);
                }
            }
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (isCooldownRole(roleLower)) {
            await resetLoginCooldown(user);
        }

        const rememberMe = Boolean(req.body.rememberMe);
        const jwtExpiresIn = rememberMe ? "24h" : "2h";
        const cookieMaxAge = rememberMe ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;

        const normalizedRole = normalizeAuthRole(finalRole) || finalRole;
        const userForToken = {
            ...user.toObject(),
            role: normalizedRole,
            // Ensure associateCompany is included if present (for AssociateCompany scope)
            associateCompany: user.associateCompany
        };
        issueAuthCookie(res, userForToken, rememberMe);
        const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
        const cookieOptions = getAuthCookieOptions(host, cookieMaxAge);
        logger.info("Auth cookie set", {
            route: "login",
            origin: String(req.headers.origin || ""),
            host,
            userAgent: String(req.headers["user-agent"] || "").slice(0, 160),
            sameSite: cookieOptions.sameSite,
            secure: cookieOptions.secure,
            hasDomain: Boolean(cookieOptions.domain),
        });

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: normalizedRole,
                registrationStatus: (user as any).registrationStatus || null,
            }
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: "Login failed. Please try again." });
    }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email, role } = req.body;
        logger.info(`🔑 Password reset requested for: ${email} with role: ${role}`);
        if (!email || !role) return res.status(400).json({ message: "Email and role are required" });

        const models: Record<string, any> = {
            "Admin": AdminModel,
            "admin": AdminModel,
            "ProjectManager": ProjectManagerModel,
            "projectmanager": ProjectManagerModel,
            "Operator": OperatorModel,
            "operator": OperatorModel,
            "Associate": AgentModel,
            "associate": AgentModel,
            "ActivityManager": InventoryManagerModel,
            "activitymanager": InventoryManagerModel
        };

        const model = models[role];
        if (!model) return res.status(400).json({ message: "Invalid role" });

        const user = await model.findOne({ email });
        if (!user) {
            logger.warn(`❌ Password reset failed: User NOT found for email: ${email}`);
            return res.status(404).json({ message: "User not found" });
        }

        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
        const userAgent = req.headers["user-agent"] || "unknown";

        await verificationService.initiateVerification(
            user._id.toString(),
            role,
            "email",
            ip.toString(),
            userAgent,
            email,
            req.language,
            { authEmailType: "forgot_password_otp" }
        );

        res.json({ success: true, message: "OTP sent to your email" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error?.message || "Unable to send password reset OTP." });
    }
};

export const completePasswordReset = async (req: Request, res: Response) => {
    try {
        const { email, role, code, newPassword } = req.body;
        if (!email || !role || !code || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const models: Record<string, any> = {
            "Admin": AdminModel,
            "admin": AdminModel,
            "ProjectManager": ProjectManagerModel,
            "projectmanager": ProjectManagerModel,
            "Operator": OperatorModel,
            "operator": OperatorModel,
            "Associate": AgentModel,
            "associate": AgentModel,
            "ActivityManager": InventoryManagerModel,
            "activitymanager": InventoryManagerModel
        };

        const model = models[role];
        if (!model) return res.status(400).json({ message: "Invalid role" });

        const user = await model.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        await verificationService.verify(user._id.toString(), role, code, "email");

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: "Password reset successful" });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error?.message || "Password reset failed. Please retry." });
    }
};

export const logoutUser = async (req: Request, res: Response) => {
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
    const cookieOptions = getAuthCookieOptions(host);
    const { maxAge: _maxAge, ...clearCookieOptions } = cookieOptions;
    res.setHeader("Cache-Control", "no-store");
    res.clearCookie("auth_token", clearCookieOptions);
    res.json({ success: true, message: "Logged out successfully" });
};

export const getEmailStatus = async (req: Request, res: Response) => {
    try {
        const email = String(req.query?.email || "").trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }
        const [admin, projectManager, inventoryManager, operatorExisting, associateExisting] = await Promise.all([
            AdminModel.findOne({ email }).select("_id").lean(),
            ProjectManagerModel.findOne({ email }).select("_id").lean(),
            InventoryManagerModel.findOne({ email }).select("_id").lean(),
            OperatorModel.findOne({ email }).select("_id registrationStatus reviewNotes isActive isDeleted").lean(),
            AgentModel.findOne({ email }).select("_id registrationStatus reviewNotes isActive isDeleted").lean(),
        ]);
        const blockedPayload = toBlockedResponsePayload(operatorExisting || associateExisting);
        if (blockedPayload) {
            return res.status(403).json(blockedPayload);
        }
        const role =
            admin ? "Admin" :
                projectManager ? "ProjectManager" :
                    inventoryManager ? "InventoryManager" :
                        operatorExisting ? "Operator" :
                            associateExisting ? "Associate" : undefined;
        return res.json({ success: true, exists: Boolean(role), role });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error?.message || "Unable to verify email." });
    }
};

export const authenticateGoogle = async (req: Request, res: Response) => {
    try {
        const idToken = String(req.body?.idToken || "").trim();
        const role = String(req.body?.role || "").trim();
        const intent = String(req.body?.intent || "login").trim().toLowerCase();
        const rememberMe = Boolean(req.body?.rememberMe);

        if (!idToken || !role) {
            return res.status(400).json({ success: false, message: "idToken and role are required" });
        }
        if (role !== "Associate" && role !== "Operator") {
            return res.status(400).json({ success: false, message: "Google login is only enabled for Associate and Operator." });
        }

        const googlePayload = await verifyGoogleIdToken(idToken);
        const email = String(googlePayload.email || "").trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, message: "Google email is required." });
        }

        const [admin, projectManager, inventoryManager, operatorExisting, associateExisting] = await Promise.all([
            AdminModel.findOne({ email }).select("_id").lean(),
            ProjectManagerModel.findOne({ email }).select("_id").lean(),
            InventoryManagerModel.findOne({ email }).select("_id").lean(),
            OperatorModel.findOne({ email }).select("_id registrationStatus reviewNotes isActive").lean(),
            AgentModel.findOne({ email }).select("_id registrationStatus reviewNotes isActive").lean(),
        ]);
        const existingRole =
            admin ? "Admin" :
                projectManager ? "ProjectManager" :
                    inventoryManager ? "InventoryManager" :
                        operatorExisting ? "Operator" :
                            associateExisting ? "Associate" : null;

        if (existingRole && existingRole !== role) {
            return res.status(409).json({
                success: false,
                message: "Account exists under a different role.",
                role: existingRole,
            });
        }

        if (intent === "login") {
            const model: any = role === "Operator" ? OperatorModel : AgentModel;
            const user: any = await model.findOne({ email });
            if (!user) {
                return res.status(404).json({ success: false, message: "Account not found. Please sign up." });
            }

            const roleLower = String(role || "").toLowerCase();
            if (roleLower === "associate") {
                const registrationStatus = String((user as any).registrationStatus || "PENDING_REVIEW").toUpperCase();
                if (registrationStatus === "REJECTED") {
                    return sendRejectedAccountResponse(res, user);
                }
                if (registrationStatus === "APPROVED" && user.isActive === false) {
                    return res.status(401).json({ message: "Account is inactive. Please contact support at info@support.obaol.com." });
                }
            } else {
                const registrationStatus = String((user as any).registrationStatus || "APPROVED").toUpperCase();
                if (registrationStatus === "REJECTED") {
                    return sendRejectedAccountResponse(res, user);
                }
                if (registrationStatus === "APPROVED" && user.isActive === false) {
                    return res.status(401).json({ message: "Account is inactive. Please contact support at info@support.obaol.com." });
                }
            }

            const jwtExpiresIn = rememberMe ? "24h" : "2h";
            const cookieMaxAge = rememberMe ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
            const normalizedRole = roleLower === "operator" ? "Operator" : role;
            const userForToken = {
                ...user.toObject(),
                role: normalizedRole,
                associateCompany: (user as any).associateCompany,
            };
            const token = generateJWTToken(userForToken, jwtExpiresIn);
            const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
            const cookieOptions = getAuthCookieOptions(host, cookieMaxAge);

            res.setHeader("Cache-Control", "no-store");
            res.cookie("auth_token", token, cookieOptions);
            return res.json({
                success: true,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: normalizedRole,
                    registrationStatus: (user as any).registrationStatus || null,
                },
            });
        }

        if (intent === "register") {
            if (existingRole) {
                const rejectedExisting =
                    (role === "Operator" && String((operatorExisting as any)?.registrationStatus || "").toUpperCase() === "REJECTED")
                    || (role === "Associate" && String((associateExisting as any)?.registrationStatus || "").toUpperCase() === "REJECTED");
                if (rejectedExisting) {
                    return sendRejectedAccountResponse(res, role === "Operator" ? operatorExisting : associateExisting);
                }
                return res.status(409).json({ success: false, message: "Account already exists — sign in." });
            }
            const displayName = String(googlePayload.name || "").trim() || deriveDisplayName(email);
            const generatedPassword = generateRandomPassword();
            if (role === "Operator") {
                const operator = await OperatorModel.create({
                    name: displayName,
                    email,
                    phone: DRAFT_PHONE_E164,
                    phoneCountryCode: DRAFT_PHONE_COUNTRY,
                    phoneNational: DRAFT_PHONE_NATIONAL,
                    password: generatedPassword,
                    address: DRAFT_OPERATOR_ADDRESS,
                    authProvider: "GOOGLE",
                    googleSub: googlePayload.sub,
                    googleEmailVerified: Boolean(googlePayload.email_verified),
                    isEmailVerified: true,
                    onboardingComplete: false,
                });
                await VerificationModel.create({
                    userId: String(operator._id),
                    userType: "Operator",
                    method: "email",
                    code: "GOOGLE_VERIFIED",
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
                    ipAddress: String(req.ip || ""),
                    userAgent: String(req.headers["user-agent"] || ""),
                    verified: true,
                });
                issueAuthCookie(res, {
                    ...operator.toObject(),
                    role: "Operator",
                }, rememberMe);
                return res.json({
                    success: true,
                    user: { id: operator._id, email: operator.email, name: operator.name, role: "Operator" },
                });
            }

            const associate = await AgentModel.create({
                name: displayName,
                email,
                phone: DRAFT_PHONE_E164,
                phoneCountryCode: DRAFT_PHONE_COUNTRY,
                phoneNational: DRAFT_PHONE_NATIONAL,
                password: generatedPassword,
                authProvider: "GOOGLE",
                googleSub: googlePayload.sub,
                googleEmailVerified: Boolean(googlePayload.email_verified),
                isEmailVerified: true,
                onboardingComplete: false,
                hasCompany: false,
                companyMode: "none",
                tradeMode: "BOTH",
            });
            await VerificationModel.create({
                userId: String(associate._id),
                userType: "Associate",
                method: "email",
                code: "GOOGLE_VERIFIED",
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
                ipAddress: String(req.ip || ""),
                userAgent: String(req.headers["user-agent"] || ""),
                verified: true,
            });
            issueAuthCookie(res, {
                ...associate.toObject(),
                role: "Associate",
                associateCompany: (associate as any).associateCompany,
            }, rememberMe);
            return res.json({
                success: true,
                user: { id: associate._id, email: associate.email, name: associate.name, role: "Associate" },
            });
        }

        return res.status(400).json({ success: false, message: "Invalid intent." });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error?.message || "Google auth failed." });
    }
};

/**
 * Register a new Associate
 * POST /auth/register
 */
export const registerAssociate = async (req: Request, res: Response) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            phoneSecondary,
            associateInterests,
            designation,
            hasCompany,
            companyMode,
            associateCompanyId,
            company,
            contactPreference,
            contactNotes,
            associateAddress,
            associateGeoType,
            associateCountry,
            associateState,
            associateDistrict,
            associateDivision,
            associatePincodeEntry,
            referralCode,
            tradeMode,
        } = req.body;

        // Input validation
        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                success: false,
                message: "Name, email, phone, and password are required"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if (!hasUpperCase || !hasNumber) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least one uppercase letter and one number"
            });
        }

        // Check email uniqueness across all models (prevent email enumeration with generic error)
        const trimmedEmail = email.trim().toLowerCase();
        const normalizedPrimaryPhone = normalizePhoneInput({
            rawPhone: typeof phone === "object" ? phone?.value || phone?.e164 || "" : phone,
            rawCountryCode: typeof phone === "object" ? phone?.countryCode : req.body?.phoneCountryCode,
            rawNational: typeof phone === "object" ? phone?.national : req.body?.phoneNational,
        });
        const normalizedPhone = normalizedPrimaryPhone.e164;
        const normalizedPhoneSecondaryInput = normalizePhoneInput({
            rawPhone: typeof phoneSecondary === "object" ? phoneSecondary?.value || phoneSecondary?.e164 || "" : phoneSecondary,
            rawCountryCode: typeof phoneSecondary === "object" ? phoneSecondary?.countryCode : req.body?.phoneSecondaryCountryCode || normalizedPrimaryPhone.countryCode,
            rawNational: typeof phoneSecondary === "object" ? phoneSecondary?.national : req.body?.phoneSecondaryNational,
            fallbackCountryCode: normalizedPrimaryPhone.countryCode,
        });
        const normalizedPhoneSecondary = normalizedPhoneSecondaryInput.e164 || normalizedPhone;
        const normalizedAssociateInterests = normalizeAssociateInterests(associateInterests);
        const normalizedDesignation = String(designation || "").trim();
        const shouldLinkCompany =
            hasCompany === true ||
            String(hasCompany || "").toLowerCase() === "true" ||
            String(hasCompany || "").toLowerCase() === "yes" ||
            String(hasCompany || "") === "1";

        if (!shouldLinkCompany) {
            return res.status(400).json({
                success: false,
                message: "Associate registration requires an existing or newly registered company. Individuals should register as Operators."
            });
        }
        if (!isTradeMode(tradeMode)) {
            return res.status(400).json({
                success: false,
                message: "Choose whether the company buys, sells, buys and sells, or provides trade services."
            });
        }

        if (!normalizedPhone) {
            return res.status(400).json({
                success: false,
                message: "Valid phone number is required"
            });
        }
        if (normalizedAssociateInterests.length > 6) {
            return res.status(400).json({
                success: false,
                message: "You can select up to 6 functions."
            });
        }

        const existingAssociate = await AgentModel.findOne({ email: trimmedEmail }).select("_id registrationStatus reviewNotes");
        const existingAdmin = await AdminModel.findOne({ email: trimmedEmail });
        const existingOperator = await OperatorModel.findOne({ email: trimmedEmail }).select("_id registrationStatus reviewNotes");

        if (String((existingAssociate as any)?.registrationStatus || "").toUpperCase() === "REJECTED") {
            return sendRejectedAccountResponse(res, existingAssociate);
        }
        if (String((existingOperator as any)?.registrationStatus || "").toUpperCase() === "REJECTED") {
            return sendRejectedAccountResponse(res, existingOperator);
        }

        if (existingAssociate || existingAdmin || existingOperator) {
            return res.status(400).json({
                success: false,
                message: "Registration failed. This email is already registered."
            });
        }

        let designationId: string | null = null;
        if (normalizedDesignation) {
            if (!mongoose.Types.ObjectId.isValid(normalizedDesignation)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid designation selected."
                });
            }
            const designationExists = await DesignationModel.findById(normalizedDesignation).select("_id name");
            if (!designationExists) {
                return res.status(400).json({
                    success: false,
                    message: "Selected designation was not found."
                });
            }
            designationId = String(designationExists._id);
        }

        let assignedOperatorId: any = null;
        if (referralCode && String(referralCode).trim()) {
            const operator = await OperatorModel.findOne({ referralCode: String(referralCode).trim().toUpperCase() }).select("_id");
            if (operator) {
                assignedOperatorId = operator._id;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Invalid referral code. Please check and try again."
                });
            }
        }

        let linkedCompanyId: any = null;
        let createdCompanyId: any = null;

        if (shouldLinkCompany) {
            if (companyMode !== "existing" && companyMode !== "new") {
                return res.status(400).json({
                    success: false,
                    message: "Please choose whether company is existing or new."
                });
            }
            if (companyMode === "existing") {
                if (!associateCompanyId) {
                    return res.status(400).json({
                        success: false,
                        message: "Please select an existing company."
                    });
                }
                const existingCompany = await AssociateCompanyModel.findById(associateCompanyId).select("_id");
                if (!existingCompany) {
                    return res.status(404).json({
                        success: false,
                        message: "Selected company was not found."
                    });
                }
                linkedCompanyId = existingCompany._id;
            } else if (companyMode === "new") {
                const companyName = String(company?.name || "").trim();
                const companyEmail = String(company?.email || "").trim().toLowerCase();
                const normalizedCompanyPrimaryPhone = normalizePhoneInput({
                    rawPhone: typeof company?.phone === "object" ? company?.phone?.value || company?.phone?.e164 || "" : company?.phone,
                    rawCountryCode: typeof company?.phone === "object" ? company?.phone?.countryCode : company?.phoneCountryCode,
                    rawNational: typeof company?.phone === "object" ? company?.phone?.national : company?.phoneNational,
                });
                const companyPhone = normalizedCompanyPrimaryPhone.e164;
                const companyType = company?.companyType || null;
                const requestedInterests = normalizeCompanyInterests(company?.interests);
                const selectedFunctionIdsRaw = Array.isArray(company?.functionIds) ? company.functionIds : [];
                const selectedFunctionIds = selectedFunctionIdsRaw
                    .map((id: any) => String(id || "").trim())
                    .filter((id: string) => mongoose.Types.ObjectId.isValid(id));
                const selectedFunctionPrioritiesRaw = Array.isArray(company?.functionPriorities) ? company.functionPriorities : [];
                const selectedFunctionPriorities = selectedFunctionPrioritiesRaw
                    .map((id: any) => String(id || "").trim())
                    .filter((id: string) => mongoose.Types.ObjectId.isValid(id));
                const selectedSubFunctionIdsRaw = Array.isArray(company?.subFunctionIds) ? company.subFunctionIds : [];
                const selectedSubFunctionIds = selectedSubFunctionIdsRaw
                    .map((id: any) => String(id || "").trim())
                    .filter((id: string) => mongoose.Types.ObjectId.isValid(id));
                const companyAddress = String(company?.address || "").trim();
                const companyGstin = String(company?.gstin || "").trim().toUpperCase();
                const companyLegalRegistrationNumber = String(company?.legalRegistrationNumber || "").trim();
                const companyLegalComplianceInfo = String(company?.legalComplianceInfo || "").trim();
                const companyGeoType = String(company?.geoType || "INDIAN").toUpperCase() === "INTERNATIONAL" ? "INTERNATIONAL" : "INDIAN";
                const companyCountry = String(company?.country || "").trim();
                const companyState = String(company?.state || "").trim();
                const companyDistrict = String(company?.district || "").trim();
                const companyDivision = String(company?.division || "").trim();
                const companyPincodeEntry = String(company?.pincodeEntry || "").trim();

                if (!companyName || !companyEmail || !companyPhone || !companyType) {
                    return res.status(400).json({
                        success: false,
                        message: "Company name, company email, company phone, and company type are required."
                    });
                }
                if (!companyAddress) {
                    return res.status(400).json({
                        success: false,
                        message: "Company address is required."
                    });
                }
                if (!selectedFunctionIds.length && !selectedSubFunctionIds.length) {
                    return res.status(400).json({
                        success: false,
                        message: "Please select at least one company category."
                    });
                }
                if (selectedFunctionIds.length > 6 || selectedSubFunctionIds.length > 6) {
                    return res.status(400).json({
                        success: false,
                        message: "You can select up to 6 company categories."
                    });
                }
                if (selectedFunctionPriorities.length > 3) {
                    return res.status(400).json({
                        success: false,
                        message: "You can select up to 3 priorities."
                    });
                }
                if (selectedFunctionPriorities.length && !selectedFunctionPriorities.every((id: string) => selectedFunctionIds.includes(id))) {
                    return res.status(400).json({
                        success: false,
                        message: "Priorities must be part of selected categories."
                    });
                }
                if (companyGstin && !GST_REGEX.test(companyGstin)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid GST number format."
                    });
                }

                const companyTypeExists = await CompanyTypeModel.findById(companyType).select("_id");
                if (!companyTypeExists) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid company type."
                    });
                }
                let resolvedCompanyCountryId: any = undefined;
                if (companyGeoType === "INDIAN") {
                    if (!companyState || !companyDistrict || !companyDivision) {
                        return res.status(400).json({
                            success: false,
                            message: "For Indian company, state, district, and division are required."
                        });
                    }
                    const stateExists = await StateModel.findById(companyState).select("_id");
                    if (!stateExists) {
                        return res.status(400).json({
                            success: false,
                            message: "Invalid company state."
                        });
                    }
                    const districtExists = await DistrictModel.findOne({ _id: companyDistrict, state: companyState }).select("_id");
                    if (!districtExists) {
                        return res.status(400).json({
                            success: false,
                            message: "Invalid district for selected state."
                        });
                    }
                    const divisionExists = await DivisionModel.findOne({ _id: companyDivision, district: companyDistrict }).select("_id");
                    if (!divisionExists) {
                        return res.status(400).json({
                            success: false,
                            message: "Invalid division for selected district."
                        });
                    }
                    if (companyPincodeEntry) {
                        const pincodeExists = await PincodeEntryModel.findOne({ _id: companyPincodeEntry, division: companyDivision }).select("_id");
                        if (!pincodeExists) {
                            return res.status(400).json({
                                success: false,
                                message: "Invalid pincode entry for selected division."
                            });
                        }
                    }
                } else {
                    if (!companyCountry) {
                        return res.status(400).json({
                            success: false,
                            message: "For international company, country name is required."
                        });
                    }
                    const countryExists: any = await resolveCountry(companyCountry);
                    if (!countryExists) {
                        return res.status(400).json({
                            success: false,
                            message: "Invalid country. Please enter a valid country name."
                        });
                    }
                    resolvedCompanyCountryId = countryExists._id;
                    if (!companyLegalRegistrationNumber || !companyLegalComplianceInfo) {
                        return res.status(400).json({
                            success: false,
                            message: "For international company, legal number and legal information are required."
                        });
                    }
                }

                const duplicateCompanyByEmail = await AssociateCompanyModel.findOne({ email: companyEmail }).select("_id");
                if (duplicateCompanyByEmail) {
                    linkedCompanyId = duplicateCompanyByEmail._id;
                    if (selectedFunctionIds.length) {
                        await syncCompanyFunctions({
                            companyId: linkedCompanyId,
                            selectedFunctionIds,
                            selectedFunctionPriorities,
                        });
                    } else {
                        await syncCompanyFunctionMappings({
                            companyId: linkedCompanyId,
                            selectedSubFunctionIds,
                        });
                    }
                    if (requestedInterests.length) {
                        await syncCompanyInterests({
                            associateCompanyId: linkedCompanyId,
                            interests: requestedInterests,
                            updatedBy: null,
                            updatedByRole: "register",
                        });
                    }
                } else {
                    const normalizedCompanySecondaryPhone = normalizePhoneInput({
                        rawPhone: typeof company?.phoneSecondary === "object" ? company?.phoneSecondary?.value || company?.phoneSecondary?.e164 || "" : company?.phoneSecondary,
                        rawCountryCode: typeof company?.phoneSecondary === "object" ? company?.phoneSecondary?.countryCode : company?.phoneSecondaryCountryCode || normalizedCompanyPrimaryPhone.countryCode,
                        rawNational: typeof company?.phoneSecondary === "object" ? company?.phoneSecondary?.national : company?.phoneSecondaryNational,
                        fallbackCountryCode: normalizedCompanyPrimaryPhone.countryCode,
                    });
                    const createdCompany = await AssociateCompanyModel.create({
                        name: companyName,
                        email: companyEmail,
                        gstin: companyGstin || undefined,
                        legalRegistrationNumber: companyGeoType === "INTERNATIONAL" ? companyLegalRegistrationNumber : undefined,
                        legalComplianceInfo: companyGeoType === "INTERNATIONAL" ? companyLegalComplianceInfo : undefined,
                        phone: companyPhone,
                        phoneCountryCode: normalizedCompanyPrimaryPhone.countryCode,
                        phoneNational: normalizedCompanyPrimaryPhone.national,
                        phoneSecondary: normalizedCompanySecondaryPhone.e164 || companyPhone,
                        phoneSecondaryCountryCode: normalizedCompanySecondaryPhone.countryCode || normalizedCompanyPrimaryPhone.countryCode,
                        phoneSecondaryNational: normalizedCompanySecondaryPhone.national || normalizedCompanyPrimaryPhone.national,
                        companyType,
                        geoType: companyGeoType,
                        country: companyGeoType === "INTERNATIONAL" ? resolvedCompanyCountryId : undefined,
                        address: companyAddress,
                        state: companyGeoType === "INDIAN" ? (companyState || undefined) : undefined,
                        district: companyGeoType === "INDIAN" ? (companyDistrict || undefined) : undefined,
                        division: companyGeoType === "INDIAN" ? (companyDivision || undefined) : undefined,
                        pincodeEntry: companyGeoType === "INDIAN" ? (companyPincodeEntry || undefined) : undefined,
                        serviceCapabilities: requestedInterests,
                        registrationStatus: "PENDING_REVIEW",
                        isApproved: false,
                        assignedOperator: assignedOperatorId || undefined,
                    });
                    linkedCompanyId = createdCompany._id;
                    createdCompanyId = createdCompany._id;
                    if (selectedFunctionIds.length) {
                        await syncCompanyFunctions({
                            companyId: linkedCompanyId,
                            selectedFunctionIds,
                            selectedFunctionPriorities,
                        });
                    } else {
                        await syncCompanyFunctionMappings({
                            companyId: linkedCompanyId,
                            selectedSubFunctionIds,
                        });
                    }
                    if (requestedInterests.length) {
                        await syncCompanyInterests({
                            associateCompanyId: linkedCompanyId,
                            interests: requestedInterests,
                            updatedBy: null,
                            updatedByRole: "register",
                        });
                    }
                }
            }
        }

        let resolvedAssociateCountryId: any = undefined;
        let finalAssociateState: any = undefined;
        let finalAssociateDistrict: any = undefined;
        let finalAssociateDivision: any = undefined;
        let finalAssociatePincode: any = undefined;
        let finalAssociateGeoType = "INDIAN";

        if (!shouldLinkCompany) {
            finalAssociateGeoType = String(associateGeoType || "INDIAN").toUpperCase() === "INTERNATIONAL" ? "INTERNATIONAL" : "INDIAN";
            if (!associateAddress || !String(associateAddress).trim()) {
                return res.status(400).json({ success: false, message: "Address is required for individuals." });
            }
            if (finalAssociateGeoType === "INDIAN") {
                if (!associateState || !associateDistrict || !associateDivision) {
                    return res.status(400).json({ success: false, message: "For Indian address, state, district, and division are required." });
                }
                const stateExists = await StateModel.findById(associateState).select("_id");
                if (!stateExists) return res.status(400).json({ success: false, message: "Invalid state." });
                const districtExists = await DistrictModel.findOne({ _id: associateDistrict, state: associateState }).select("_id");
                if (!districtExists) return res.status(400).json({ success: false, message: "Invalid district." });
                const divisionExists = await DivisionModel.findOne({ _id: associateDivision, district: associateDistrict }).select("_id");
                if (!divisionExists) return res.status(400).json({ success: false, message: "Invalid division." });
                if (associatePincodeEntry) {
                    const pincodeExists = await PincodeEntryModel.findOne({ _id: associatePincodeEntry, division: associateDivision }).select("_id");
                    if (!pincodeExists) return res.status(400).json({ success: false, message: "Invalid pincode." });
                }
                finalAssociateState = associateState;
                finalAssociateDistrict = associateDistrict;
                finalAssociateDivision = associateDivision;
                finalAssociatePincode = associatePincodeEntry || undefined;
            } else {
                if (!associateCountry) return res.status(400).json({ success: false, message: "For international address, country is required." });
                const countryExists: any = await resolveCountry(associateCountry);
                if (!countryExists) return res.status(400).json({ success: false, message: "Invalid country." });
                resolvedAssociateCountryId = countryExists._id;
            }
        }

        // Create Associate in pending-review mode.
        const newAssociate = await AgentModel.create({
            name: name.trim(),
            email: trimmedEmail,
            phone: normalizedPhone,
            phoneCountryCode: normalizedPrimaryPhone.countryCode,
            phoneNational: normalizedPrimaryPhone.national,
            phoneSecondary: normalizedPhoneSecondary,
            phoneSecondaryCountryCode: normalizedPhoneSecondaryInput.countryCode || normalizedPrimaryPhone.countryCode,
            phoneSecondaryNational: normalizedPhoneSecondaryInput.national || normalizedPrimaryPhone.national,
            associateInterests: normalizedAssociateInterests,
            tradeMode: normalizeTradeMode(tradeMode),
            designation: designationId || undefined,
            associateCompany: linkedCompanyId || null,
            hasCompany: shouldLinkCompany,
            companyMode: shouldLinkCompany ? (companyMode === "new" ? "new" : "existing") : "none",
            address: !shouldLinkCompany ? String(associateAddress).trim() : undefined,
            geoType: !shouldLinkCompany ? finalAssociateGeoType : undefined,
            country: !shouldLinkCompany && finalAssociateGeoType === "INTERNATIONAL" ? resolvedAssociateCountryId : undefined,
            state: !shouldLinkCompany && finalAssociateGeoType === "INDIAN" ? finalAssociateState : undefined,
            district: !shouldLinkCompany && finalAssociateGeoType === "INDIAN" ? finalAssociateDistrict : undefined,
            division: !shouldLinkCompany && finalAssociateGeoType === "INDIAN" ? finalAssociateDivision : undefined,
            pincodeEntry: !shouldLinkCompany && finalAssociateGeoType === "INDIAN" ? finalAssociatePincode : undefined,
            password: password, // Plugin will hash this on save/create
            authProvider: String(req.body?.authProvider || "LOCAL").toUpperCase() === "GOOGLE" ? "GOOGLE" : "LOCAL",
            googleSub: req.body?.googleSub || null,
            googleEmailVerified: Boolean(req.body?.googleEmailVerified),
            role: "Associate",
            isActive: false,
            isEmailVerified: Boolean(req.body?.isEmailVerified) || false,
            isPhoneVerified: false,
            isOneToOneVerified: false,
            isCompanyVerified: false,
            registrationStatus: "PENDING_REVIEW",
            onboardingContactPreference: String(contactPreference || "phone").toLowerCase() === "email" ? "email" : "phone",
            onboardingContactNotes: String(contactNotes || "").trim(),
            registrationSource: "SELF_REGISTERED",
            assignedOperator: assignedOperatorId || undefined,
        });

        // Notify admins about new pending approvals
        try {
            const recipients = new Map<string, "Admin" | "Operator" | "Associate">();
            await notificationService.addAdmins(recipients);

            if (createdCompanyId) {
                await notificationService.createNotifications({
                    recipientMap: recipients,
                    createdByUserId: null,
                    type: NotificationTypes.APPROVAL_REQUESTED,
                    title: "New company approval request",
                    message: "A company registration is pending approval.",
                    entityType: NotificationEntityTypes.APPROVAL,
                    entityId: createdCompanyId,
                    route: "/dashboard/approvals",
                    payload: { companyId: createdCompanyId },
                    priority: "high",
                });
            }

            await notificationService.createNotifications({
                recipientMap: recipients,
                createdByUserId: null,
                type: NotificationTypes.APPROVAL_REQUESTED,
                title: "New associate approval request",
                message: "An associate registration is pending approval.",
                entityType: NotificationEntityTypes.APPROVAL,
                entityId: newAssociate._id,
                route: "/dashboard/approvals",
                payload: { associateId: newAssociate._id },
                priority: "high",
            });
        } catch (err) {
            logger.warn("Approval notification failed", { error: (err as any)?.message || String(err) });
        }

        // Return success (no auto-login for security)
        res.locals.createdUserId = newAssociate._id;
        res.status(201).json({
            success: true,
            message: "Registration submitted. Our team will contact you after verification review.",
            associate: {
                id: newAssociate._id,
                name: newAssociate.name,
                email: newAssociate.email,
                phone: newAssociate.phone,
                phoneCountryCode: (newAssociate as any).phoneCountryCode || normalizedPrimaryPhone.countryCode,
                phoneNational: (newAssociate as any).phoneNational || normalizedPrimaryPhone.national,
                associateInterests: (newAssociate as any).associateInterests || [],
                associateCompany: linkedCompanyId || null,
                registrationStatus: "PENDING_REVIEW",
                contactPreference: String(contactPreference || "phone"),
                contactNotes: String(contactNotes || ""),
            }
        });

    } catch (error: any) {
        console.error("Registration error:", error);

        return sendNormalizedAuthError(res, error, "Registration failed. Please try again later.");
    }
};

export const startOnboarding = async (req: Request, res: Response) => {
    try {
        const emailRaw = String(req.body?.email || "").trim().toLowerCase();
        const role = String(req.body?.role || "").trim();
        const now = Date.now();
        const draftWindowMs = 2 * 60 * 60 * 1000; // 2 hours

        if (!emailRaw || !role) {
            return res.status(400).json({ success: false, message: "Email and role are required." });
        }
        if (role !== "Associate" && role !== "Operator") {
            return res.status(400).json({ success: false, message: "Role must be Associate or Operator." });
        }

        const [admin, projectManager, inventoryManager, operator, associate] = await Promise.all([
            AdminModel.findOne({ email: emailRaw }).select("_id").lean(),
            ProjectManagerModel.findOne({ email: emailRaw }).select("_id").lean(),
            InventoryManagerModel.findOne({ email: emailRaw }).select("_id").lean(),
            OperatorModel.findOne({ email: emailRaw }).select("_id onboardingComplete authProvider registrationSource createdAt registrationStatus reviewNotes isActive isDeleted").lean(),
            AgentModel.findOne({ email: emailRaw }).select("_id onboardingComplete authProvider registrationSource createdAt isEmailVerified registrationStatus reviewNotes isActive isDeleted").lean(),
        ]);

        const isDraftWithinWindow = (user: any, checkEmailVerified: boolean) => {
            if (!user) return false;
            if (user.onboardingComplete) return false;
            if (checkEmailVerified && user.isEmailVerified === true) return false;
            if (String(user.authProvider || "LOCAL").toUpperCase() !== "LOCAL") return false;
            if (String(user.registrationSource || "SELF_REGISTERED").toUpperCase() !== "SELF_REGISTERED") return false;
            if (!user.createdAt) return false;
            const createdAt = new Date(user.createdAt).getTime();
            return now - createdAt <= draftWindowMs;
        };

        let operatorDoc: any = operator;
        let associateDoc: any = associate;

        if (operatorDoc && isDraftWithinWindow(operatorDoc, false)) {
            await Promise.all([
                OperatorModel.deleteOne({ _id: operatorDoc._id }),
                VerificationModel.deleteMany({ userId: String(operatorDoc._id) }),
            ]);
            operatorDoc = null;
        }

        if (associateDoc && isDraftWithinWindow(associateDoc, true)) {
            await Promise.all([
                AgentModel.deleteOne({ _id: associateDoc._id }),
                VerificationModel.deleteMany({ userId: String(associateDoc._id) }),
            ]);
            associateDoc = null;
        }

        const blockedPayload = toBlockedResponsePayload(operatorDoc || associateDoc);
        if (blockedPayload) {
            return res.status(403).json(blockedPayload);
        }

        if (admin || projectManager || inventoryManager || operatorDoc || associateDoc) {
            return res.status(409).json({ success: false, message: "Account already exists — sign in." });
        }

        const displayName = deriveDisplayName(emailRaw);
        const generatedPassword = generateRandomPassword();

        if (role === "Operator") {
            const newOperator = await OperatorModel.create({
                name: displayName,
                email: emailRaw,
                phone: DRAFT_PHONE_E164,
                phoneCountryCode: DRAFT_PHONE_COUNTRY,
                phoneNational: DRAFT_PHONE_NATIONAL,
                password: generatedPassword,
                address: DRAFT_OPERATOR_ADDRESS,
                authProvider: "LOCAL",
                isEmailVerified: false,
                onboardingComplete: false,
            });
            issueAuthCookie(res, { ...newOperator.toObject(), role: "Operator" }, false);
            return res.json({ success: true, user: { id: newOperator._id, email: newOperator.email, name: newOperator.name, role: "Operator" } });
        }

        const newAssociate = await AgentModel.create({
            name: displayName,
            email: emailRaw,
            phone: DRAFT_PHONE_E164,
            phoneCountryCode: DRAFT_PHONE_COUNTRY,
            phoneNational: DRAFT_PHONE_NATIONAL,
            password: generatedPassword,
            authProvider: "LOCAL",
            isEmailVerified: false,
            onboardingComplete: false,
            hasCompany: false,
            companyMode: "none",
            tradeMode: "BOTH",
        });
        issueAuthCookie(res, { ...newAssociate.toObject(), role: "Associate" }, false);
        return res.json({ success: true, user: { id: newAssociate._id, email: newAssociate.email, name: newAssociate.name, role: "Associate" } });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error?.message || "Failed to start onboarding." });
    }
};

export const completeOnboarding = async (req: Request, res: Response) => {
    try {
        const role = String(req.body?.role || req.user?.role || "").trim();
        const roleLower = role.toLowerCase();
        const userId = String(req.user?.id || "");

        if (!userId || !role) {
            return res.status(400).json({ success: false, message: "Invalid session." });
        }

        if (roleLower === "associate") {
            const associate = await AgentModel.findById(userId);
            if (!associate) {
                return res.status(404).json({ success: false, message: "Associate not found." });
            }

            const {
                name,
                email,
                phone,
                phoneCountryCode,
                phoneNational,
                phoneSecondary,
                phoneSecondaryCountryCode,
                phoneSecondaryNational,
                designation,
                hasCompany,
                companyMode,
                associateCompanyId,
                company,
                contactPreference,
                contactNotes,
                associateAddress,
                associateGeoType,
                associateCountry,
                associateState,
                associateDistrict,
                associateDivision,
                associatePincodeEntry,
                referralCode,
                password,
                tradeMode,
            } = req.body || {};

            if (!(hasCompany === true || String(hasCompany || "").toLowerCase() === "yes" || String(hasCompany || "").toLowerCase() === "true")) {
                return res.status(400).json({
                    success: false,
                    message: "Associate onboarding requires an existing or newly registered company. Individuals should register as Operators."
                });
            }
            if (!isTradeMode(tradeMode)) {
                return res.status(400).json({
                    success: false,
                    message: "Choose whether the company buys, sells, buys and sells, or provides trade services."
                });
            }

            if (!name || !email || !phone) {
                return res.status(400).json({ success: false, message: "Name, email, and phone are required." });
            }
            const verifiedEmail = await hasVerifiedOnboardingEmail(associate, "Associate", email);
            if (!verifiedEmail.ok) {
                return res.status(400).json({ success: false, message: verifiedEmail.message });
            }

            if (String(associate.authProvider || "LOCAL").toUpperCase() !== "GOOGLE") {
                if (!password) {
                    return res.status(400).json({ success: false, message: "Password is required." });
                }
                const hashed = await hashPassword(String(password));
                (associate as any).password = hashed;
            }

            const normalizedPrimary = normalizePhoneInput({
                rawPhone: phone,
                rawCountryCode: phoneCountryCode,
                rawNational: phoneNational,
            });
            const normalizedSecondary = normalizePhoneInput({
                rawPhone: phoneSecondary || phone,
                rawCountryCode: phoneSecondaryCountryCode || normalizedPrimary.countryCode,
                rawNational: phoneSecondaryNational,
                fallbackCountryCode: normalizedPrimary.countryCode,
            });

            associate.name = String(name).trim();
            associate.email = String(email).trim().toLowerCase();
            associate.phone = normalizedPrimary.e164;
            associate.phoneCountryCode = normalizedPrimary.countryCode;
            associate.phoneNational = normalizedPrimary.national;
            associate.phoneSecondary = normalizedSecondary.e164 || normalizedPrimary.e164;
            associate.phoneSecondaryCountryCode = normalizedSecondary.countryCode || normalizedPrimary.countryCode;
            associate.phoneSecondaryNational = normalizedSecondary.national || normalizedPrimary.national;
            associate.designation = designation || null;
            associate.tradeMode = normalizeTradeMode(tradeMode || associate.tradeMode);
            associate.onboardingContactPreference = String(contactPreference || "phone").toLowerCase() === "email" ? "email" : "phone";
            associate.onboardingContactNotes = String(contactNotes || "").trim();
            associate.address = String(associateAddress || "").trim();
            associate.geoType = (String(associateGeoType || "INDIAN").toUpperCase() === "INTERNATIONAL"
                ? "INTERNATIONAL"
                : "INDIAN");
            associate.country = associate.geoType === "INTERNATIONAL" ? associateCountry || null : null;
            associate.state = associate.geoType === "INDIAN" ? associateState || null : null;
            associate.district = associate.geoType === "INDIAN" ? associateDistrict || null : null;
            associate.division = associate.geoType === "INDIAN" ? associateDivision || null : null;
            associate.pincodeEntry = associate.geoType === "INDIAN" ? associatePincodeEntry || null : null;
            associate.hasCompany = Boolean(hasCompany);
            const normalizedCompanyMode = String(companyMode || "existing").toLowerCase();
            associate.companyMode = associate.hasCompany
                ? (normalizedCompanyMode === "new" ? "new" : "existing")
                : "none";
            if (!associate.hasCompany) {
                associate.associateCompany = null;
            }

            if (associate.hasCompany && associate.companyMode === "existing") {
                if (!associateCompanyId) {
                    return res.status(400).json({ success: false, message: "Please select an existing company." });
                }
                associate.associateCompany = associateCompanyId;
            }

            if (associate.hasCompany && associate.companyMode === "new") {
                const companyName = String(company?.name || "").trim();
                const companyEmail = String(company?.email || "").trim().toLowerCase();
                if (!companyName || !companyEmail) {
                    return res.status(400).json({ success: false, message: "Company name and email are required." });
                }
                const companyPhone = normalizePhoneInput({
                    rawPhone: company?.phone,
                    rawCountryCode: company?.phoneCountryCode,
                    rawNational: company?.phoneNational,
                });
                const companySecondary = normalizePhoneInput({
                    rawPhone: company?.phoneSecondary || company?.phone,
                    rawCountryCode: company?.phoneSecondaryCountryCode || companyPhone.countryCode,
                    rawNational: company?.phoneSecondaryNational,
                    fallbackCountryCode: companyPhone.countryCode,
                });
                if (!companyPhone.e164) {
                    return res.status(400).json({ success: false, message: "Valid company phone is required." });
                }
                const existingCompany = await AssociateCompanyModel.findOne({ email: companyEmail }).select("_id").lean();
                if (existingCompany) {
                    associate.associateCompany = existingCompany._id;
                } else {
                    const createdCompany = await AssociateCompanyModel.create({
                        name: companyName,
                        email: companyEmail,
                        phone: companyPhone.e164,
                        phoneCountryCode: companyPhone.countryCode,
                        phoneNational: companyPhone.national,
                        phoneSecondary: companySecondary.e164 || companyPhone.e164,
                        phoneSecondaryCountryCode: companySecondary.countryCode || companyPhone.countryCode,
                        phoneSecondaryNational: companySecondary.national || companyPhone.national,
                        geoType: company?.geoType || "INDIAN",
                        country: company?.country || null,
                        state: company?.state || null,
                        district: company?.district || null,
                        division: company?.division || null,
                        pincodeEntry: company?.pincodeEntry || null,
                        companyType: company?.companyType || null,
                        gstin: company?.gstin || undefined,
                        legalRegistrationNumber: company?.legalRegistrationNumber || undefined,
                        legalComplianceInfo: company?.legalComplianceInfo || undefined,
                        serviceCapabilities: Array.isArray(company?.subFunctionIds) ? company.subFunctionIds : [],
                        assignedOperator: null,
                        supervisor: associate._id,
                        address: company?.address || "",
                    });
                    associate.associateCompany = createdCompany._id;
                }
            }

            associate.referralCode = referralCode ? String(referralCode).trim().toUpperCase() : associate.referralCode;
            associate.onboardingComplete = true;
            (associate as any).approvalRequestedAt = new Date();
            await associate.save();

            return res.status(200).json({ success: true, message: "Onboarding completed." });
        }

        if (roleLower === "operator") {
            const operator = await OperatorModel.findById(userId);
            if (!operator) {
                return res.status(404).json({ success: false, message: "Operator not found." });
            }
            const {
                name,
                email,
                phone,
                phoneCountryCode,
                phoneNational,
                address,
                geoType,
                country,
                state,
                district,
                languageKnown,
                workingHours,
                joiningDate,
                password,
            } = req.body || {};

            if (!name || !email || !phone || !address) {
                return res.status(400).json({ success: false, message: "Name, email, phone, and address are required." });
            }
            const verifiedEmail = await hasVerifiedOnboardingEmail(operator, "Operator", email);
            if (!verifiedEmail.ok) {
                return res.status(400).json({ success: false, message: verifiedEmail.message });
            }
            const locationGeoType = String(geoType || "INDIAN").toUpperCase() === "INTERNATIONAL" ? "INTERNATIONAL" : "INDIAN";
            if (locationGeoType === "INDIAN" && (!state || !district)) {
                return res.status(400).json({ success: false, message: "State and district are required for Indian operators." });
            }
            if (locationGeoType === "INTERNATIONAL" && !String(country || "").trim()) {
                return res.status(400).json({ success: false, message: "Country is required for international operators." });
            }
            let resolvedCountryId: any = null;
            if (locationGeoType === "INTERNATIONAL") {
                const countryExists = await resolveCountry(country);
                if (!countryExists) {
                    return res.status(400).json({ success: false, message: "Invalid country. Please choose a valid country." });
                }
                resolvedCountryId = countryExists._id;
            }

            if (String(operator.authProvider || "LOCAL").toUpperCase() !== "GOOGLE") {
                if (!password) {
                    return res.status(400).json({ success: false, message: "Password is required." });
                }
                const hashed = await hashPassword(String(password));
                (operator as any).password = hashed;
            }

            const normalizedPrimary = normalizePhoneInput({
                rawPhone: phone,
                rawCountryCode: phoneCountryCode,
                rawNational: phoneNational,
            });

            operator.name = String(name).trim();
            operator.email = String(email).trim().toLowerCase();
            operator.phone = normalizedPrimary.e164;
            operator.phoneCountryCode = normalizedPrimary.countryCode;
            operator.phoneNational = normalizedPrimary.national;
            operator.address = String(address).trim();
            (operator as any).geoType = locationGeoType;
            (operator as any).country = locationGeoType === "INTERNATIONAL" ? resolvedCountryId : null;
            operator.state = locationGeoType === "INDIAN" ? (state || null) : null;
            operator.district = locationGeoType === "INDIAN" ? (district || null) : null;
            operator.languageKnown = Array.isArray(languageKnown) ? languageKnown : [];
            operator.workingHours = Array.isArray(workingHours) ? workingHours : [];
            operator.joiningDate = joiningDate ? new Date(joiningDate) : operator.joiningDate;
            operator.onboardingComplete = true;
            (operator as any).approvalRequestedAt = new Date();
            await operator.save();

            return res.status(200).json({ success: true, message: "Onboarding completed." });
        }

        return res.status(400).json({ success: false, message: "Unsupported role." });
    } catch (error: any) {
        return sendNormalizedAuthError(res, error, "Onboarding failed. Please check the details and try again.");
    }
};

/**
 * Register Page Bootstrap Data
 * GET /auth/register/options
 */
export const getRegisterOptions = async (_req: Request, res: Response) => {
    try {
        const allowedCompanyFunctionSlugs = new Set([
            "sourcing",
            "packaging",
            "testing",
            "warehouse-storage",
            "finance-risk",
            "importing-distribution",
            "freight-forwarding",
            "inland-logistics",
        ]);
        const [
            companyTypesRes,
            existingCompaniesRes,
            designationsRes,
            statesRes,
            districtsRes,
            divisionsRes,
            countriesRes,
            companyFunctionsRes,
            companySubFunctionsRes,
        ] = await Promise.allSettled([
            CompanyTypeModel.find({ isDeleted: { $ne: true } }).select("_id name").sort({ name: 1 }).lean(),
            AssociateCompanyModel.find({})
                .select("_id name email phone companyType serviceCapabilities")
                .sort({ name: 1 })
                .limit(1000)
                .lean(),
            DesignationModel.find({ isDeleted: { $ne: true } }).select("_id name").sort({ name: 1 }).lean(),
            StateModel.find({ isDeleted: { $ne: true } }).select("_id name code").sort({ name: 1 }).lean(),
            DistrictModel.find({ isDeleted: { $ne: true } }).select("_id name state").sort({ name: 1 }).lean(),
            DivisionModel.find({ isDeleted: { $ne: true } }).select("_id name district").sort({ name: 1 }).lean(),
            CountryModel.find({ isDeleted: { $ne: true } }).select("_id name code").sort({ name: 1 }).lean(),
            CompanyFunctionModel.find({ isActive: true }).select("_id name slug description orderIndex").sort({ orderIndex: 1, name: 1 }).lean(),
            CompanySubFunctionModel.find({ isActive: true }).select("_id functionId name slug description orderIndex").sort({ orderIndex: 1, name: 1 }).lean(),
        ]);

        const companyTypes = companyTypesRes.status === "fulfilled" ? companyTypesRes.value : [];
        const existingCompanies = existingCompaniesRes.status === "fulfilled" ? existingCompaniesRes.value : [];
        const designations = designationsRes.status === "fulfilled" ? designationsRes.value : [];
        const states = statesRes.status === "fulfilled" ? statesRes.value : [];
        const districts = districtsRes.status === "fulfilled" ? districtsRes.value : [];
        const divisions = divisionsRes.status === "fulfilled" ? divisionsRes.value : [];
        const countries = countriesRes.status === "fulfilled" ? countriesRes.value : [];
        const companyFunctions = companyFunctionsRes.status === "fulfilled"
            ? companyFunctionsRes.value.filter((fn: any) => allowedCompanyFunctionSlugs.has(String(fn?.slug || "").trim()))
            : [];
        const companySubFunctions = companySubFunctionsRes.status === "fulfilled" ? companySubFunctionsRes.value : [];
        const failedKeys = [
            companyTypesRes.status !== "fulfilled" ? "companyTypes" : null,
            existingCompaniesRes.status !== "fulfilled" ? "existingCompanies" : null,
            designationsRes.status !== "fulfilled" ? "designations" : null,
            statesRes.status !== "fulfilled" ? "states" : null,
            districtsRes.status !== "fulfilled" ? "districts" : null,
            divisionsRes.status !== "fulfilled" ? "divisions" : null,
            countriesRes.status !== "fulfilled" ? "countries" : null,
            companyFunctionsRes.status !== "fulfilled" ? "companyFunctions" : null,
            companySubFunctionsRes.status !== "fulfilled" ? "companySubFunctions" : null,
        ].filter(Boolean);

        res.json({
            success: true,
            data: {
                companyTypes,
                existingCompanies,
                designations,
                states,
                districts,
                divisions,
                pincodeEntries: [], // Pincodes are now fetched dynamically
                countries,
                companyFunctions,
                companySubFunctions,
            },
            meta: {
                partial: failedKeys.length > 0,
                failedKeys,
            },
        });
    } catch (error: any) {
        res.status(200).json({
            success: true,
            data: {
                companyTypes: [],
                existingCompanies: [],
                designations: [],
                states: [],
                districts: [],
                divisions: [],
                pincodeEntries: [],
                countries: [],
                companyFunctions: [],
                companySubFunctions: [],
            },
            meta: {
                partial: true,
                failedKeys: ["companyTypes", "existingCompanies", "designations", "states", "districts", "divisions", "countries", "companyFunctions", "companySubFunctions"],
                error: error?.message || "Failed to load registration options.",
            },
        });
    }
};

/**
 * Operator Registration Options
 * GET /auth/operator/register/options
 */
export const getOperatorRegisterOptions = async (_req: Request, res: Response) => {
    try {
        const [jobRolesRes, jobTypesRes, languagesRes, statesRes, districtsRes, countriesRes] = await Promise.allSettled([
            JobRoleModel.find({ isDeleted: { $ne: true } }).select("_id name").sort({ name: 1 }).lean(),
            JobTypeModel.find({ isDeleted: { $ne: true } }).select("_id name").sort({ name: 1 }).lean(),
            LanguageModel.find({ isDeleted: { $ne: true } }).select("_id name").sort({ name: 1 }).lean(),
            StateModel.find({ isDeleted: { $ne: true } }).select("_id name code").sort({ name: 1 }).lean(),
            DistrictModel.find({ isDeleted: { $ne: true } }).select("_id name state").sort({ name: 1 }).lean(),
            CountryModel.find({ isDeleted: { $ne: true } }).select("_id name code").sort({ name: 1 }).lean(),
        ]);

        res.json({
            success: true,
            data: {
                jobRoles: jobRolesRes.status === "fulfilled" ? jobRolesRes.value : [],
                jobTypes: jobTypesRes.status === "fulfilled" ? jobTypesRes.value : [],
                languages: languagesRes.status === "fulfilled" ? languagesRes.value : [],
                states: statesRes.status === "fulfilled" ? statesRes.value : [],
                districts: districtsRes.status === "fulfilled" ? districtsRes.value : [],
                countries: countriesRes.status === "fulfilled" ? countriesRes.value : [],
            },
        });
    } catch (error: any) {
        res.status(200).json({
            success: true,
            data: { jobRoles: [], jobTypes: [], languages: [], states: [], districts: [], countries: [] },
            meta: { partial: true, error: error?.message || "Failed to load operator registration options." },
        });
    }
};

/**
 * Register Operator
 * POST /auth/operator/register
 */
export const registerOperator = async (req: Request, res: Response) => {
    try {
        const {
            name,
            email,
            phone,
            phoneCountryCode,
            phoneNational,
            password,
            address,
            geoType,
            country,
            state,
            district,
            jobRole,
            jobType,
            languageKnown,
            referralCode,
            joiningDate,
        } = req.body;

        if (!name || !email || !phone || !password || !address) {
            return res.status(400).json({ success: false, message: "Name, email, phone, password, and address are required." });
        }
        const locationGeoType = String(geoType || "INDIAN").toUpperCase() === "INTERNATIONAL" ? "INTERNATIONAL" : "INDIAN";
        if (locationGeoType === "INDIAN" && (!state || !district)) {
            return res.status(400).json({ success: false, message: "State and district are required for Indian operators." });
        }
        if (locationGeoType === "INTERNATIONAL" && !String(country || "").trim()) {
            return res.status(400).json({ success: false, message: "Country is required for international operators." });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format." });
        }
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters, include one uppercase letter and one number.",
            });
        }

        const trimmedEmail = String(email || "").trim().toLowerCase();
        const normalizedPrimary = normalizePhoneInput({
            rawPhone: typeof phone === "object" ? phone?.value || phone?.e164 || "" : phone,
            rawCountryCode: typeof phone === "object" ? phone?.countryCode : phoneCountryCode,
            rawNational: typeof phone === "object" ? phone?.national : phoneNational,
        });

        if (!normalizedPrimary.e164) {
            return res.status(400).json({ success: false, message: "Valid phone number is required." });
        }
        let resolvedCountryId: any = null;
        if (locationGeoType === "INTERNATIONAL") {
            const countryExists = await resolveCountry(country);
            if (!countryExists) {
                return res.status(400).json({ success: false, message: "Invalid country. Please choose a valid country." });
            }
            resolvedCountryId = countryExists._id;
        }

        const [existingAssociate, existingAdmin, existingOperator] = await Promise.all([
            AgentModel.findOne({ email: trimmedEmail }).select("_id registrationStatus reviewNotes"),
            AdminModel.findOne({ email: trimmedEmail }).select("_id"),
            OperatorModel.findOne({ email: trimmedEmail }).select("_id registrationStatus reviewNotes"),
        ]);
        if (String((existingAssociate as any)?.registrationStatus || "").toUpperCase() === "REJECTED") {
            return sendRejectedAccountResponse(res, existingAssociate);
        }
        if (String((existingOperator as any)?.registrationStatus || "").toUpperCase() === "REJECTED") {
            return sendRejectedAccountResponse(res, existingOperator);
        }
        if (existingAssociate || existingAdmin || existingOperator) {
            return res.status(400).json({ success: false, message: "Registration failed. This email is already registered." });
        }

        const parsedWorkingHours = Array.isArray(req.body?.workingHours) ? req.body.workingHours : [];

        const normalizedReferral = String(referralCode || "").trim().toUpperCase();
        let mentorOperatorId: mongoose.Types.ObjectId | null = null;
        if (normalizedReferral) {
            const refOperator = await OperatorModel.findOne({
                referralCode: normalizedReferral,
                isDeleted: { $ne: true },
            }).select("_id");
            if (!refOperator) {
                return res.status(400).json({ success: false, message: "Invalid referral code." });
            }
            mentorOperatorId = refOperator._id as mongoose.Types.ObjectId;
        }

        const operator = await OperatorModel.create({
            name: String(name || "").trim(),
            email: trimmedEmail,
            phone: normalizedPrimary.e164,
            phoneCountryCode: normalizedPrimary.countryCode,
            phoneNational: normalizedPrimary.national,
            password,
            address: String(address || "").trim(),
            geoType: locationGeoType,
            country: locationGeoType === "INTERNATIONAL" ? resolvedCountryId : null,
            state: locationGeoType === "INDIAN" ? state : null,
            district: locationGeoType === "INDIAN" ? district : null,
            ...(jobRole ? { jobRole } : {}),
            ...(jobType ? { jobType } : {}),
            languageKnown: Array.isArray(languageKnown) ? languageKnown : [],
            joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
            workingHours: parsedWorkingHours,
            authProvider: String(req.body?.authProvider || "LOCAL").toUpperCase() === "GOOGLE" ? "GOOGLE" : "LOCAL",
            googleSub: req.body?.googleSub || null,
            googleEmailVerified: Boolean(req.body?.googleEmailVerified),
            isActive: false,
            registrationStatus: "PENDING_REVIEW",
            registrationSource: "SELF_REGISTERED",
            role: mentorOperatorId ? "team" : "operator",
            mentorOperator: mentorOperatorId,
        });

        const adminRecipientMap = new Map<string, "Admin">();
        await notificationService.addAdmins(adminRecipientMap);
        await notificationService.createNotifications({
            recipientMap: adminRecipientMap,
            createdByUserId: String(operator._id),
            type: NotificationTypes.APPROVAL_REQUESTED,
            title: "New operator registration",
            message: `${operator.name} submitted an operator registration for approval.`,
            entityType: NotificationEntityTypes.APPROVAL,
            entityId: operator._id,
            route: "/dashboard/approvals",
            priority: "medium",
            payload: { approvalType: "operator" },
        });

        res.locals.createdUserId = operator._id;
        return res.json({
            success: true,
            message: "Registration submitted for approval.",
            data: { id: operator._id },
        });
    } catch (error: any) {
        return sendNormalizedAuthError(res, error, "Registration failed. Please try again later.");
    }
};

/**
 * Public Registration Companies
 * GET /auth/register/companies
 */
export const getRegisterCompanies = async (_req: Request, res: Response) => {
    try {
        const existingCompanies = await AssociateCompanyModel.find({})
            .select("_id name email phone serviceCapabilities")
            .sort({ name: 1 })
            .limit(1000)
            .lean();

        res.json({ success: true, data: existingCompanies });
    } catch (error: any) {
        res.status(200).json({ success: true, data: [], meta: { partial: true, error: error?.message || "Failed to load companies." } });
    }
};

/**
 * Public Registration Designations
 * GET /auth/register/designations
 */
export const getRegisterDesignations = async (_req: Request, res: Response) => {
    try {
        const designations = await DesignationModel.find({ isDeleted: { $ne: true } })
            .select("_id name")
            .sort({ name: 1 })
            .lean();

        res.json({ success: true, data: designations });
    } catch (error: any) {
        res.status(200).json({ success: true, data: [], meta: { partial: true, error: error?.message || "Failed to load designations." } });
    }
};

/**
 * Public Registration Countries
 * GET /auth/register/countries
 */
/**
 * Public Registration Pincodes for a division
 * GET /auth/register/pincodes?divisionId=...
 */
export const getRegisterPincodes = async (req: Request, res: Response) => {
    try {
        const divisionId = String(req.query.divisionId || "").trim();
        if (!divisionId || !mongoose.Types.ObjectId.isValid(divisionId)) {
            return res.status(400).json({ success: false, message: "Valid divisionId is required." });
        }

        const pincodes = await PincodeEntryModel.find({
            division: divisionId,
            isDeleted: { $ne: true }
        })
            .select("_id pincode officename")
            .sort({ pincode: 1, officename: 1 })
            .lean();

        res.json({ success: true, data: pincodes });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error?.message || "Failed to load pincodes." });
    }
};

export const getRegisterCountries = async (_req: Request, res: Response) => {
    try {
        const countries = await CountryModel.find({ isDeleted: { $ne: true } })
            .select("_id name code")
            .sort({ name: 1 })
            .lean();

        res.json({ success: true, data: countries });
    } catch (error: any) {
        res.status(200).json({ success: true, data: [], meta: { partial: true, error: error?.message || "Failed to load countries." } });
    }
};

export const getCompanyInterestsStatus = async (req: Request, res: Response) => {
    try {
        const roleLower = String(req.user?.role || "").toLowerCase();
        const userId = String(req.user?.id || "");
        const requestedCompanyId = String(req.query.associateCompanyId || "").trim();
        let associateCompanyId = "";

        if (roleLower === "admin" && requestedCompanyId && mongoose.Types.ObjectId.isValid(requestedCompanyId)) {
            associateCompanyId = requestedCompanyId;
        } else if (roleLower === "associate") {
            const associate = await AgentModel.findById(userId).select("associateCompany").lean();
            associateCompanyId = String((associate as any)?.associateCompany || "");
        } else if (roleLower === "operator" || roleLower === "team") {
            if (requestedCompanyId) {
                if (!mongoose.Types.ObjectId.isValid(requestedCompanyId)) {
                    return res.status(400).json({ success: false, message: "Valid associateCompanyId is required for operator request." });
                }
                const requestedCompany = await AssociateCompanyModel.findById(requestedCompanyId).select("_id assignedOperator").lean();
                if (!requestedCompany) {
                    return res.status(404).json({ success: false, message: "Associate company not found." });
                }
                if (String((requestedCompany as any)?.assignedOperator || "") !== userId) {
                    return res.status(403).json({ success: false, message: "You can only access interests for your assigned companies." });
                }
                associateCompanyId = requestedCompanyId;
            } else {
                const companies = await AssociateCompanyModel.find({ assignedOperator: userId }).select("_id").limit(2).lean();
                if (companies.length === 1) associateCompanyId = String(companies[0]._id);
            }
        }

        if (!associateCompanyId || !mongoose.Types.ObjectId.isValid(associateCompanyId)) {
            return res.json({
                success: true,
                data: {
                    associateCompanyId: null,
                    companyInterestsConfigured: true,
                    companyInterests: [],
                },
            });
        }

        const [profile, company] = await Promise.all([
            CompanyInterestProfileModel.findOne({ associateCompanyId }).select("interests isConfigured").lean(),
            AssociateCompanyModel.findById(associateCompanyId).select("serviceCapabilities").lean(),
        ]);
        const interests = normalizeCompanyInterests(
            profile?.interests?.length ? profile.interests : company?.serviceCapabilities
        );
        return res.json({
            success: true,
            data: {
                associateCompanyId,
                companyInterestsConfigured: Boolean(interests.length),
                companyInterests: interests,
            },
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error?.message || "Failed to fetch company interests status." });
    }
};

export const upsertCompanyInterests = async (req: Request, res: Response) => {
    try {
        const roleLower = String(req.user?.role || "").toLowerCase();
        const userId = String(req.user?.id || "");
        const requestedCompanyId = String(req.body?.associateCompanyId || "").trim();
        let associateCompanyId = "";

        if (roleLower === "admin") {
            if (!requestedCompanyId || !mongoose.Types.ObjectId.isValid(requestedCompanyId)) {
                return res.status(400).json({ success: false, message: "associateCompanyId is required for admin update." });
            }
            associateCompanyId = requestedCompanyId;
        } else if (roleLower === "associate") {
            const associate = await AgentModel.findById(userId).select("associateCompany").lean();
            associateCompanyId = String((associate as any)?.associateCompany || "");
        } else if (roleLower === "operator" || roleLower === "team") {
            if (!requestedCompanyId || !mongoose.Types.ObjectId.isValid(requestedCompanyId)) {
                return res.status(400).json({
                    success: false,
                    message: "associateCompanyId is required for operator update.",
                });
            }
            const requestedCompany = await AssociateCompanyModel.findById(requestedCompanyId).select("_id assignedOperator").lean();
            if (!requestedCompany) {
                return res.status(404).json({ success: false, message: "Associate company not found." });
            }
            if (String((requestedCompany as any)?.assignedOperator || "") !== userId) {
                return res.status(403).json({ success: false, message: "You can only update interests for your assigned companies." });
            }
            associateCompanyId = requestedCompanyId;
        } else {
            return res.status(403).json({ success: false, message: "Not allowed to update company interests." });
        }

        if (!associateCompanyId || !mongoose.Types.ObjectId.isValid(associateCompanyId)) {
            return res.status(400).json({ success: false, message: "Associate company context not found." });
        }

        const company = await AssociateCompanyModel.findById(associateCompanyId).select("_id");
        if (!company) {
            return res.status(404).json({ success: false, message: "Associate company not found." });
        }

        const interests = normalizeCompanyInterests(req.body?.interests);
        if (!interests.length) {
            return res.status(400).json({ success: false, message: "At least one interest is required." });
        }

        const synced = await syncCompanyInterests({
            associateCompanyId,
            interests,
            updatedBy: userId,
            updatedByRole: req.user?.role || undefined,
        });

        return res.json({
            success: true,
            data: {
                associateCompanyId,
                companyInterestsConfigured: true,
                companyInterests: synced,
                allowedInterests: COMPANY_INTERESTS,
            },
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error?.message || "Failed to update company interests." });
    }
};

export const updateAssociateTradeMode = async (req: Request, res: Response) => {
    try {
        const roleLower = String(req.user?.role || "").toLowerCase();
        if (roleLower !== "associate") {
            return res.status(403).json({ success: false, message: "Only associates can update trading mode." });
        }
        const rawMode = String(req.body?.tradeMode || "").trim().toUpperCase();
        if (!isTradeMode(rawMode)) {
            return res.status(400).json({ success: false, message: "tradeMode must be BUY, SELL, BOTH, or SERVICE." });
        }
        const associate = await AgentModel.findByIdAndUpdate(
            req.user?.id,
            { $set: { tradeMode: rawMode } },
            { new: true, runValidators: true }
        ).select("_id tradeMode").lean();
        if (!associate) {
            return res.status(404).json({ success: false, message: "Associate not found." });
        }
        return res.json({ success: true, data: { tradeMode: associate.tradeMode } });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error?.message || "Failed to update trading mode." });
    }
};
