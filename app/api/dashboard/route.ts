import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { connectToDatabase } from "@/lib/mongoose";
import { callGemini } from "@/lib/gemini";
import { Chat, type ChatDocument, type Message } from "@/models/Chat";
import { Goal, type GoalDocument } from "@/models/Goal";

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

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function computeStreak(goals: Array<{ progressHistory?: Array<{ date: Date }> }>) {
  const uniqueDays = new Set<string>();
  goals.forEach((goal) => {
    goal.progressHistory?.forEach((entry) => {
      uniqueDays.add(toDateKey(new Date(entry.date)));
    });
  });

  let streak = 0;
  const cursor = new Date();
  while (streak < 365) {
    const key = toDateKey(cursor);
    if (!uniqueDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildWeeklyEngagement({
  chats,
  goals,
}: {
  chats: Array<{ messages: Message[] }>;
  goals: Array<{ progressHistory?: Array<{ date: Date }> }>;
}) {
  const today = new Date();
  const days: Array<{ label: string; key: string }> = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    days.push({
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      key: toDateKey(date),
    });
  }

  const chatCounts = new Map<string, number>();
  chats.forEach((chat) => {
    chat.messages
      .filter((message: Message) => message.role === "user")
      .forEach((message: Message) => {
        const key = toDateKey(new Date(message.createdAt));
        chatCounts.set(key, (chatCounts.get(key) ?? 0) + 1);
      });
  });

  const checkins = new Map<string, number>();
  goals.forEach((goal) => {
    goal.progressHistory?.forEach((entry) => {
      const key = toDateKey(new Date(entry.date));
      checkins.set(key, (checkins.get(key) ?? 0) + 1);
    });
  });

  return days.map(({ label, key }) => ({
    label,
    consults: chatCounts.get(key) ?? 0,
    checkins: checkins.get(key) ?? 0,
  }));
}

function computeCareFocus(symptomCounts: Array<{ keyword: string; count: number }>) {
  const buckets = {
    resilience: ["sleep", "stress", "anxiety", "fatigue"],
    recovery: ["fever", "cough", "pain", "headache"],
    prevention: ["hydration", "nutrition"],
  };

  const totals = Object.fromEntries(
    Object.entries(buckets).map(([key, keywords]) => [
      key,
      symptomCounts
        .filter((entry) => keywords.includes(entry.keyword))
        .reduce((sum, entry) => sum + entry.count, 0),
    ])
  ) as Record<string, number>;

  const max = Math.max(1, ...Object.values(totals));

  return [
    {
      label: "Resilience",
      score: Math.round((totals.resilience / max) * 100),
      description: "Mindful rest, stress balance, and mood support conversations.",
    },
    {
      label: "Recovery",
      score: Math.round((totals.recovery / max) * 100),
      description: "Acute symptom check-ins like fever, cough, and pain management.",
    },
    {
      label: "Prevention",
      score: Math.round((totals.prevention / max) * 100),
      description: "Hydration, nutrition, and healthy habit planning topics.",
    },
  ];
}

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await connectToDatabase();

  const [chatDocs, goalDocs] = await Promise.all([
    Chat.find({ userId }).lean().exec(),
    Goal.find({ userId }).lean().exec(),
  ]);

  const chats = chatDocs as unknown as ChatDocument[];
  const goals = goalDocs as unknown as GoalDocument[];

  const totalConsultations = chats.reduce(
    (acc, chat) =>
      acc + chat.messages.filter((message: Message) => message.role === "user").length,
    0
  );
  const assistantMessages = chats.flatMap((chat) =>
    chat.messages.filter((message: Message) => message.role === "assistant")
  );
  const avgConfidence = Math.min(
    97,
    60 + assistantMessages.reduce((acc, message) => acc + Math.min(message.content.length / 120, 1), 0) * 7
  );

  const symptomCounts = SYMPTOM_KEYWORDS.map((keyword) => ({
    keyword,
    count: chats.reduce(
      (total, chat) =>
        total +
        chat.messages.filter(
          (message: Message) =>
            message.role === "user" && message.content.toLowerCase().includes(keyword.toLowerCase())
        ).length,
      0
    ),
  }));

  const topSymptoms = symptomCounts.filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);

  const goalProgress = goals.map((goal) => {
    const history = goal.progressHistory ?? [];
    const latest = history[history.length - 1];
    return {
      goalId: goal._id.toString(),
      title: goal.title,
      latestValue: latest?.value ?? 0,
      roadmapSummary: goal.roadmapSummary ?? "",
      roadmapSteps: goal.roadmap ?? [],
      trend: history.slice(-5).map((progress) => ({
        date: progress.date,
        value: progress.value,
      })),
    };
  });

  const currentStreak = computeStreak(goals);
  const weeklyEngagement = buildWeeklyEngagement({ chats, goals });
  const careFocus = computeCareFocus(symptomCounts);

  const nextMilestones = goalProgress
    .map((goal) => {
      if (!goal.roadmapSteps?.length) {
        return null;
      }

      const totalSteps = goal.roadmapSteps.length;
      const progressRatio = Math.max(0, Math.min(1, goal.latestValue / 100));
      const estimatedIndex = Math.min(totalSteps - 1, Math.floor(progressRatio * totalSteps));
      const step = goal.roadmapSteps[estimatedIndex] ?? goal.roadmapSteps[totalSteps - 1];

      return {
        goalId: goal.goalId,
        title: goal.title,
        dayLabel: step.dayLabel,
        focus: step.focus,
        actions: step.actions,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const momentumScore = Math.min(
    100,
    Math.round(
      totalConsultations * 4 +
        goalProgress.reduce((acc, goal) => acc + goal.latestValue, 0) / Math.max(goalProgress.length, 1) +
        currentStreak * 6
    )
  );

  const insightPrompt = `You are summarizing a patient's wellness dashboard. There have been ${totalConsultations} consultations. Goal updates: ${goalProgress
    .map((goal) => `${goal.title} at ${goal.latestValue}%`)
    .join(", ") || "none"}. Current streak: ${currentStreak} days. Weekly engagement: ${weeklyEngagement
    .map((entry) => `${entry.label} ${entry.consults} consults/${entry.checkins} check-ins`)
    .join(", ")}. Provide three short wellness insight sections. Use plain text only, no markdown, no asterisks, no code fences. Format each section as a short title line followed by one concise action sentence.`;

  let insights =
    "1. Keep building your health history with regular consultations and goal check-ins.\n" +
    "2. Review your top symptom patterns before your next medical appointment.\n" +
    "3. Add measurable wellness goals so the dashboard can track progress over time.";

  try {
    insights = await callGemini(insightPrompt);
  } catch (error) {
    console.warn("Dashboard insights fallback used:", error);
  }

  return NextResponse.json({
    totalConsultations,
    avgConfidence: Number(avgConfidence.toFixed(1)),
    symptomCounts,
    topSymptoms,
    goalProgress,
    insights,
    currentStreak,
    weeklyEngagement,
    careFocus,
    nextMilestones,
    momentumScore,
  });
}
