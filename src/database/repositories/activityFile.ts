// src/database/repositories/ActivityFileRepository.ts

import ActivityFileModel from "../models/activityFile";
import { IActivityFile } from "../../interfaces/activityFile";

class ActivityFileRepository {
  async findByActivityId(activityId: string): Promise<IActivityFile | any> {
    return ActivityFileModel.findOne({ activityId }).populate("files.file");
  }

  async create(data: Partial<IActivityFile>): Promise<IActivityFile | any> {
    return ActivityFileModel.create(data);
  }

  async update(
    activityFileId: string,
    updateData: Partial<IActivityFile>
  ): Promise<IActivityFile | null> {
    return ActivityFileModel.findByIdAndUpdate(activityFileId, updateData, {
      new: true,
    });
  }
}

export default new ActivityFileRepository();
