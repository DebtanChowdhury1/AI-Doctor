import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { connectToDatabase } from "@/lib/mongoose";
import { Goal } from "@/models/Goal";

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await connectToDatabase();
  const goals = await Goal.find({ userId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { title, description, targetDate } = body as {
    title?: string;
    description?: string;
    targetDate?: string;
  };

  if (!title) {
    return new NextResponse("Title is required", { status: 400 });
  }

  await connectToDatabase();
  const goal = await Goal.create({
    userId,
    title,
    description,
    targetDate: targetDate ? new Date(targetDate) : undefined,
    progressHistory: [],
  });

  return NextResponse.json({ goal });
}

export async function PATCH(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { goalId, value, note } = body as { goalId?: string; value?: number; note?: string };

  if (!goalId || value === undefined) {
    return new NextResponse("Goal ID and value are required", { status: 400 });
  }

  await connectToDatabase();

  const goal = await Goal.findOneAndUpdate(
    { _id: goalId, userId },
    {
      $push: {
        progressHistory: {
          date: new Date(),
          value,
          note,
        },
      },
    },
    { new: true }
  );

  if (!goal) {
    return new NextResponse("Goal not found", { status: 404 });
  }

  return NextResponse.json({ goal });
}

export async function DELETE(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");

  if (!goalId) {
    return new NextResponse("Goal ID is required", { status: 400 });
  }

  await connectToDatabase();
  await Goal.findOneAndDelete({ _id: goalId, userId });

  return NextResponse.json({ success: true });
}
