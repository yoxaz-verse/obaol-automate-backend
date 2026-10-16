import mongoose, { ClientSession, Model, Types } from "mongoose";
import { randomUUID } from "crypto";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { DataIntegrityAuditModel } from "../database/models/dataIntegrityAudit";

type Relation = { model: Model<any>; modelName: string; path: string; ref: string; unlinkOnly: boolean; extraFilter?: Record<string, any>; stringIds?: boolean };
type CountMap = Record<string, number>;

const UNLINK_ONLY_PATHS = new Set(["referredByCompanyId", "supervisor"]);
const TARGET_REFS = new Set(["Associate", "AssociateCompany"]);
const DELETE_BATCH_SIZE = 500;

const schemaRelations = (refs?: Set<string>): Relation[] => mongoose.modelNames().flatMap((modelName) => {
  const model = mongoose.model(modelName) as Model<any>;
  return Object.entries(model.schema.paths).flatMap(([path, schemaType]: [string, any]) => {
    const ref = String(schemaType?.options?.ref || schemaType?.caster?.options?.ref || "");
    if (!ref || (refs && !refs.has(ref))) return [];
    return [{ model, modelName, path, ref, unlinkOnly: UNLINK_ONLY_PATHS.has(path) }];
  });
});

const manualRelations = (): Relation[] => [
  ["AuthSession", "userId", "role", /^associate$/i],
  ["AuthPasskey", "userId", "role", /^associate$/i],
  ["AuthChallenge", "userId", "role", /^associate$/i],
  ["Verification", "userId", "userType", /^associate$/i, true],
  ["Notification", "recipientUserId", "recipientRole", /^associate$/i],
  ["SupportConversation", "requesterId", "requesterRole", /^associate$/i],
  ["SupportMessage", "senderId", "senderRole", /^associate$/i],
  ["SupportRating", "requesterId", "requesterRole", /^associate$/i],
  ["RateRevealEvent", "viewerId", "viewerRole", /^associate$/i],
].flatMap(([modelName, path, rolePath, roleValue, stringIds]: any[]) => {
  if (!mongoose.modelNames().includes(modelName)) return [];
  const model = mongoose.model(modelName) as Model<any>;
  return [{ model, modelName, path, ref: "Associate", unlinkOnly: false, extraFilter: { [rolePath]: roleValue }, stringIds: Boolean(stringIds) }];
});

const registeredRelations = (refs?: Set<string>): Relation[] => [
  ...schemaRelations(refs),
  ...manualRelations().filter((relation) => !refs || refs.has(relation.ref)),
];

const relationIds = (relation: Relation, ids: any[]) => relation.stringIds ? ids.map(String) : ids;
const relationFilter = (relation: Relation, ids: any[], operator: "$in" | "$nin") => ({
  ...(relation.extraFilter || {}),
  [relation.path]: { $exists: true, $ne: null, [operator]: relationIds(relation, ids) },
});

const existingIds = async (modelName: string, session?: ClientSession) => {
  if (!mongoose.modelNames().includes(modelName)) return [];
  return mongoose.model(modelName).find({}, { _id: 1 }).session(session || null).distinct("_id");
};

export type OrphanEntry = { model: string; collection: string; path: string; ref: string; count: number; action: "DELETE" | "UNLINK" };

export async function scanAssociateOrphans(session?: ClientSession): Promise<OrphanEntry[]> {
  const idCache = new Map<string, any[]>();
  const output: OrphanEntry[] = [];
  for (const relation of registeredRelations(TARGET_REFS)) {
    if (!idCache.has(relation.ref)) idCache.set(relation.ref, await existingIds(relation.ref, session));
    const count = await relation.model.countDocuments(relationFilter(relation, idCache.get(relation.ref) || [], "$nin")).session(session || null);
    if (count > 0) output.push({
      model: relation.modelName,
      collection: relation.model.collection.name,
      path: relation.path,
      ref: relation.ref,
      count,
      action: relation.unlinkOnly ? "UNLINK" : "DELETE",
    });
  }
  return output.sort((a, b) => b.count - a.count || a.collection.localeCompare(b.collection));
}

const unlinkRelation = async (relation: Relation, filter: any, session: ClientSession) => {
  const pathType: any = relation.model.schema.path(relation.path);
  const update = pathType?.instance === "Array" ? { $pull: { [relation.path]: filter[relation.path].$in ? { $in: filter[relation.path].$in } : filter[relation.path] } } : { $unset: { [relation.path]: 1 } };
  return relation.model.updateMany(filter, update as any, { session });
};

export async function cleanupAssociateOrphans(confirmation: string, actorId = "system-cli") {
  if (confirmation !== "DELETE ORPHANED DATA") throw Object.assign(new Error("Type DELETE ORPHANED DATA to confirm cleanup."), { status: 400 });
  const session = await mongoose.startSession();
  const auditId = randomUUID();
  const deleted: CountMap = {};
  const unlinked: CountMap = {};
  try {
    await session.withTransaction(async () => {
      for (let pass = 0; pass < 1000; pass += 1) {
        const entries = await scanAssociateOrphans(session);
        if (!entries.length) break;
        for (const entry of entries) {
          const relation = registeredRelations(TARGET_REFS).find((row) => row.modelName === entry.model && row.path === entry.path)!;
          const validIds = await existingIds(entry.ref, session);
          const filter = relationFilter(relation, validIds, "$nin");
          if (entry.action === "UNLINK") {
            const result: any = await unlinkRelation(relation, filter, session);
            unlinked[entry.collection] = (unlinked[entry.collection] || 0) + Number(result.modifiedCount || 0);
          } else {
            const rows = await relation.model.find(filter, { _id: 1 }).limit(DELETE_BATCH_SIZE).session(session).lean();
            const result = await relation.model.deleteMany({ _id: { $in: rows.map((row: any) => row._id) } }, { session });
            deleted[entry.collection] = (deleted[entry.collection] || 0) + Number(result.deletedCount || 0);
          }
        }
      }
      await DataIntegrityAuditModel.create([{ auditId, operation: "ORPHAN_CLEANUP", actorId, deleted, unlinked }], { session });
    });
    return { auditId, deleted, unlinked, remaining: await scanAssociateOrphans() };
  } finally {
    await session.endSession();
  }
}

