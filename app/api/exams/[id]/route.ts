import { NextResponse } from "next/server";

import ExamModel from "@/models/Exam";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { userId } = await requireAuth();
  await connectToDatabase();

  const exam = await ExamModel.findOneAndDelete({ _id: params.id, userId });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
