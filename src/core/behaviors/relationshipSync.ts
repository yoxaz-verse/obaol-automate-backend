export class RelationshipSync {
    /**
     * Determines if the associateCompany field needs to be updated.
     * It should update if the associate field is modified and present.
     */
    static shouldSyncAssociateCompany(
        isAssociateModified: boolean,
        associateId?: any // Using any to accept ObjectId or string
    ): boolean {
        return isAssociateModified && !!associateId;
    }
}
