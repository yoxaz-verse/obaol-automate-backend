import { Model } from "mongoose";
import { CustomerModel } from "../../database/models/customer";
import { LocationModel } from "../../database/models/location";
import { ProductModel } from "../../database/models/product";
import { ProductVariantModel } from "../../database/models/productVariant";
import { CategoryModel } from "../../database/models/category";
import { SubCategoryModel } from "../../database/models/subCategory";
import { QuantityUnitModel } from "../../database/models/quantityUnit";
import { AdminModel } from "../../database/models/admin";
import { ProjectManagerModel } from "../../database/models/projectManager";
import { InventoryManagerModel } from "../../database/models/inventoryManager";
import { AssociateModel as AgentModel } from "../../database/models/associate"; // Alias if needed
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { EmployeeModel } from "../../database/models/employee";
import { CountryModel } from "../../database/models/country";
import { StateModel } from "../../database/models/state";
import { CityModel } from "../../database/models/city";
import { DistrictModel } from "../../database/models/district";
import { DivisionModel } from "../../database/models/division";
import { PincodeEntryModel } from "../../database/models/pincodeEntry";
import { DesignationModel } from "../../database/models/designation";
import { JobRoleModel } from "../../database/models/jobRole";
import { JobTypeModel } from "../../database/models/jobType";
import { LanguageModel } from "../../database/models/language";
import { CompanyStageModel } from "../../database/models/companyStage";
import { CompanyTypeModel } from "../../database/models/companyType";
import { CompanyBusinessModelModel } from "../../database/models/companyBusinessModel";
import { CertificationModel } from "../../database/models/certification";
import { GeneralIntentModel } from "../../database/models/generalIntent";
import { SubIntentModel } from "../../database/models/subIntent";
import { ResearchedCompanyModel } from "../../database/models/researchedCompany";
import { InquiryModel } from "../../database/models/enquiry";
import { OrderModel } from "../../database/models/order";
import { EnquiryProcessStatusModel } from "../../database/models/enquiryProcessStatus";
import { AbbreviationModel } from "../../database/models/abbreviation";
import { UnLoCodeModel } from "../../database/models/unLoCode";
import { UnLoCodeFunctionsModel as UnLoCodeFunctionModel } from "../../database/models/unLoCodeFunction";
import { UnLoCodeStatusModel } from "../../database/models/unLoCodeStatus";
import { UnLoCodeAdminAreaModel } from "../../database/models/unLoCodeAdminArea";
import { VariantRateModel } from "../../database/models/variantRate";
import { DisplayedRateModel } from "../../database/models/displayedRate";
import { StatusHistoryModel } from "../../database/models/statusHistory";
import { LocationTypeModel } from "../../database/models/locationType";
import { RateAttachmentModel } from "../../database/models/rateAttachmentModel";
import { CatalogItemModel } from "../../database/models/catalogItem";
import FileModel from "../../database/models/file";
import { IncotermModel } from "../../database/models/incoterm";

export interface EntityConfig {
    model: Model<any>;
    searchableFields: string[];
    sortableFields: string[];
    allowedOperations: ("list" | "create" | "read" | "update" | "delete")[];
    relations?: Record<string, string>; // fieldName -> entityKey
}

