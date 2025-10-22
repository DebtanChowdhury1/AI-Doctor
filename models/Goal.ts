import { Schema, model, models, Types } from "mongoose";

export interface GoalProgress {
  date: Date;
  value: number;
  note?: string;
}

export interface GoalDocument {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  description?: string;
  targetDate?: Date;
  progressHistory: GoalProgress[];
  createdAt: Date;
  updatedAt: Date;
}

const GoalProgressSchema = new Schema<GoalProgress>(
  {
    date: { type: Date, default: Date.now },
    value: { type: Number, min: 0, max: 100, required: true },
    note: { type: String },
  },
  { _id: false }
);

const GoalSchema = new Schema<GoalDocument>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    targetDate: { type: Date },
    progressHistory: { type: [GoalProgressSchema], default: [] },
  },
  { timestamps: true }
);

export const Goal = models.Goal || model<GoalDocument>("Goal", GoalSchema);
