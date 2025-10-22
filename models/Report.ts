import { Schema, model, models, Types } from "mongoose";

export interface ReportSection {
  heading: string;
  bullets: string[];
}

export interface ReportDocument {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  summary: string;
  careNote?: string;
  focusHighlights: string[];
  sections: ReportSection[];
  personalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSectionSchema = new Schema<ReportSection>(
  {
    heading: { type: String, required: true },
    bullets: { type: [String], default: [] },
  },
  { _id: false }
);

const ReportSchema = new Schema<ReportDocument>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    careNote: { type: String },
    focusHighlights: { type: [String], default: [] },
    sections: { type: [ReportSectionSchema], default: [] },
    personalNotes: { type: String },
  },
  { timestamps: true }
);

export const Report = models.Report || model<ReportDocument>("Report", ReportSchema);
