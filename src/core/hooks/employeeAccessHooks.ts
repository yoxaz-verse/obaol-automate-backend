import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { AssociateModel } from "../../database/models/associate";

/**
 * Hook to inject filters for employees (overseers).
 * Restricts access to data belonging to companies assigned to the employee.
 */
export const employeeFilterHook = async (query: any, mode: string, id: string | undefined, req: any): Promise<any> => {
    if (!req?.user) return query;

    const user = req.user;
    const roleLower = String(user.role || "").toLowerCase();
    // Both 'employee' and 'team' refer to the overseer role
    if (roleLower === "employee" || roleLower === "team") {

        // 1. Find all companies assigned to this employee
        const assignedCompanies = await AssociateCompanyModel.find({ assignedEmployee: user.id }).select("_id");
        const assignedIds = assignedCompanies.map(c => c._id);

        // 2. Inject company-based filtering depending on what we're looking for
        // In the CRUD engine, the 'query' is what gets passed to the repository.

        // If we are looking at companies themselves
        if (req.params?.entity === "associate-companies") {
            if (assignedIds.length === 0) {
                return { _id: "000000000000000000000000" };
            }
            return { ...query, _id: { $in: assignedIds } };
        }

        // If we are looking at enquiries
        if (req.params?.entity === "enquiries") {
            return {
                ...query,
                $or: [{ assignedEmployeeId: user.id }, { createdBy: user.id }]
            };
        }

        // If we are looking at variant-rates or displayed-rates
        if (req.params?.entity === "variant-rates" || req.params?.entity === "displayed-rates") {
            // For marketplace visibility, do not hard-block when no company mapping exists.
            if (assignedIds.length === 0) {
                return { ...query };
            }
            return { ...query, associateCompany: { $in: assignedIds } };
        }

        // If we are looking at associates
        if (req.params?.entity === "associates") {
            return { ...query, associateCompany: { $in: assignedIds } };
        }
    }

    return query;
};
