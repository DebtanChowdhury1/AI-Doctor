import { Suspense } from "react";

import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import ExamModel from "@/models/Exam";
import ExamClient from "./client";

export const dynamic = "force-dynamic";

async function loadExams(userId: string) {
  await connectToDatabase();
  const exams = await ExamModel.find({ userId }).sort({ updatedAt: -1 }).lean();

  return exams.map((exam) => ({
    id: exam._id.toString(),
    topic: exam.topic,
    questions: exam.questions,
    score: exam.score,
    gradingGuide: exam.gradingGuide,
    pdfUrl: exam.pdfUrl,
    createdAt: exam.createdAt?.toISOString(),
    updatedAt: exam.updatedAt?.toISOString(),
  }));
}

export default async function ExamPage() {
  const { userId } = await requireAuth();
  const exams = await loadExams(userId);

  return (
    <Suspense>
      <ExamClient initialExams={exams} />
    </Suspense>
  );
}
