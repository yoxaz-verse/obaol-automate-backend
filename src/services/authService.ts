import { Request, Response } from "express";
import mongoose from "mongoose";
import { AdminModel } from "../database/models/admin";
import { ProjectManagerModel } from "../database/models/projectManager";
import { EmployeeModel } from "../database/models/employee";
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

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const COUNTRY_ALIAS_TO_CODE: Record<string, string> = {
    UAE: "AE",
    USA: "US",
    UK: "GB",
    KSA: "SA",
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeCountryToken = (value: string) => String(value || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
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

export const authenticateUser = async (req: Request, res: Response) => {
    // ... (existing code, unchanged)
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        let user: any = null;
        let finalRole = role;

        const models: Record<string, any> = {
            "Admin": AdminModel,
            "ProjectManager": ProjectManagerModel,
            "Employee": EmployeeModel,
            "Associate": AgentModel,
            "ActivityManager": InventoryManagerModel,
            "Worker": EmployeeModel
        };

        if (role && models[role]) {
            user = await models[role].findOne({ email });
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
            if (registrationStatus !== "APPROVED" || user.isActive === false) {
                return res.status(401).json({ message: "Account pending admin approval." });
            }
            const linkedCompanyId = (user as any).associateCompany;
            if (linkedCompanyId) {
                const company = await AssociateCompanyModel.findById(linkedCompanyId)
                    .select("registrationStatus isApproved")
                    .lean();
                if (
                    !company ||
                    String((company as any).registrationStatus || "").toUpperCase() !== "APPROVED" ||
                    (company as any).isApproved !== true
                ) {
                    return res.status(401).json({ message: "Account pending admin approval." });
                }
            }
        } else if (user.isActive === false) {
            return res.status(401).json({ message: "Account is inactive. Please contact support." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const userForToken = {
            ...user.toObject(),
            role: finalRole,
            // Ensure associateCompany is included if present (for AssociateCompany scope)
            associateCompany: user.associateCompany
        };
        const token = generateJWTToken(userForToken);
        const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
        const cookieOptions = getAuthCookieOptions(host);

        res.setHeader("Cache-Control", "no-store");
        res.cookie("auth_token", token, cookieOptions);
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
                role: finalRole
            }
        });

    } catch (error: any) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email, role } = req.body;
        logger.info(`🔑 Password reset requested for: ${email} with role: ${role}`);
        if (!email || !role) return res.status(400).json({ message: "Email and role are required" });

        const models: Record<string, any> = {
            "Admin": AdminModel,
            "ProjectManager": ProjectManagerModel,
            "Employee": EmployeeModel,
            "Associate": AgentModel,
            "ActivityManager": InventoryManagerModel
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
            req.language
        );

        res.json({ success: true, message: "OTP sent to your email" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
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
            "ProjectManager": ProjectManagerModel,
            "Employee": EmployeeModel,
            "Associate": AgentModel,
            "ActivityManager": InventoryManagerModel
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
        res.status(500).json({ success: false, message: error.message });
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

        const existingAssociate = await AgentModel.findOne({ email: trimmedEmail });
        const existingAdmin = await AdminModel.findOne({ email: trimmedEmail });
        const existingEmployee = await EmployeeModel.findOne({ email: trimmedEmail });

        if (existingAssociate || existingAdmin || existingEmployee) {
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

        let linkedCompanyId: any = null;

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
                if (!selectedSubFunctionIds.length) {
                    return res.status(400).json({
                        success: false,
                        message: "Please select at least one company sub-function."
                    });
                }
                if (selectedSubFunctionIds.length > 10) {
                    return res.status(400).json({
                        success: false,
                        message: "You can select up to 10 company sub-functions."
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
                    await syncCompanyFunctionMappings({
                        companyId: linkedCompanyId,
                        selectedSubFunctionIds,
                    });
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
                    });
                    linkedCompanyId = createdCompany._id;
                    await syncCompanyFunctionMappings({
                        companyId: linkedCompanyId,
                        selectedSubFunctionIds,
                    });
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
            role: "Associate",
            isActive: false,
            isEmailVerified: false,
            isPhoneVerified: false,
            isOneToOneVerified: false,
            isCompanyVerified: false,
            registrationStatus: "PENDING_REVIEW",
            onboardingContactPreference: String(contactPreference || "phone").toLowerCase() === "email" ? "email" : "phone",
            onboardingContactNotes: String(contactNotes || "").trim(),
            registrationSource: "SELF_REGISTERED",
        });

        // Return success (no auto-login for security)
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

        // Handle duplicate key error (email already exists)
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Registration failed. The email or company name is already registered."
            });
        }

        res.status(500).json({
            success: false,
            message: error?.message || "Registration failed. Please try again later."
        });
    }
};

/**
 * Register Page Bootstrap Data
 * GET /auth/register/options
 */
export const getRegisterOptions = async (_req: Request, res: Response) => {
    try {
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
        const companyFunctions = companyFunctionsRes.status === "fulfilled" ? companyFunctionsRes.value : [];
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
        } else if (roleLower === "employee" || roleLower === "team") {
            const companies = await AssociateCompanyModel.find({ assignedEmployee: userId }).select("_id").limit(2).lean();
            if (companies.length === 1) associateCompanyId = String(companies[0]._id);
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
        } else if (roleLower === "employee" || roleLower === "team") {
            const companies = await AssociateCompanyModel.find({ assignedEmployee: userId }).select("_id").limit(2).lean();
            if (companies.length !== 1) {
                return res.status(400).json({
                    success: false,
                    message: "Employee interests setup requires exactly one assigned company context.",
                });
            }
            associateCompanyId = String(companies[0]._id);
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
