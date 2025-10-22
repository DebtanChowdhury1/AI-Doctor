import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PDFDocument, PDFFont, RGB, StandardFonts, rgb } from "pdf-lib";

import { connectToDatabase } from "@/lib/mongoose";
import { callGemini } from "@/lib/gemini";
import { extractFirstJsonObject } from "@/lib/utils";
import { Chat } from "@/models/Chat";
import { Goal } from "@/models/Goal";
import { Report } from "@/models/Report";

export const runtime = "nodejs";

type ChatRecord = {
  createdAt: Date;
  messages: Array<{ role: string; content: string; createdAt: Date }>;
};

type GoalRecord = {
  title: string;
  progressHistory?: Array<{ date: Date; value: number; note?: string }>;
};

type ReportPayload = {
  title: string;
  summary: string;
  careNote?: string;
  focusHighlights: string[];
  sections: Array<{ heading: string; bullets: string[] }>;
};

async function buildReportBuffer({
  report,
  chats,
  goals,
}: {
  report: ReportPayload & { personalNotes?: string; createdAt: Date };
  chats: ChatRecord[];
  goals: GoalRecord[];
}) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]);
  const margin = 48;

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const night = rgb(15 / 255, 23 / 255, 42 / 255);
  const slate = rgb(51 / 255, 65 / 255, 85 / 255);
  const accent = rgb(99 / 255, 102 / 255, 241 / 255);
  const mint = rgb(16 / 255, 185 / 255, 129 / 255);
  const blush = rgb(236 / 255, 72 / 255, 153 / 255);

  let { width, height } = page.getSize();
  let cursorY = height - margin;

  const lineHeight = (size: number) => size * 1.45;

  const newPage = () => {
    page = pdfDoc.addPage([612, 792]);
    ({ width, height } = page.getSize());
    cursorY = height - margin;
  };

  const ensureSpace = (size: number) => {
    if (cursorY - size < margin) {
      newPage();
    }
  };

  const drawRectangle = (options: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: RGB;
    opacity?: number;
    radius?: number;
  }) => {
    const { x, y, width: w, height: h, color, opacity = 1, radius = 16 } = options;
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color,
      opacity,
      borderRadius: radius,
    });
  };

  const drawTextLine = (
    text: string,
    {
      font = regularFont,
      size = 12,
      color = slate,
      indent = 0,
    }: {
      font?: PDFFont;
      size?: number;
      color?: RGB;
      indent?: number;
    } = {}
  ) => {
    const needed = lineHeight(size);
    ensureSpace(needed);
    page.drawText(text, {
      x: margin + indent,
      y: cursorY - size,
      font,
      size,
      color,
    });
    cursorY -= needed;
  };

  const drawParagraph = (text: string, options?: { font?: PDFFont; size?: number; color?: RGB; indent?: number }) => {
    const { font = regularFont, size = 12, color = slate, indent = 0 } = options ?? {};
    const maxWidth = width - margin * 2 - indent;
    const words = text.split(/\s+/);
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        drawTextLine(line, { font, size, color, indent });
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line.trim()) {
      drawTextLine(line, { font, size, color, indent });
    }
  };

  const spacer = (multiplier = 1) => {
    const size = 10 * multiplier;
    ensureSpace(size);
    cursorY -= size;
  };

  // Header block
  drawRectangle({
    x: margin,
    y: cursorY - 120,
    width: width - margin * 2,
    height: 120,
    color: accent,
    opacity: 0.12,
    radius: 24,
  });

  drawTextLine("AI Doctor | Personal Wellness Brief", {
    font: boldFont,
    size: 16,
    color: accent,
  });
  drawTextLine(report.title, {
    font: boldFont,
    size: 26,
    color: night,
  });
  drawTextLine(new Date(report.createdAt).toLocaleString(), {
    size: 11,
    color: slate,
  });
  spacer(2);

  drawTextLine("Executive Summary", { font: boldFont, size: 16, color: night });
  spacer(0.3);
  drawParagraph(report.summary);
  spacer(1.2);

  if (report.focusHighlights?.length) {
    drawTextLine("Focus Highlights", { font: boldFont, size: 15, color: night });
    spacer(0.6);
    report.focusHighlights.forEach((item) => {
      drawRectangle({
        x: margin,
        y: cursorY - 38,
        width: width - margin * 2,
        height: 38,
        color: mint,
        opacity: 0.12,
        radius: 14,
      });
      drawTextLine(`• ${item}`, { indent: 18, size: 12, color: mint });
    });
    spacer(1);
  }

  if (report.careNote) {
    drawRectangle({
      x: margin,
      y: cursorY - 70,
      width: width - margin * 2,
      height: 70,
      color: blush,
      opacity: 0.1,
      radius: 18,
    });
    drawTextLine("Clinical Reminder", { font: boldFont, size: 14, color: blush });
    drawParagraph(report.careNote, { indent: 12, color: blush, size: 12 });
    spacer(1.2);
  }

  report.sections.forEach((section, index) => {
    drawTextLine(section.heading, { font: boldFont, size: 15, color: night });
    spacer(0.4);
    section.bullets.forEach((bullet) => {
      drawParagraph(`• ${bullet}`, { indent: 14, size: 12 });
    });
    if (index !== report.sections.length - 1) {
      spacer(1.2);
    }
  });

  if (report.personalNotes) {
    spacer(1.4);
    drawTextLine("Personal Notes", { font: boldFont, size: 14, color: accent });
    spacer(0.3);
    drawParagraph(report.personalNotes, { indent: 12 });
  }

  spacer(1.4);
  drawTextLine("Consultation Timeline", { font: boldFont, size: 15, color: night });
  spacer(0.4);

  chats.slice(-5).forEach((chat, index) => {
    drawRectangle({
      x: margin,
      y: cursorY - 80,
      width: width - margin * 2,
      height: 80,
      color: accent,
      opacity: 0.08,
      radius: 14,
    });
    drawTextLine(`Consultation ${index + 1} — ${new Date(chat.createdAt).toLocaleDateString()}`, {
      font: boldFont,
      size: 12,
      color: accent,
    });
    (chat.messages ?? []).slice(-3).forEach((message) => {
      const prefix = message.role === "assistant" ? "AI:" : "You:";
      drawParagraph(`${prefix} ${message.content}`, {
        indent: 14,
        size: 11,
      });
    });
    spacer(1);
  });

  spacer(1);
  drawTextLine("Goal Progress Highlights", { font: boldFont, size: 15, color: night });
  spacer(0.4);

  goals.forEach((goal) => {
    drawRectangle({
      x: margin,
      y: cursorY - 90,
      width: width - margin * 2,
      height: 90,
      color: mint,
      opacity: 0.08,
      radius: 14,
    });
    drawTextLine(goal.title, { font: boldFont, size: 12, color: mint });
    const progressHistory = goal.progressHistory ?? [];
    const latest = progressHistory[progressHistory.length - 1];
    if (latest) {
      drawParagraph(
        `Latest update: ${latest.value}% on ${new Date(latest.date).toLocaleDateString()}${latest.note ? ` — ${latest.note}` : ""}`,
        { indent: 14, size: 11 }
      );
    }
    progressHistory.slice(-3).forEach((entry) => {
      drawParagraph(
        `• ${new Date(entry.date).toLocaleDateString()}: ${entry.value}%${entry.note ? ` | ${entry.note}` : ""}`,
        { indent: 18, size: 10 }
      );
    });
    spacer(1.1);
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function parseReportResponse(raw: string): ReportPayload {
  const parsed = extractFirstJsonObject(raw);
  if (!parsed) {
    return {
      title: "AI Doctor Wellness Report",
      summary: raw.trim(),
      focusHighlights: [],
      sections: [],
    };
  }

  return {
    title:
      typeof parsed.title === "string" && parsed.title.trim().length
        ? parsed.title.trim()
        : "AI Doctor Wellness Report",
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim().length
        ? parsed.summary.trim()
        : "Stay consistent with your wellness habits and share this report with your care team.",
    careNote: typeof parsed.careNote === "string" ? parsed.careNote.trim() : undefined,
    focusHighlights: Array.isArray(parsed.focusHighlights)
      ? parsed.focusHighlights.filter((item: unknown): item is string => typeof item === "string")
      : [],
    sections: Array.isArray(parsed.sections)
      ? parsed.sections
          .map((section: Record<string, unknown>) => ({
            heading: typeof section.heading === "string" ? section.heading : "Snapshot",
            bullets: Array.isArray(section.bullets)
              ? section.bullets.filter((item: unknown): item is string => typeof item === "string")
              : [],
          }))
          .filter((section) => section.bullets.length > 0)
      : [],
  };
}

export async function GET(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId");

  await connectToDatabase();

  if (reportId) {
    const reportRecord = await Report.findOne({ _id: reportId, userId }).lean();

    if (!reportRecord) {
      return new NextResponse("Report not found", { status: 404 });
    }

    const [chats, goals] = await Promise.all([
      Chat.find({ userId }).sort({ createdAt: 1 }).lean(),
      Goal.find({ userId }).lean(),
    ]);

    const buffer = await buildReportBuffer({
      report: {
        title: reportRecord.title,
        summary: reportRecord.summary,
        careNote: reportRecord.careNote ?? undefined,
        focusHighlights: reportRecord.focusHighlights ?? [],
        sections: reportRecord.sections ?? [],
        personalNotes: reportRecord.personalNotes ?? undefined,
        createdAt: reportRecord.createdAt,
      },
      chats: chats as ChatRecord[],
      goals: goals as GoalRecord[],
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${reportRecord.title.replace(/\s+/g, "-").toLowerCase()}-${reportRecord._id}.pdf`,
      },
    });
  }

  const reports = await Report.find({ userId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { personalNotes } = body as { personalNotes?: string };

  await connectToDatabase();
  const [chats, goals] = await Promise.all([
    Chat.find({ userId }).lean(),
    Goal.find({ userId }).lean(),
  ]);

  const summaryPrompt = [
    "Create an elegant, clinician-style wellness briefing as an AI-powered assistant.",
    `Consultations analysed: ${chats.length}.`,
    chats.length
      ? chats
          .slice(-5)
          .map((chat, idx) => `Consult ${idx + 1}: ${chat.messages.map((m) => `${m.role} says ${m.content}`).join(" | ")}`)
          .join("\n")
      : "No consultations recorded yet.",
    goals.length
      ? goals
          .map((goal) => {
            const history = goal.progressHistory ?? [];
            const latest = history[history.length - 1];
            return `${goal.title} currently ${latest?.value ?? 0}%`;
          })
          .join(" | ")
      : "No goals in progress.",
    "Respond strictly in JSON with keys: title, summary, careNote, focusHighlights (array of 3 strings), sections (array of objects with heading and bullets array).",
    "Tone should be uplifting, medically clear, and never mention Gemini or language models.",
  ]
    .filter(Boolean)
    .join("\n");

  const summary = await callGemini(summaryPrompt);
  const parsed = parseReportResponse(summary);

  const report = await Report.create({
    userId,
    title: parsed.title,
    summary: parsed.summary,
    careNote: parsed.careNote,
    focusHighlights: parsed.focusHighlights,
    sections: parsed.sections,
    personalNotes,
  });

  return NextResponse.json({ report: report.toObject() });
}

export async function PATCH(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { reportId, title, personalNotes } = body as {
    reportId?: string;
    title?: string;
    personalNotes?: string;
  };

  if (!reportId) {
    return new NextResponse("Report ID is required", { status: 400 });
  }

  await connectToDatabase();

  const report = await Report.findOneAndUpdate(
    { _id: reportId, userId },
    {
      ...(title?.trim() ? { title: title.trim() } : {}),
      personalNotes,
    },
    { new: true }
  ).lean();

  if (!report) {
    return new NextResponse("Report not found", { status: 404 });
  }

  return NextResponse.json({ report });
}

export async function DELETE(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId");

  if (!reportId) {
    return new NextResponse("Report ID is required", { status: 400 });
  }

  await connectToDatabase();
  await Report.findOneAndDelete({ _id: reportId, userId });

  return NextResponse.json({ success: true });
}
