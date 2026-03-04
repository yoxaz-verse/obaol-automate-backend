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
        const assignedIdSet = new Set(assignedIds.map((companyId: any) => String(companyId)));

        const emptyQuery = { _id: "000000000000000000000000" };

        const mergeScopedCompanyQuery = (baseQuery: any, companyField: string) => {
            const scopedQuery = { ...(baseQuery || {}) };
            const explicitCompany = scopedQuery[companyField];

            if (explicitCompany) {
                if (typeof explicitCompany === "string") {
                    if (!assignedIdSet.has(String(explicitCompany))) {
                        return emptyQuery;
                    }
                    return scopedQuery;
                }

                if (explicitCompany && typeof explicitCompany === "object" && Array.isArray(explicitCompany.$in)) {
                    const allowed = explicitCompany.$in.filter((candidate: any) =>
                        assignedIdSet.has(String(candidate))
                    );
                    if (!allowed.length) {
                        return emptyQuery;
                    }
                    scopedQuery[companyField] = { ...explicitCompany, $in: allowed };
                    return scopedQuery;
                }
            }

            if (assignedIds.length === 0) {
                return emptyQuery;
            }

            scopedQuery[companyField] = { $in: assignedIds };
            return scopedQuery;
        };

        // 2. Inject company-based filtering depending on what we're looking for
        // In the CRUD engine, the 'query' is what gets passed to the repository.

        // If we are looking at companies themselves
        if (req.params?.entity === "associate-companies") {
            if (assignedIds.length === 0) {
                return emptyQuery;
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
            const view = String(req.query?.view || "").toLowerCase();

            if (req.params?.entity === "variant-rates" && view === "marketplace") {
                if (assignedIds.length === 0) {
                    return { ...query };
                }
                const marketQuery = { ...query, associateCompany: { $nin: assignedIds } };
                delete (marketQuery as any).view;
                return marketQuery;
            }

            return mergeScopedCompanyQuery(query, "associateCompany");
        }

        // If we are looking at associates
        if (req.params?.entity === "associates") {
            return mergeScopedCompanyQuery(query, "associateCompany");
        }
    }

    return query;
};
