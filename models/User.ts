import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String },
    avatarUrl: { type: String },
    xp: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    preferences: {
      theme: { type: String, default: "system" },
      notifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export type UserPreferences = {
  theme: "light" | "dark" | "system" | string;
  notifications: boolean;
};

export interface UserEntity {
  clerkId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  xp: number;
  badges: string[];
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const UserModel = models.User || model("User", UserSchema);
export default UserModel;
