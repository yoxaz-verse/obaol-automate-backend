import { BaseService } from "./base.service";
import { SequenceModel } from "../../database/models/sequence"; // Import Model

export class SequenceService extends BaseService {

    constructor() {
        super();
    }

    public async getNextId(prefix: string, padding: number = 4): Promise<string> {
        const key = prefix.toUpperCase();
        const sequence = await SequenceModel.findOneAndUpdate(
            { key },
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );
        const count = sequence ? sequence.count : 1;
        const paddedCount = count.toString().padStart(padding, "0");
        return `${key}-${paddedCount}`;
    }

    public async getNextIdWithTemplate(
        template: string,
        fragments: Record<string, string>,
        padding: number = 4
    ): Promise<string> {
        let prefix = template;
        for (const [key, value] of Object.entries(fragments)) {
            prefix = prefix.replace(`{${key}}`, value.toUpperCase());
        }

        // Normalize prefix (replace non-alphanumeric with dash)
        prefix = prefix.replace(/[^A-Z0-9]/gi, "-").toUpperCase();

        return this.getNextId(prefix, padding);
    }
}
