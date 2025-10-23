import { NextResponse } from "next/server";

import ExamModel from "@/models/Exam";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

export async function GET() {
  const { userId } = await requireAuth();
  await connectToDatabase();
  const exams = await ExamModel.find({ userId }).sort({ updatedAt: -1 });

  return NextResponse.json({
    exams: exams.map((exam) => ({
      id: exam._id.toString(),
      topic: exam.topic,
      questions: exam.questions,
      gradingGuide: exam.gradingGuide,
      score: exam.score,
      pdfUrl: exam.pdfUrl,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    })),
  });
}
