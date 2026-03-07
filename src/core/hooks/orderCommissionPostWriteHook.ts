import { ExecutionMode } from "../types";
import { CommissionEngine } from "../../services/commissionEngine";

export const orderCommissionPostWriteHook = async (
    _entity: string,
    result: any,
    mode: ExecutionMode
) => {
    if (mode !== ExecutionMode.CREATE && mode !== ExecutionMode.UPDATE) return;

    const orderId = String(result?._id || "").trim();
    if (!orderId) return;

    await CommissionEngine.processTradeCommission(orderId);
};
