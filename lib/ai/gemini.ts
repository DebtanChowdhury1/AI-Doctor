"use server";

import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { parseGeminiJSON } from "@/lib/utils";

type GeminiMessage = {
  role: "user" | "model" | "system";
  parts: Array<{ text: string }>;
};

type GeminiJSON<T> = {
  data: T;
  raw: string;
};

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function requestGemini<T>(instructions: string, prompt: string): Promise<GeminiJSON<T>> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const body = {
    system_instruction: {
      role: "system",
      parts: [{ text: instructions }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      } satisfies GeminiMessage,
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
    },
  };

  const response = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini request failed: ${error}`);
  }

  const payload = await response.json();
  const text =
    payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("\n");

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return { data: parseGeminiJSON<T>(text), raw: text };
}

interface AnalyzeResponse {
  title: string;
  overview: string;
  insights: string[];
  recommendations: string[];
  questions: string[];
  followUpPrompt: string;
}

export async function analyzeYouTube(input: { url?: string; topic?: string }) {
  const target = input.url ?? input.topic ?? "";

  const system = [
    "You are AI Mentor, a world-class educator who turns any video or topic into an interactive lesson.",
    "Always respond with minified JSON containing keys: title, overview, insights, recommendations, questions, followUpPrompt.",
    "Focus on actionable learning insights and keep each array item concise (max 25 words).",
  ].join("\n");

  const { data } = await requestGemini<AnalyzeResponse>(
    system,
    [
      "Analyze the provided learning material.",
      "Summarize the core concept, extract five high-value insights, and craft actionable study recommendations.",
      "Invent thoughtful learner questions that encourage reflection.",
      `Material: ${target}`,
    ].join("\n"),
  );

  return data;
}

interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

interface TutorPayload {
  reply: string;
  citations: string[];
}

export async function chatWithTutor(options: {
  context: string;
  transcript?: string;
  history: TutorMessage[];
  message: string;
}) {
  const { context, transcript, history, message } = options;

  const system = [
    "You are AI Mentor, a Socratic AI tutor.",
    "Respond conversationally in markdown with headings, callouts, and numbered guidance.",
    "Encourage active recall by posing short follow-up questions.",
    "Always cite up to three references using inline markdown links when you rely on source material.",
    "Return minified JSON with keys: reply (markdown string) and citations (array of strings).",
  ].join("\n");

  const historyPrompt = history
    .map((item) => `${item.role === "assistant" ? "Tutor" : "Learner"}: ${item.content}`)
    .join("\n");

  const prompt = [
    `Lesson Context: ${context}`,
    transcript ? `Transcript Notes: ${transcript}` : "",
    historyPrompt ? `Conversation History:\n${historyPrompt}` : "",
    `Learner Message: ${message}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data } = await requestGemini<TutorPayload>(system, prompt);
  return data;
}

export interface ExamQuestion {
  id: string;
  type: "mcq" | "short";
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface ExamResponse {
  questions: ExamQuestion[];
  gradingGuide: string;
}

export async function generateExam(topic: string) {
  const system = [
    "You are an assessment designer.",
    "Return JSON with keys: questions (array of objects with id, type, prompt, options?, answer, explanation) and gradingGuide (string).",
    "Ensure there are 10 mcq questions and 3 short answer prompts.",
    "Provide rich explanations for every answer.",
  ].join("\n");

  const { data } = await requestGemini<ExamResponse>(
    system,
    `Design a rigorous mixed-format exam for the topic: ${topic}. Include competency coverage from beginner to advanced.`,
  );

  return data;
}

export interface SummaryResponse {
  summary: string;
  keyPoints: string[];
  quiz: Array<{ question: string; answer: string }>;
}

export async function summarizeText(text: string) {
  const system = [
    "You synthesize complex knowledge into digestible learning packets.",
    "Return JSON with keys: summary (string), keyPoints (array of strings), quiz (array of {question, answer}).",
    "Keep key points under 22 words each and craft application-focused quiz questions.",
  ].join("\n");

  const { data } = await requestGemini<SummaryResponse>(
    system,
    `Summarize the following content for a lifelong learner:\n${text}`,
  );

  return data;
}

interface PdfSection {
  heading: string;
  body: string[];
}

interface PdfPayload {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  footer?: string;
}

export async function generatePDF(payload: PdfPayload) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage();

