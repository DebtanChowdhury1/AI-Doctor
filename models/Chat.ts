import { Schema, model, models } from "mongoose";

const MessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    citations: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ChatSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    sourceType: { type: String, enum: ["youtube", "topic", "text"], default: "topic" },
    sourceValue: { type: String },
    insights: { type: [String], default: [] },
    followUpPrompt: { type: String },
    messages: { type: [MessageSchema], default: [] },
    pdfUrl: { type: String },
  },
  { timestamps: true },
);

const ChatModel = models.Chat || model("Chat", ChatSchema);
export default ChatModel;
