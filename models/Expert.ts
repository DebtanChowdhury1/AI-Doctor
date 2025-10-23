import { Schema, model, models } from "mongoose";

const ExpertSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    prompt: { type: String, required: true },
    description: { type: String },
    icon: { type: String, default: "sparkles" },
    tone: { type: String, default: "mentor" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const ExpertModel = models.Expert || model("Expert", ExpertSchema);
export default ExpertModel;
