import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import ExamModel from "@/models/Exam";

export async function POST(request: Request) {
  const { userId } = await requireAuth();
  const { examId, answers } = await request.json();

  await connectToDatabase();
  const exam = await ExamModel.findOne({ _id: examId, userId });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  let correct = 0;

  exam.questions = exam.questions.map((question: any) => {
    const userAnswer = (answers?.[question.id] ?? "").trim();
    let isCorrect = false;

    if (question.type === "mcq") {
      isCorrect = userAnswer.toLowerCase() === question.answer.trim().toLowerCase();
    } else {
      isCorrect = userAnswer.length > 0 && question.answer.toLowerCase().includes(userAnswer.toLowerCase());
    }

    if (isCorrect) correct += 1;

    return {
      ...question,
      userAnswer,
      isCorrect,
    };
  });

  exam.score = Math.round((correct / exam.questions.length) * 100);
  await exam.save();

  return NextResponse.json({
    exam: {
      id: exam._id.toString(),
      topic: exam.topic,
      questions: exam.questions,
      gradingGuide: exam.gradingGuide,
      score: exam.score,
      pdfUrl: exam.pdfUrl,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    },
  });
}
