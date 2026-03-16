const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const normalizeRow = (row: any) =>
  typeof row?.toObject === "function" ? row.toObject() : { ...row };

export const operatorReadNormalizationHook = async (rows: any[]): Promise<any[]> => {
  const now = Date.now();

  return (rows || []).map((row: any) => {
    const normalized = normalizeRow(row);
    const lastSeenAt = normalized?.lastSeenAt ? new Date(normalized.lastSeenAt) : null;
    const isOnline = Boolean(lastSeenAt && (now - lastSeenAt.getTime()) <= ONLINE_WINDOW_MS);

    return {
      ...normalized,
      presenceStatus: isOnline ? "ONLINE" : "OFFLINE",
      lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
    };
  });
};