const addIds = (map: Map<string, Set<string>>, modelName: string, ids: any[]) => {
  if (!map.has(modelName)) map.set(modelName, new Set());
  const bucket = map.get(modelName)!;
  const before = bucket.size;
  ids.forEach((id) => id && bucket.add(String(id)));
  return bucket.size !== before;
};

async function buildCascade(seed: Map<string, Set<string>>, session?: ClientSession) {
  const targets = new Map(Array.from(seed.entries()).map(([key, values]) => [key, new Set(values)]));
  for (let pass = 0; pass < 20; pass += 1) {
    let changed = false;
    for (const relation of registeredRelations()) {
      if (relation.unlinkOnly) continue;
      const ids = Array.from(targets.get(relation.ref) || []);
      if (!ids.length) continue;
      const rows = await relation.model.find(relationFilter(relation, ids, "$in"), { _id: 1 }).session(session || null).lean();
      if (addIds(targets, relation.modelName, rows.map((row: any) => row._id))) changed = true;
    }
    if (!changed) break;
  }
  return targets;
}

const cascadeCounts = (targets: Map<string, Set<string>>) => Object.fromEntries(
  Array.from(targets.entries()).filter(([, ids]) => ids.size).map(([model, ids]) => [model, ids.size])
);

export async function previewPermanentDelete(kind: "associate" | "company", id: string) {
  if (!Types.ObjectId.isValid(id)) throw Object.assign(new Error("Invalid target id."), { status: 400 });
  const target: any = kind === "associate"
    ? await AssociateModel.findById(id).select("_id email name").lean()
    : await AssociateCompanyModel.findById(id).select("_id name").lean();
  if (!target) throw Object.assign(new Error("Target not found."), { status: 404 });
  const seed = new Map<string, Set<string>>();
  if (kind === "associate") addIds(seed, "Associate", [target._id]);
  else {
    addIds(seed, "AssociateCompany", [target._id]);
    const associates = await AssociateModel.find({ associateCompany: target._id }, { _id: 1 }).lean();
    addIds(seed, "Associate", associates.map((row: any) => row._id));
  }
  const targets = await buildCascade(seed);
  return { kind, id, label: target.name || target.email, confirmationValue: kind === "associate" ? target.email : target.name, counts: cascadeCounts(targets) };
}

export async function permanentlyDelete(kind: "associate" | "company", id: string, confirmation: string, actorId = "system-cli") {
  const preview = await previewPermanentDelete(kind, id);
  if (confirmation !== preview.confirmationValue) throw Object.assign(new Error("Typed confirmation does not match."), { status: 400 });
  const session = await mongoose.startSession();
  const auditId = randomUUID();
  const deleted: CountMap = {};
  const unlinked: CountMap = {};
  try {
    await session.withTransaction(async () => {
      const seed = new Map<string, Set<string>>();
      if (kind === "associate") addIds(seed, "Associate", [id]);
      else {
        addIds(seed, "AssociateCompany", [id]);
        const associates = await AssociateModel.find({ associateCompany: id }, { _id: 1 }).session(session).lean();
        addIds(seed, "Associate", associates.map((row: any) => row._id));
      }
      const targets = await buildCascade(seed, session);
      for (const relation of registeredRelations()) {
        if (!relation.unlinkOnly) continue;
        const refIds = Array.from(targets.get(relation.ref) || []);
        if (!refIds.length) continue;
        const result: any = await unlinkRelation(relation, relationFilter(relation, refIds, "$in"), session);
        unlinked[relation.model.collection.name] = (unlinked[relation.model.collection.name] || 0) + Number(result.modifiedCount || 0);
      }
      for (const [modelName, ids] of Array.from(targets.entries()).reverse()) {
        if (!ids.size || !mongoose.modelNames().includes(modelName)) continue;
        const model = mongoose.model(modelName);
        const modelIds = Array.from(ids);
        for (let offset = 0; offset < modelIds.length; offset += DELETE_BATCH_SIZE) {
          const result = await model.deleteMany({ _id: { $in: modelIds.slice(offset, offset + DELETE_BATCH_SIZE) } }, { session });
          deleted[model.collection.name] = (deleted[model.collection.name] || 0) + Number(result.deletedCount || 0);
        }
      }
      await DataIntegrityAuditModel.create([{
        auditId,
        operation: kind === "associate" ? "PERMANENT_ASSOCIATE_DELETE" : "PERMANENT_COMPANY_DELETE",
        actorId,
        targetId: id,
        targetLabel: preview.label,
        deleted,
        unlinked,
      }], { session });
    });
    return { auditId, target: preview, deleted, unlinked };
  } finally {
    await session.endSession();
  }
}
