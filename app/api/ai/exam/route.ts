import { NextResponse } from "next/server";

import { generateExam } from "@/lib/ai/gemini";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import ExamModel from "@/models/Exam";

export async function POST(request: Request) {
  const { userId } = await requireAuth();
  const { topic } = await request.json();

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  await connectToDatabase();
  const examContent = await generateExam(topic);

  const exam = await ExamModel.create({
    userId,
    topic,
    questions: examContent.questions,
    gradingGuide: examContent.gradingGuide,
  });

  return NextResponse.json({
    exam: {
      id: exam._id.toString(),
      topic: exam.topic,
      questions: exam.questions,
      gradingGuide: exam.gradingGuide,
      score: exam.score,
      pdfUrl: exam.pdfUrl,
      createdAt: exam.createdAt,
    },
  });
}
