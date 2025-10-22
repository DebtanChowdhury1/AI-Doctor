import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { connectToDatabase } from "@/lib/mongoose";
import { callGemini } from "@/lib/gemini";
import { extractFirstJsonObject } from "@/lib/utils";
import { Goal, type GoalDocument, type GoalRoadmapStep } from "@/models/Goal";

type RoadmapResult = {
  summary: string;
  steps: GoalRoadmapStep[];
};

type PlanResult = {
  guidance: string;
  checklist: string[];
};

function normaliseDateInput(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatRoadmapForPrompt(goal: GoalDocument) {
  if (!goal.roadmap?.length) return "Roadmap not yet defined.";
  return goal.roadmap
    .map((step, index) => {
      const actions = step.actions?.length ? `Actions: ${step.actions.join(" | ")}` : "";
      return `Step ${index + 1} (${step.dayLabel}): ${step.focus}. ${actions}`.trim();
    })
    .join("\n");
}

function parseRoadmapResponse(raw: string): RoadmapResult {
  const parsed = extractFirstJsonObject(raw);
  if (!parsed) {
    return {
      summary: raw.trim(),
      steps: [],
    };
  }

  const steps: GoalRoadmapStep[] = Array.isArray(parsed.steps)
    ? parsed.steps
        .map((step: Record<string, unknown>) => ({
          dayLabel: typeof step.dayLabel === "string" ? step.dayLabel : "Milestone",
          focus: typeof step.focus === "string" ? step.focus : "Stay consistent",
          actions: Array.isArray(step.actions)
            ? step.actions.filter((action): action is string => typeof action === "string")
            : [],
        }))
        .filter((step: GoalRoadmapStep) => step.focus.trim().length > 0)
    : [];

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : raw.trim(),
    steps,
  };
}

function parsePlanResponse(raw: string): PlanResult {
  const parsed = extractFirstJsonObject(raw);
  if (!parsed) {
    return {
      guidance: raw.trim(),
      checklist: [],
    };
  }

  return {
    guidance: typeof parsed.guidance === "string" ? parsed.guidance : raw.trim(),
    checklist: Array.isArray(parsed.checklist)
      ? parsed.checklist.filter((item: unknown): item is string => typeof item === "string")
      : [],
  };
}

async function generateRoadmap({
  title,
  description,
  startDate,
  endDate,
}: {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
}): Promise<RoadmapResult> {
  const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) + 1;
  const roadmapPrompt = [
    "Design a health goal roadmap as an AI-powered clinician coach.",
    `Goal: ${title}`,
    description ? `Details: ${description}` : undefined,
    `Start Date: ${startDate.toISOString().slice(0, 10)}`,
    `End Date: ${endDate.toISOString().slice(0, 10)}`,
    `Total Days: ${totalDays}`,
    "Return strict JSON with keys summary and steps.",
    "steps must be an array of objects with dayLabel, focus, and actions (string array).",
    "Craft warm, clinical language and keep dayLabel unique (e.g., Week 1, Day 3 Evening Reset).",
    "Do not mention Gemini or language models. Refer to the assistant as AI powered if needed.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await callGemini(roadmapPrompt);
  return parseRoadmapResponse(response);
}

