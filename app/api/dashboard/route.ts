import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { connectToDatabase } from "@/lib/mongoose";
import { Chat } from "@/models/Chat";
import { Goal } from "@/models/Goal";
import { callGemini } from "@/lib/gemini";

const SYMPTOM_KEYWORDS = [
  "headache",
  "fatigue",
  "cough",
  "anxiety",
  "sleep",
  "stress",
  "pain",
  "fever",
  "hydration",
  "nutrition",
];

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await connectToDatabase();

  const [chats, goals] = await Promise.all([
    Chat.find({ userId }).lean(),
    Goal.find({ userId }).lean(),
  ]);

  const totalConsultations = chats.reduce((acc, chat) => acc + chat.messages.filter((m) => m.role === "user").length, 0);
  const assistantMessages = chats.flatMap((chat) => chat.messages.filter((m) => m.role === "assistant"));
  const avgConfidence = Math.min(
    97,
    60 + assistantMessages.reduce((acc, message) => acc + Math.min(message.content.length / 100, 1), 0) * 7
  );

  const symptomCounts = SYMPTOM_KEYWORDS.map((keyword) => ({
    keyword,
    count: chats.reduce(
      (total, chat) =>
        total +
        chat.messages.filter((m) => m.role === "user" && m.content.toLowerCase().includes(keyword.toLowerCase())).length,
      0
    ),
  }));

  const topSymptoms = symptomCounts.filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);

  const goalProgress = goals.map((goal) => {
    const latest = goal.progressHistory[goal.progressHistory.length - 1];
    return {
      goalId: goal._id.toString(),
      title: goal.title,
      latestValue: latest?.value ?? 0,
      trend: goal.progressHistory.slice(-5).map((progress) => ({
        date: progress.date,
        value: progress.value,
      })),
    };
  });

  const insightPrompt = `You are summarizing a patient's digital health dashboard. There have been ${totalConsultations} consultations. The latest goals data: ${goalProgress
    .map((goal) => `${goal.title} latest progress ${goal.latestValue}%`)
    .join(", ")}. The top symptoms discussed were ${topSymptoms.map((item) => item.keyword).join(", ") || "none"}. Provide three concise wellness insights with next steps.`;

  const insights = await callGemini(insightPrompt);

  return NextResponse.json({
    totalConsultations,
    avgConfidence: Number(avgConfidence.toFixed(1)),
    symptomCounts,
    topSymptoms,
    goalProgress,
    insights,
  });
}
