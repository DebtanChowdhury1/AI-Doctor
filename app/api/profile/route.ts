import { NextResponse } from "next/server";

import UserModel from "@/models/User";
import { uploadAvatar } from "@/lib/cloudinary";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

export async function GET() {
  const { userId, user } = await requireAuth();
  await connectToDatabase();

  let record = await UserModel.findOne({ clerkId: userId });
  if (!record) {
    record = await UserModel.create({
      clerkId: userId,
      email: user!.emailAddresses[0]?.emailAddress ?? "",
      name: user?.fullName ?? "",
      avatarUrl: user?.imageUrl,
    });
  }

  return NextResponse.json({
    profile: {
      name: record.name,
      email: record.email,
      avatarUrl: record.avatarUrl,
      xp: record.xp,
      badges: record.badges,
      preferences: record.preferences,
    },
  });
}

export async function PATCH(request: Request) {
  const { userId, user } = await requireAuth();
  await connectToDatabase();

  const payload = await request.json();
  const update: Record<string, unknown> = {};

  if (payload.name) update.name = payload.name;
  if (payload.preferences) update.preferences = payload.preferences;

  if (payload.avatar) {
    const url = await uploadAvatar(payload.avatar, `avatar-${userId}`);
    update.avatarUrl = url;
  }

  const record = await UserModel.findOneAndUpdate(
    { clerkId: userId },
    {
      $set: update,
      $setOnInsert: {
        email: user!.emailAddresses[0]?.emailAddress ?? "",
        name: payload.name ?? user?.fullName ?? "",
      },
    },
    { new: true, upsert: true },
  );

  return NextResponse.json({
    profile: {
      name: record.name,
      email: record.email,
      avatarUrl: record.avatarUrl,
      xp: record.xp,
      badges: record.badges,
      preferences: record.preferences,
    },
  });
}
