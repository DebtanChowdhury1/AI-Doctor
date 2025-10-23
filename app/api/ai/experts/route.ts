import { NextResponse } from "next/server";

import { chatWithTutor } from "@/lib/ai/gemini";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  await requireAuth();
  const { prompt, history, message } = await request.json();

  const response = await chatWithTutor({
    context: prompt,
    transcript: undefined,
    history: history ?? [],
    message,
  });

  return NextResponse.json(response);
}
