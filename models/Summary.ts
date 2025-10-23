import { Schema, model, models } from "mongoose";

const QuizSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false },
);

const SummarySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    source: { type: String, required: true },
    originalText: { type: String, required: true },
    summary: { type: String, required: true },
    keyPoints: { type: [String], default: [] },
    quiz: { type: [QuizSchema], default: [] },
    pdfUrl: { type: String },
  },
  { timestamps: true },
);

const SummaryModel = models.Summary || model("Summary", SummarySchema);
export default SummaryModel;
