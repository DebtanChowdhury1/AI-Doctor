import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PDFDocument, PDFFont, RGB, StandardFonts, rgb } from "pdf-lib";

import { connectToDatabase } from "@/lib/mongoose";
import { callGemini } from "@/lib/gemini";
import { extractFirstJsonObject } from "@/lib/utils";
import { Chat, type ChatDocument } from "@/models/Chat";
import { Goal, type GoalDocument } from "@/models/Goal";
import { Report, type ReportDocument } from "@/models/Report";

export const runtime = "nodejs";

type ChatRecord = {
  createdAt: Date;
  title?: string;
  messages: Array<{ role: string; content: string; createdAt: Date }>;
};

type GoalRecord = {
  title: string;
  progressHistory?: Array<{ date: Date; value: number; note?: string }>;
};

const mapChatDocument = (chat: ChatDocument): ChatRecord => ({
  createdAt: new Date(chat.createdAt),
  title: chat.title,
  messages: chat.messages.map((message) => ({
    role: message.role,
    content: message.content,
    createdAt: new Date(message.createdAt),
  })),
});

const mapGoalDocument = (goal: GoalDocument): GoalRecord => ({
  title: goal.title,
  progressHistory: (goal.progressHistory ?? []).map((entry) => ({
    date: new Date(entry.date),
    value: entry.value,
    note: entry.note,
  })),
});

const MAX_TRANSCRIPT_LENGTH = 6000;

function clampTranscript(messages: ChatRecord["messages"]) {
  const joined = messages
    .map((message) => {
      const speaker = message.role === "assistant" ? "AI" : "User";
      return `${speaker}: ${message.content}`;
    })
    .join("\n");

  if (joined.length <= MAX_TRANSCRIPT_LENGTH) {
    return joined;
  }

  return joined.slice(joined.length - MAX_TRANSCRIPT_LENGTH);
}

type ReportPayload = {
  title: string;
  summary: string;
  careNote?: string;
  focusHighlights: string[];
  sections: Array<{ heading: string; bullets: string[] }>;
};