  const margin = 56;
  let { width, height } = page.getSize();
  let cursorY = height - margin;

  const drawLine = (text: string, size = 11, color = rgb(0.1, 0.1, 0.12)) => {
    const words = text.split(" ");
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(next, size);

      if (margin + textWidth > width - margin) {
        page.drawText(line, { x: margin, y: cursorY, size, font, color });
        cursorY -= size + 6;
        line = word;
      } else {
        line = next;
      }
    }

    if (line) {
      page.drawText(line, { x: margin, y: cursorY, size, font, color });
      cursorY -= size + 6;
    }
  };

  page.drawText(payload.title, {
    x: margin,
    y: cursorY,
    size: 24,
    font: titleFont,
    color: rgb(0.25, 0.24, 1),
  });
  cursorY -= 34;

  if (payload.subtitle) {
    drawLine(payload.subtitle, 12, rgb(0.35, 0.35, 0.45));
    cursorY -= 4;
  }

  for (const section of payload.sections) {
    if (cursorY < margin + 120) {
      page = pdf.addPage();
      ({ width, height } = page.getSize());
      cursorY = height - margin;
    }

    page.drawText(section.heading, {
      x: margin,
      y: cursorY,
      size: 16,
      font: titleFont,
      color: rgb(0.12, 0.1, 0.4),
    });

    cursorY -= 22;

    for (const paragraph of section.body) {
      drawLine(paragraph);
    }

    cursorY -= 12;
  }

  if (payload.footer) {
    if (cursorY < margin + 60) {
      page = pdf.addPage();
      ({ width, height } = page.getSize());
      cursorY = height - margin;
    }

    drawLine(payload.footer, 10, rgb(0.45, 0.45, 0.45));
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

export function formatExamForPdf(topic: string, questions: ExamQuestion[]) {
  const mcqs = questions.filter((item) => item.type === "mcq");
  const shorts = questions.filter((item) => item.type === "short");

  return {
    title: `AI Mentor Exam — ${topic}`,
    sections: [
      {
        heading: "Multiple Choice",
        body: mcqs.flatMap((question, index) => {
          const header = `${index + 1}. ${question.prompt}`;
          const options = (question.options ?? []).map(
            (option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`,
          );
          return [header, ...options, `Answer: ${question.answer}`, `Why: ${question.explanation}`];
        }),
      },
      {
        heading: "Short Answer",
        body: shorts.flatMap((question, index) => [
          `${index + 1}. ${question.prompt}`,
          `Ideal Response: ${question.answer}`,
          `Feedback: ${question.explanation}`,
        ]),
      },
    ],
  } satisfies PdfPayload;
}

export function formatSummaryPdf(title: string, summary: SummaryResponse) {
  return {
    title,
    sections: [
      {
        heading: "Overview",
        body: [summary.summary],
      },
      {
        heading: "Key Points",
        body: summary.keyPoints,
      },
      {
        heading: "Quiz",
        body: summary.quiz.map((item, index) => `${index + 1}. ${item.question} — ${item.answer}`),
      },
    ],
  } satisfies PdfPayload;
}

export function formatChatPdf(options: {
  title: string;
  insights: string[];
  history: TutorMessage[];
  quiz?: Array<{ question: string; answer: string }>;
}) {
  const { title, insights, history, quiz = [] } = options;

  return {
    title,
    sections: [
      {
        heading: "Insights",
        body: insights,
      },
      {
        heading: "Conversation",
        body: history.map((entry) => `${entry.role === "assistant" ? "Tutor" : "Learner"}: ${entry.content}`),
      },
      quiz.length
        ? {
            heading: "Quick Quiz",
            body: quiz.map((item, index) => `${index + 1}. ${item.question} — ${item.answer}`),
          }
        : null,
    ].filter(Boolean) as PdfSection[],
  } satisfies PdfPayload;
}
