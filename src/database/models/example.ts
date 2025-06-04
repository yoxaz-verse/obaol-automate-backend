import mongoose, { Schema } from 'mongoose';

const ExampleSchema = new Schema({
  name: { type: String, required: true },
  code: { type: Number }
}, { timestamps: true });

export const ExampleModel = mongoose.model('Example', ExampleSchema);
