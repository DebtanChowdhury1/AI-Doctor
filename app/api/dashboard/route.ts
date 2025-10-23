import { NextResponse } from "next/server";

import ChatModel from "@/models/Chat";
import ExamModel from "@/models/Exam";
import SummaryModel from "@/models/Summary";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

export async function GET() {
  const { userId } = await requireAuth();
  await connectToDatabase();

  const [chats, exams, summaries] = await Promise.all([
    ChatModel.find({ userId }),
    ExamModel.find({ userId }),
    SummaryModel.find({ userId }),
  ]);

  const videosAnalyzed = chats.filter((chat) => chat.sourceType === "youtube").length;
  const daily = new Map<string, { chats: number; exams: number; summaries: number }>();

  const register = (date: Date, type: "chats" | "exams" | "summaries") => {
    const key = date.toISOString().slice(0, 10);
    const current = daily.get(key) ?? { chats: 0, exams: 0, summaries: 0 };
    current[type] += 1;
    daily.set(key, current);
  };

  chats.forEach((chat) => register(chat.updatedAt ?? chat.createdAt ?? new Date(), "chats"));
  exams.forEach((exam) => register(exam.updatedAt ?? exam.createdAt ?? new Date(), "exams"));
  summaries.forEach((summary) => register(summary.updatedAt ?? summary.createdAt ?? new Date(), "summaries"));

  const timeline = Array.from(daily.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, value]) => ({ date, ...value }));

  const totalXp = chats.length * 10 + exams.length * 25 + summaries.length * 15;
  const xpTarget = Math.max(100, Math.ceil(totalXp / 100) * 100);

  return NextResponse.json({
    stats: {
      chats: chats.length,
      videosAnalyzed,
      examsTaken: exams.length,
      summariesCreated: summaries.length,
    },
    timeline,
    xp: {
      total: totalXp,
      target: xpTarget,
      progress: Math.min(100, Math.round((totalXp / xpTarget) * 100)),
    },
  });
}