export const EntityRegistry: Record<string, EntityConfig> = {
    // --- Core Workflows ---

    // --- Users & Roles ---
    "admins": {
        model: AdminModel,
        searchableFields: ["name", "email"],
        sortableFields: ["createdAt", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "project-managers": {
        model: ProjectManagerModel,
        searchableFields: ["name", "email"],
        sortableFields: ["createdAt", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "inventory-managers": {
        model: InventoryManagerModel,
        searchableFields: ["name", "email"],
        sortableFields: ["createdAt", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "associates": {
        model: AgentModel, // Check if export is AssociateModel or AgentModel
        searchableFields: ["name", "email", "phone"],
        sortableFields: ["createdAt", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: {
            associateCompany: "associate-companies",
            "associateCompany.companyType": "company-types",
            "associateCompany.state": "states",
            "associateCompany.district": "districts",
            "associateCompany.division": "divisions",
            "associateCompany.pincodeEntry": "pincode-entries",
            designation: "designations"
        },
    },
    "employees": {
        model: EmployeeModel,
        searchableFields: ["firstName", "lastName", "email"],
        sortableFields: ["createdAt", "firstName"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: {
            district: "districts",
            state: "states",
            jobRole: "job-roles",
            jobType: "job-types",
            languageKnown: "languages"
        },
    },
    "customers": {
        model: CustomerModel,
        searchableFields: ["name", "email", "phone", "companyName"],
        sortableFields: ["createdAt", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },

    // --- Catalog (Products & Rates) ---
    "products": {
        model: ProductModel,
        searchableFields: ["name", "description", "code"],
        sortableFields: ["createdAt", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: { subCategory: "sub-categories" },
    },
    "product-variants": {
        model: ProductVariantModel,
        searchableFields: ["name", "sku"],
        sortableFields: ["createdAt", "name", "price"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: { product: "products" },
    },
    "categories": {
        model: CategoryModel,
        searchableFields: ["name", "description"],
        sortableFields: ["createdAt", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "sub-categories": {
        model: SubCategoryModel,
        searchableFields: ["name", "description"],
        sortableFields: ["createdAt", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: { category: "categories" },
    },
    "variant-rates": {
        model: VariantRateModel,
        searchableFields: ["customId"],
        sortableFields: ["createdAt", "rate"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: {
            productVariant: "product-variants",
            "productVariant.product": "products",
            associate: "associates",
            "associate.associateCompany": "associate-companies",
            associateCompany: "associate-companies",
            "associateCompany.pincodeEntry": "pincode-entries",
            "associateCompany.state": "states",
            "associateCompany.district": "districts",
            "associateCompany.division": "divisions",
            "associateCompany.assignedEmployee": "employees"
        },
    },
    "displayed-rates": {
        model: DisplayedRateModel,
        searchableFields: [],
        sortableFields: ["createdAt"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: {
            variantRate: "variant-rates",
            "variantRate.productVariant": "product-variants",
            "variantRate.productVariant.product": "products",
            associate: "associates",
            "associate.associateCompany": "associate-companies",
            associateCompany: "associate-companies"
        },
    },
    "catalog-items": {
        model: CatalogItemModel,
        searchableFields: ["customTitle", "customDescription"],
        sortableFields: ["createdAt", "updatedAt"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: {
            productVariantId: "product-variants",
            "productVariantId.product": "products",
            baseRateId: "variant-rates",
            associateId: "associates",
            associateCompanyId: "associate-companies"
        },
    },
    "rate-attachments": {
        model: RateAttachmentModel,
        searchableFields: ["name"],
        sortableFields: ["createdAt"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },

    // --- Locations & Geography ---
    "locations": {
        model: LocationModel,
        searchableFields: ["name", "address", "city", "state", "customId"],
        sortableFields: ["createdAt", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "countries": {
        model: CountryModel,
        searchableFields: ["name", "code", "iso2", "iso3"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "states": {
        model: StateModel,
        searchableFields: ["name", "code"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "cities": {
        model: CityModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "districts": {
        model: DistrictModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: { state: "states" },
    },
    "divisions": {
        model: DivisionModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: { district: "districts" },
    },
    "pincode-entries": {
        model: PincodeEntryModel,
        searchableFields: ["pincode", "officeName"],
        sortableFields: ["pincode"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: { division: "divisions" },
    },
    "location-types": {
        model: LocationTypeModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "un-lo-codes": {
        model: UnLoCodeModel,
        searchableFields: ["name", "loCode", "country"],
        sortableFields: ["name", "loCode"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: {
            country: "countries",
            functions: "un-lo-code-functions",
            status: "un-lo-code-statuses",
            adminArea: "un-lo-code-admin-areas",
        },
    },
    "un-lo-code-functions": {
        model: UnLoCodeFunctionModel,
        searchableFields: ["name", "code"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "un-lo-code-statuses": {
        model: UnLoCodeStatusModel,
        searchableFields: ["description", "code"],
        sortableFields: ["description"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "un-lo-code-admin-areas": {
        model: UnLoCodeAdminAreaModel,
        searchableFields: ["name", "code"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },

    // --- Company Metadata & Research ---
    "associate-companies": {
        model: AssociateCompanyModel,
        searchableFields: ["name"],
        sortableFields: ["createdAt", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: {
            state: "states",
            district: "districts",
            division: "divisions",
            pincodeEntry: "pincode-entries",
            companyType: "company-types",
            assignedEmployee: "employees"
        },
    },
    "researched-companies": {
        model: ResearchedCompanyModel,
        searchableFields: ["name", "website"],
        sortableFields: ["createdAt", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: {
            submittedBy: "employees",
            product: "products",
            certification: "certifications",
            companyBusinessModel: "company-business-models",
            companyType: "company-types",
            companyStage: "company-stages",
            companyIntent: "sub-intents",
            state: "states",
            district: "districts",
            division: "divisions",
            pincodeEntry: "pincode-entries"
        }
    },
    "company-stages": {
        model: CompanyStageModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "company-types": {
        model: CompanyTypeModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "company-business-models": {
        model: CompanyBusinessModelModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "certifications": {
        model: CertificationModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "general-intents": {
        model: GeneralIntentModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "sub-intents": {
        model: SubIntentModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },

    // --- Inquiries (Clean Engine) ---
    "enquiries": {
        model: InquiryModel,
        searchableFields: ["specifications"],
        sortableFields: ["createdAt", "status"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: {
            productId: "products",
            buyerAssociateId: "associates",
            sellerAssociateId: "associates",
            mediatorAssociateId: "associates",
            assignedEmployeeId: "employees"
        },
    },
    "orders": {
        model: OrderModel,
        searchableFields: ["status", "paymentStatus", "invoiceId"],
        sortableFields: ["createdAt", "updatedAt"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
        relations: {
            enquiry: "enquiries",
            "enquiry.associateCompany": "associate-companies",
            "enquiry.associateCompany.assignedEmployee": "employees",
            "enquiry.productVariant": "product-variants",
            "enquiry.productVariant.product": "products",
            "enquiry.productAssociate": "associates"
        },
    },
    "enquiry-process-statuses": {
        model: EnquiryProcessStatusModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },

    "incoterms": {
        model: IncotermModel,
        searchableFields: ["code", "name"],
        sortableFields: ["code", "name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },

    // --- Configuration & Utils ---
    "quantity-units": {
        model: QuantityUnitModel,
        searchableFields: ["name", "symbol"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "abbreviations": {
        model: AbbreviationModel,
        searchableFields: ["fullForm", "shortForm"],
        sortableFields: ["shortForm"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "designations": {
        model: DesignationModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "job-roles": {
        model: JobRoleModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "job-types": {
        model: JobTypeModel,
        searchableFields: ["name"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "languages": {
        model: LanguageModel,
        searchableFields: ["name", "code"],
        sortableFields: ["name"],
        allowedOperations: ["list", "create", "read", "update", "delete"],
    },
    "status-histories": {
        model: StatusHistoryModel,
        searchableFields: ["entityType", "status"],
        sortableFields: ["createdAt"],
        allowedOperations: ["list", "read"], // Usually read-only or internal create
    },
    "files": {
        model: FileModel,
        searchableFields: ["originalName", "mimeType"],
        sortableFields: ["createdAt"],
        allowedOperations: ["list", "create", "read", "delete"],
    }
};

export const getEntityConfig = (entityName: string): EntityConfig | undefined => {
    return EntityRegistry[entityName];
}

export const getModelForEntity = (entityName: string): Model<any> | undefined => {
    return EntityRegistry[entityName]?.model;
}
