import { Schema, model, models, Types } from "mongoose";

export interface Message {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  imageBase64?: string;
}

export interface ChatDocument {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<Message>(
  {
    role: { type: String, required: true, enum: ["user", "assistant"] },
    content: { type: String, required: true },
    imageBase64: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ChatSchema = new Schema<ChatDocument>(
  {
    userId: { type: String, required: true, index: true },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Untitled consultation",
    },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true }
);

export const Chat = models.Chat || model<ChatDocument>("Chat", ChatSchema);