async function generateTomorrowPlan({
  goal,
  value,
  note,
}: {
  goal: GoalDocument;
  value: number;
  note?: string;
}): Promise<PlanResult> {
  const prompt = [
    "You are an AI-powered clinician providing a compassionate follow-up plan for tomorrow.",
    `Goal title: ${goal.title}`,
    goal.description ? `Goal description: ${goal.description}` : undefined,
    goal.startDate ? `Start date: ${goal.startDate.toISOString().slice(0, 10)}` : undefined,
    goal.endDate ? `End date: ${goal.endDate.toISOString().slice(0, 10)}` : undefined,
    note
      ? `Latest progress value: ${value}% | Today's note: ${note}`
      : `Latest progress value: ${value}%`,
    goal.roadmap?.length
      ? `Roadmap steps:\n${formatRoadmapForPrompt(goal)}`
      : "Roadmap steps are still pending.",
    "Respond in JSON with guidance (string) and checklist (array of 3 concise action strings).",
    "Emphasise what to do tomorrow, reinforcing hydration, rest, and red-flag awareness when appropriate.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await callGemini(prompt);
  return parsePlanResponse(response);
}

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
  const { title, description, startDate: startInput, endDate: endInput } = body as {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  };

  if (!title?.trim()) {
    return new NextResponse("Title is required", { status: 400 });
  }

  const startDate = normaliseDateInput(startInput) ?? new Date();
  const defaultEnd = new Date(startDate.getTime() + 29 * 24 * 60 * 60 * 1000);
  const endDate = normaliseDateInput(endInput) ?? defaultEnd;

  if (startDate.getTime() > endDate.getTime()) {
    return new NextResponse("Start date must be before end date", { status: 400 });
  }

  await connectToDatabase();

  const roadmap = await generateRoadmap({
    title: title.trim(),
    description,
    startDate,
    endDate,
  });

  const goal = await Goal.create({
    userId,
    title: title.trim(),
    description,
    startDate,
    endDate,
    targetDate: endDate,
    roadmapSummary: roadmap.summary,
    roadmap: roadmap.steps,
    progressHistory: [],
  });

  return NextResponse.json({ goal: goal.toObject() });
}

export async function PATCH(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { goalId, value, note } = body as {
    goalId?: string;
    value?: number;
    note?: string;
  };

  if (!goalId || typeof value !== "number") {
    return new NextResponse("Goal ID and value are required", { status: 400 });
  }

  await connectToDatabase();

  const goal = await Goal.findOne({ _id: goalId, userId });

  if (!goal) {
    return new NextResponse("Goal not found", { status: 404 });
  }

  const plan = await generateTomorrowPlan({ goal, value, note });

  goal.progressHistory.push({
    date: new Date(),
    value,
    note,
    guidance: plan.guidance,
    checklist: plan.checklist,
  });

  await goal.save();

  return NextResponse.json({ goal: goal.toObject(), plan });
}

export async function PUT(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const {
    goalId,
    title,
    description,
    startDate: startInput,
    endDate: endInput,
    regenerateRoadmap,
  } = body as {
    goalId?: string;
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    regenerateRoadmap?: boolean;
  };

  if (!goalId) {
    return new NextResponse("Goal ID is required", { status: 400 });
  }

  await connectToDatabase();
  const goal = await Goal.findOne({ _id: goalId, userId });

  if (!goal) {
    return new NextResponse("Goal not found", { status: 404 });
  }

  let roadmapNeedsRefresh = Boolean(regenerateRoadmap);

  if (title?.trim()) {
    goal.title = title.trim();
  }

  if (typeof description === "string") {
    goal.description = description;
    roadmapNeedsRefresh = true;
  }

  const startDate = normaliseDateInput(startInput);
  const endDate = normaliseDateInput(endInput);

  if (startDate) {
    goal.startDate = startDate;
    roadmapNeedsRefresh = true;
  }

  if (endDate) {
    if (goal.startDate && endDate.getTime() < goal.startDate.getTime()) {
      return new NextResponse("End date must be after start date", { status: 400 });
    }
    goal.endDate = endDate;
    goal.targetDate = endDate;
    roadmapNeedsRefresh = true;
  }

  if (roadmapNeedsRefresh && goal.startDate && goal.endDate) {
    const roadmap = await generateRoadmap({
      title: goal.title,
      description: goal.description,
      startDate: goal.startDate,
      endDate: goal.endDate,
    });
    goal.roadmap = roadmap.steps;
    goal.roadmapSummary = roadmap.summary;
  }

  await goal.save();

  return NextResponse.json({ goal: goal.toObject() });
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