async function legacyBuildReportBuffer({
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
    const { x, y, width: w, height: h, color, opacity = 1 } = options;
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color,
      opacity,
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

void legacyBuildReportBuffer;

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
  const margin = 44;

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(15 / 255, 23 / 255, 42 / 255);
  const muted = rgb(71 / 255, 85 / 255, 105 / 255);
  const faint = rgb(248 / 255, 250 / 255, 252 / 255);
  const border = rgb(226 / 255, 232 / 255, 240 / 255);
  const brand = rgb(79 / 255, 70 / 255, 229 / 255);
  const brandSoft = rgb(238 / 255, 242 / 255, 255 / 255);
  const teal = rgb(13 / 255, 148 / 255, 136 / 255);
  const tealSoft = rgb(240 / 255, 253 / 255, 250 / 255);
  const amber = rgb(180 / 255, 83 / 255, 9 / 255);
  const amberSoft = rgb(255 / 255, 251 / 255, 235 / 255);
  const white = rgb(1, 1, 1);

  let { width, height } = page.getSize();
  const contentWidth = width - margin * 2;
  let cursorY = height - 96;
  let pageNumber = 1;

  const lineHeight = (size: number) => size * 1.38;

  const sanitizeText = (text: string) =>
    text
      .replace(/\*\*/g, "")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/[•]/g, "-")
      .replace(/[—–]/g, "-")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const truncate = (text: string, maxLength: number) => {
    const clean = sanitizeText(text);
    return clean.length > maxLength ? `${clean.slice(0, maxLength - 3).trim()}...` : clean;
  };

  const wrapText = (text: string, font: PDFFont, size: number, maxWidth: number) => {
    const words = sanitizeText(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";

    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });

    if (line) {
      lines.push(line);
    }

    return lines;
  };

  const drawChrome = () => {
    page.drawRectangle({
      x: 0,
      y: height - 64,
      width,
      height: 64,
      color: ink,
    });
    page.drawRectangle({
      x: 0,
      y: height - 68,
      width,
      height: 4,
      color: brand,
    });
    page.drawText("AI DOCTOR", {
      x: margin,
      y: height - 36,
      font: boldFont,
      size: 13,
      color: white,
    });
    page.drawText("Clinical-style wellness report", {
      x: margin + 86,
      y: height - 36,
      font: regularFont,
      size: 10,
      color: rgb(203 / 255, 213 / 255, 225 / 255),
    });
    page.drawText(`Page ${pageNumber}`, {
      x: width - margin - 42,
      y: height - 36,
      font: regularFont,
      size: 9,
      color: rgb(203 / 255, 213 / 255, 225 / 255),
    });
  };

  const drawFooter = () => {
    page.drawLine({
      start: { x: margin, y: 38 },
      end: { x: width - margin, y: 38 },
      thickness: 0.5,
      color: border,
    });
    page.drawText("Educational AI-powered summary. Not a diagnosis. Review with a licensed clinician.", {
      x: margin,
      y: 22,
      font: regularFont,
      size: 8,
      color: muted,
    });
  };

  const newPage = () => {
    drawFooter();
    page = pdfDoc.addPage([612, 792]);
    pageNumber += 1;
    ({ width, height } = page.getSize());
    cursorY = height - 96;
    drawChrome();
  };

  const ensureSpace = (size: number) => {
    if (cursorY - size < 58) {
      newPage();
    }
  };

  const drawBox = ({
    y,
    x = margin,
    boxWidth = contentWidth,
    boxHeight,
    color = white,
    borderColor = border,
    opacity = 1,
  }: {
    y: number;
    x?: number;
    boxWidth?: number;
    boxHeight: number;
    color?: RGB;
    borderColor?: RGB;
    opacity?: number;
  }) => {
    page.drawRectangle({
      x,
      y: y - boxHeight,
      width: boxWidth,
      height: boxHeight,
      color,
      opacity,
    });
    page.drawRectangle({
      x,
      y: y - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderColor,
      borderWidth: 0.8,
    });
  };

  const drawLines = ({
    lines,
    x = margin,
    font = regularFont,
    size = 11,
    color = muted,
    leading = lineHeight(size),
  }: {
    lines: string[];
    x?: number;
    font?: PDFFont;
    size?: number;
    color?: RGB;
    leading?: number;
  }) => {
    lines.forEach((line) => {
      page.drawText(line, {
        x,
        y: cursorY - size,
        font,
        size,
        color,
      });
      cursorY -= leading;
    });
  };

  const drawHeading = (label: string) => {
    ensureSpace(34);
    page.drawRectangle({
      x: margin,
      y: cursorY - 19,
      width: 4,
      height: 19,
      color: brand,
    });
    page.drawText(label.toUpperCase(), {
      x: margin + 12,
      y: cursorY - 15,
      font: boldFont,
      size: 12,
      color: ink,
    });
    cursorY -= 30;
  };

  const drawMetric = (label: string, value: string, x: number, boxWidth: number) => {
    drawBox({ x, y: cursorY, boxWidth, boxHeight: 54, color: faint });
    page.drawText(label.toUpperCase(), {
      x: x + 14,
      y: cursorY - 18,
      font: regularFont,
      size: 7.5,
      color: muted,
    });
    page.drawText(value, {
      x: x + 14,
      y: cursorY - 40,
      font: boldFont,
      size: 14,
      color: ink,
    });
  };

  const drawTextCard = ({
    title,
    body,
    tone = "brand",
  }: {
    title: string;
    body: string;
    tone?: "brand" | "teal" | "amber";
  }) => {
    const toneColor = tone === "teal" ? teal : tone === "amber" ? amber : brand;
    const fill = tone === "teal" ? tealSoft : tone === "amber" ? amberSoft : brandSoft;
    const titleLines = wrapText(title || "Section", boldFont, 12, contentWidth - 34).slice(0, 2);
    const bodyLines = wrapText(body || "No details available.", regularFont, 10.5, contentWidth - 34).slice(0, 12);
    const boxHeight = 28 + titleLines.length * 16 + bodyLines.length * 14;

    ensureSpace(boxHeight + 10);
    drawBox({ y: cursorY, boxHeight, color: fill, borderColor: border });
    page.drawRectangle({
      x: margin,
      y: cursorY - boxHeight,
      width: 4,
      height: boxHeight,
      color: toneColor,
    });
    cursorY -= 16;
    drawLines({ lines: titleLines, x: margin + 18, font: boldFont, size: 12, color: toneColor, leading: 16 });
    cursorY -= 2;
    drawLines({ lines: bodyLines, x: margin + 18, font: regularFont, size: 10.5, color: muted, leading: 14 });
    cursorY -= 12;
  };

  drawChrome();

  const titleLines = wrapText(report.title || "AI Doctor Wellness Report", boldFont, 23, contentWidth - 40).slice(0, 3);
  const coverHeight = 148 + Math.max(0, titleLines.length - 1) * 24;
  drawBox({ y: cursorY, boxHeight: coverHeight, color: white, borderColor: border });
  page.drawText("PERSONAL WELLNESS BRIEF", {
    x: margin + 20,
    y: cursorY - 28,
    font: boldFont,
    size: 9,
    color: brand,
  });
  cursorY -= 58;
  drawLines({ lines: titleLines, x: margin + 20, font: boldFont, size: 23, color: ink, leading: 28 });
  cursorY -= 4;
  page.drawText(`Generated ${new Date(report.createdAt).toLocaleString()}`, {
    x: margin + 20,
    y: cursorY - 12,
    font: regularFont,
    size: 10,
    color: muted,
  });
  cursorY -= 38;

  const metricWidth = (contentWidth - 40) / 3;
  drawMetric("Consultations", String(chats.length), margin + 20, metricWidth - 8);
  drawMetric("Active goals", String(goals.length), margin + 20 + metricWidth, metricWidth - 8);
  drawMetric("Report type", report.personalNotes ? "Custom" : "Auto", margin + 20 + metricWidth * 2, metricWidth - 8);
  cursorY -= 76;

  drawHeading("Executive Summary");
  drawTextCard({ title: "Summary", body: report.summary || "No summary available.", tone: "brand" });

  if (report.focusHighlights?.length) {
    drawHeading("Priority Highlights");
    report.focusHighlights.slice(0, 5).forEach((item, index) => {
      drawTextCard({
        title: `Highlight ${index + 1}`,
        body: item,
        tone: "teal",
      });
    });
  }

  if (report.careNote) {
    drawHeading("Clinical Reminder");
    drawTextCard({ title: "Review With A Licensed Clinician", body: report.careNote, tone: "amber" });
  }

  if (report.sections.length) {
    drawHeading("Care Guidance");
    report.sections.forEach((section) => {
      const bullets = section.bullets.map((bullet) => `- ${bullet}`).join(" ");
      drawTextCard({ title: section.heading, body: bullets, tone: "brand" });
    });
  }

  if (report.personalNotes) {
    drawHeading("Personal Notes");
    drawTextCard({ title: "Your Notes", body: report.personalNotes, tone: "teal" });
  }

  if (chats.length) {
    drawHeading("Consultation Timeline");
    chats.slice(-5).forEach((chat, index) => {
      const latestMessages = (chat.messages ?? [])
        .slice(-3)
        .map((message) => `${message.role === "assistant" ? "AI" : "You"}: ${truncate(message.content, 260)}`)
        .join(" ");
      drawTextCard({
        title: `${index + 1}. ${chat.title || "Consultation"} - ${new Date(chat.createdAt).toLocaleDateString()}`,
        body: latestMessages || "No messages available.",
        tone: "brand",
      });
    });
  }

  if (goals.length) {
    drawHeading("Goal Progress");
    goals.forEach((goal) => {
      const progressHistory = goal.progressHistory ?? [];
      const latest = progressHistory[progressHistory.length - 1];
      const progress = Math.max(0, Math.min(100, latest?.value ?? 0));
      const note = latest
        ? `Latest update: ${progress}% on ${new Date(latest.date).toLocaleDateString()}${latest.note ? ` - ${latest.note}` : ""}`
        : "No progress updates recorded yet.";
      const noteLines = wrapText(note, regularFont, 10.5, contentWidth - 34).slice(0, 4);
      const boxHeight = 70 + noteLines.length * 14;

      ensureSpace(boxHeight + 10);
      drawBox({ y: cursorY, boxHeight, color: tealSoft, borderColor: border });
      page.drawText(sanitizeText(goal.title), {
        x: margin + 18,
        y: cursorY - 20,
        font: boldFont,
        size: 12,
        color: teal,
      });
      page.drawText(`${progress}%`, {
        x: width - margin - 54,
        y: cursorY - 22,
        font: boldFont,
        size: 11,
        color: teal,
      });
      page.drawRectangle({
        x: margin + 18,
        y: cursorY - 43,
        width: contentWidth - 36,
        height: 8,
        color: border,
      });
      page.drawRectangle({
        x: margin + 18,
        y: cursorY - 43,
        width: ((contentWidth - 36) * progress) / 100,
        height: 8,
        color: teal,
      });
      cursorY -= 60;
      drawLines({ lines: noteLines, x: margin + 18, font: regularFont, size: 10.5, color: muted, leading: 14 });
      cursorY -= 12;
    });
  }

  drawFooter();
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
          .filter(
            (section: { heading: string; bullets: string[] }) => section.bullets.length > 0
          )
      : [],
  };
}

