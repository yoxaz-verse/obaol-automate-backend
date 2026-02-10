import { IServiceResponse } from "../types";

export interface ILedgerEntry {
    type: string;
    entityId: string;
    amount?: number;
    metadata?: Record<string, any>;
    timestamp: Date;
}

/**
 * LedgerService
 * -------------
 * Standardized accounting and event logging.
 */
export abstract class BaseLedgerService {
    /**
     * Record a transaction or event in the ledger.
     */
    public abstract record(entry: ILedgerEntry): Promise<IServiceResponse>;

    /**
     * Aggregate totals for a specific entity (e.g., current balance).
     */
    public abstract getTotals(entityId: string): Promise<number>;
}
