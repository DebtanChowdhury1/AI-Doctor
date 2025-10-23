import { NextResponse } from "next/server";

import ExpertModel from "@/models/Expert";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { userId } = await requireAuth();
  const payload = await request.json();
  await connectToDatabase();

  const expert = await ExpertModel.findOneAndUpdate(
    { _id: params.id, userId },
    {
      name: payload.name,
      prompt: payload.prompt,
      description: payload.description,
      icon: payload.icon,
      tone: payload.tone,
    },
    { new: true },
  );

  if (!expert) {
    return NextResponse.json({ error: "Expert not found" }, { status: 404 });
  }

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

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { userId } = await requireAuth();
  await connectToDatabase();

  const expert = await ExpertModel.findOneAndDelete({ _id: params.id, userId });

  if (!expert) {
    return NextResponse.json({ error: "Expert not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