async function summariseThreadReport({
  thread,
  goals,
}: {
  thread: ChatRecord;
  goals: GoalRecord[];
}): Promise<ReportPayload> {
  const transcript = clampTranscript(thread.messages);
  const goalDigest = goals
    .map((goal) => {
      const history = goal.progressHistory ?? [];
      const latest = history[history.length - 1];
      return `${goal.title}${latest ? ` — latest update ${latest.value}%` : ""}`;
    })
    .join(" | ");

  const prompt = [
    "Compose a physician-style consultation brief as an AI-powered assistant.",
    thread.title ? `Consultation title: ${thread.title}` : undefined,
    transcript ? `Transcript (latest messages last):\n${transcript}` : "Transcript not available.",
    goalDigest ? `Active goals overview: ${goalDigest}` : undefined,
    "Return strict JSON with keys title, summary, careNote, focusHighlights (array of 3 strings), sections (array of objects with heading and bullets).",
    "Headings should cover definition/assessment, possible causes, medication guidance (OTC only when appropriate), lifestyle steps, and urgent warnings when present.",
    "Summaries must cite clinical reasoning, reference hydration and rest when suitable, and finish with a clear disclaimer urging professional care for red flags.",
    "The careNote must include an explicit disclaimer, mention this is AI powered, and advise contacting a licensed clinician when symptoms persist or worsen.",
    "Do not mention Gemini, large language models, or that this is a generated summary.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await callGemini(prompt);
  return parseReportResponse(response);
}

export async function GET(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId");
  const threadId = searchParams.get("threadId");

  await connectToDatabase();

  if (reportId) {
    const reportRecord = (await Report.findOne({ _id: reportId, userId }).lean()) as
      | (ReportDocument & { createdAt: Date })
      | null;

    if (!reportRecord) {
      return new NextResponse("Report not found", { status: 404 });
    }

    const [chats, goals] = await Promise.all([
      Chat.find({ userId }).sort({ createdAt: 1 }).lean().exec(),
      Goal.find({ userId }).lean().exec(),
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
      chats: (chats as unknown as ChatDocument[]).map(mapChatDocument),
      goals: (goals as unknown as GoalDocument[]).map(mapGoalDocument),
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${reportRecord.title.replace(/\s+/g, "-").toLowerCase()}-${reportRecord._id}.pdf`,
      },
    });
  }

  if (threadId) {
    const thread = (await Chat.findOne({ _id: threadId, userId }).lean()) as
      | ChatDocument
      | null;

    if (!thread) {
      return new NextResponse("Consultation not found", { status: 404 });
    }

    const goals = await Goal.find({ userId }).lean().exec();
    const goalRecords: GoalRecord[] = (goals as unknown as GoalDocument[]).map(mapGoalDocument);
    const chatRecord: ChatRecord = {
      createdAt: new Date(thread.createdAt),
      title: thread.title,
      messages: (thread.messages ?? []).map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: new Date(message.createdAt),
      })),
    };

    const report = await summariseThreadReport({
      thread: chatRecord,
      goals: goalRecords,
    });

    const buffer = await buildReportBuffer({
      report: {
        ...report,
        createdAt: new Date(),
      },
      chats: [chatRecord],
      goals: goalRecords,
    });

    const safeTitle = report.title.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase() || "consultation-report";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${safeTitle}-${threadId}.pdf`,
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
          .map(
            (chat, idx) =>
              `Consult ${idx + 1}: ${chat.messages
                .map((message: ChatRecord["messages"][number]) => `${message.role} says ${message.content}`)
                .join(" | ")}`
          )
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
