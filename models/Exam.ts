import { Schema, model, models } from "mongoose";

const QuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["mcq", "short"], required: true },
    prompt: { type: String, required: true },
    options: { type: [String], default: [] },
    answer: { type: String, required: true },
    explanation: { type: String, required: true },
    userAnswer: { type: String },
    isCorrect: { type: Boolean },
  },
  { _id: false },
);

const ExamSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    questions: { type: [QuestionSchema], default: [] },
    score: { type: Number, default: 0 },
    gradingGuide: { type: String },
    pdfUrl: { type: String },
  },
  { timestamps: true },
);

const ExamModel = models.Exam || model("Exam", ExamSchema);
export default ExamModel;
