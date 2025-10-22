import { Schema, model, models, Types } from "mongoose";

export interface GoalRoadmapStep {
  dayLabel: string;
  focus: string;
  actions: string[];
}

export interface GoalProgress {
  date: Date;
  value: number;
  note?: string;
  guidance?: string;
  checklist?: string[];
}

export interface GoalDocument {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  description?: string;
  targetDate?: Date;
  startDate?: Date;
  endDate?: Date;
  roadmapSummary?: string;
  roadmap: GoalRoadmapStep[];
  progressHistory: GoalProgress[];
  createdAt: Date;
  updatedAt: Date;
}

const GoalRoadmapSchema = new Schema<GoalRoadmapStep>(
  {
    dayLabel: { type: String, required: true },
    focus: { type: String, required: true },
    actions: { type: [String], default: [] },
  },
  { _id: false }
);

const GoalProgressSchema = new Schema<GoalProgress>(
  {
    date: { type: Date, default: Date.now },
    value: { type: Number, min: 0, max: 100, required: true },
    note: { type: String },
    guidance: { type: String },
    checklist: { type: [String], default: [] },
  },
  { _id: false }
);

const GoalSchema = new Schema<GoalDocument>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    targetDate: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
    roadmapSummary: { type: String },
    roadmap: { type: [GoalRoadmapSchema], default: [] },
    progressHistory: { type: [GoalProgressSchema], default: [] },
  },
  { timestamps: true }
);

export const Goal = models.Goal || model<GoalDocument>("Goal", GoalSchema);
