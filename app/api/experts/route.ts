import { NextResponse } from "next/server";

import ExpertModel from "@/models/Expert";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

export async function GET() {
  const { userId } = await requireAuth();
  await connectToDatabase();
  const experts = await ExpertModel.find({ userId }).sort({ createdAt: -1 });
  return NextResponse.json({
    experts: experts.map((expert) => ({
      id: expert._id.toString(),
      name: expert.name,
      prompt: expert.prompt,
      description: expert.description,
      icon: expert.icon,
      tone: expert.tone,
      isDefault: expert.isDefault,
    })),
  });
}

export async function POST(request: Request) {
  const { userId } = await requireAuth();
  const payload = await request.json();
  await connectToDatabase();

  const expert = await ExpertModel.create({
    userId,
    name: payload.name,
    prompt: payload.prompt,
    description: payload.description,
    icon: payload.icon ?? "sparkles",
    tone: payload.tone ?? "mentor",
    isDefault: false,
  });

  return NextResponse.json({
    expert: {
      id: expert._id.toString(),
      name: expert.name,
      prompt: expert.prompt,
      description: expert.description,
      icon: expert.icon,
      tone: expert.tone,
      isDefault: expert.isDefault,
    },
  });
}
