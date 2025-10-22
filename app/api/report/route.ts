import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { PDFDocument, PDFFont, RGB, StandardFonts, rgb } from "pdf-lib";
import { connectToDatabase } from "@/lib/mongoose";
import { Chat } from "@/models/Chat";
import { Goal } from "@/models/Goal";
import { callGemini } from "@/lib/gemini";

export const runtime = "nodejs";

type ChatRecord = {
  createdAt: Date;
  messages: Array<{ role: string; content: string; createdAt: Date }>;
};

type GoalRecord = {
  title: string;
  progressHistory?: Array<{ date: Date; value: number; note?: string }>;
};

async function buildReportBuffer({
  summary,
  chats,
  goals,
}: {
  summary: string;
  chats: ChatRecord[];
  goals: GoalRecord[];
}) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();
  const margin = 50;

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const headingColor = rgb(31 / 255, 41 / 255, 55 / 255);
  const subheadingColor = rgb(17 / 255, 24 / 255, 39 / 255);
  const bodyColor = rgb(55 / 255, 65 / 255, 81 / 255);
  const accentColor = rgb(37 / 255, 99 / 255, 235 / 255);
  const successColor = rgb(22 / 255, 163 / 255, 74 / 255);

  let { width, height } = page.getSize();
  let cursorY = height - margin;

  const lineHeight = (size: number) => size * 1.4;

  const newPage = () => {
    page = pdfDoc.addPage();
    ({ width, height } = page.getSize());
    cursorY = height - margin;
  };

  const ensureSpace = (size: number) => {
    if (cursorY - size < margin) {
      newPage();
    }
  };

  const drawLine = (
    text: string,
    {
      font = regularFont,
      size = 12,
      color = bodyColor,
      indent = 0,
    }: {
      font?: PDFFont;
      size?: number;
      color?: RGB;
      indent?: number;
    }
  ) => {
    const heightNeeded = lineHeight(size);
    ensureSpace(heightNeeded);
    page.drawText(text, {
      x: margin + indent,
      y: cursorY - size,
      font,
      size,
      color,
    });
    cursorY -= heightNeeded;
  };

  const drawParagraph = (
    text: string,
    options: {
      font?: PDFFont;
      size?: number;
      color?: RGB;
      indent?: number;
      bullet?: boolean;
    } = {}
  ) => {
    const { font = regularFont, size = 12, color = bodyColor, indent = 0, bullet = false } = options;
    const maxWidth = width - margin * 2 - indent;
    const words = text.split(/\s+/);
    let line = bullet ? "•" : "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      const candidateWidth = font.widthOfTextAtSize(candidate, size);
      if (candidateWidth > maxWidth && line) {
        drawLine(line, { font, size, color, indent });
        line = bullet ? `  ${word}` : word;
      } else {
        line = candidate;
      }
    });
    if (line.trim()) {
      drawLine(line, { font, size, color, indent });
    }
  };

  const drawCenteredLine = (
    text: string,
    {
      font = boldFont,
      size = 16,
      color = headingColor,
    }: {
      font?: PDFFont;
      size?: number;
      color?: RGB;
    } = {}
  ) => {
    const heightNeeded = lineHeight(size);
    ensureSpace(heightNeeded);
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: margin + (width - margin * 2 - textWidth) / 2,
      y: cursorY - size,
      font,
      size,
      color,
    });
    cursorY -= heightNeeded;
  };

  const spacer = (multiplier = 1) => {
    const size = 8 * multiplier;
    ensureSpace(size);
    cursorY -= size;
  };

  drawCenteredLine("AI Doctor Health Summary", {
    font: boldFont,
    size: 24,
    color: headingColor,
  });
  drawCenteredLine(new Date().toLocaleString(), {
    font: regularFont,
    size: 12,
    color: bodyColor,
  });
  spacer(2);

  drawLine("Wellness Insights", {
    font: boldFont,
    size: 16,
    color: subheadingColor,
  });
  spacer(0.5);
  const summaryLines = summary
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (summaryLines.length === 0) {
    drawParagraph("No wellness insights available yet. Start a consultation to generate AI guidance.", {
      bullet: false,
    });
  } else {
    summaryLines.forEach((line) => {
      const hasBulletPrefix = /^[•\-]/.test(line);
      const cleanLine = hasBulletPrefix ? line.replace(/^[•\-\s]+/, "") : line;
      const shouldBullet = hasBulletPrefix || summaryLines.length > 1;
      drawParagraph(cleanLine, { bullet: shouldBullet });
    });
  }

  spacer(1.5);
  drawLine("Consultation Highlights", {
    font: boldFont,
    size: 16,
    color: subheadingColor,
  });
  spacer(0.5);

  chats.slice(-5).forEach((chat, index) => {
    const date = new Date(chat.createdAt).toLocaleDateString();
    drawLine(`Consultation ${index + 1} — ${date}`, {
      font: boldFont,
      size: 13,
      color: headingColor,
    });

    (chat.messages ?? []).slice(-4).forEach((message) => {
      const color = message.role === "assistant" ? accentColor : successColor;
      drawParagraph(`${message.role === "assistant" ? "AI" : "You"}: ${message.content}`, {
        size: 11,
        color,
        indent: 16,
      });
    });

    spacer();
  });

  spacer();
  drawLine("Goal Progress", {
    font: boldFont,
    size: 16,
    color: subheadingColor,
  });
  spacer(0.5);

  goals.forEach((goal) => {
    const progressHistory = goal.progressHistory ?? [];
    drawLine(goal.title, {
      font: boldFont,
      size: 13,
      color: headingColor,
    });
    const latest = progressHistory[progressHistory.length - 1];
    if (latest) {
      drawParagraph(
        `Latest progress: ${latest.value}% on ${new Date(latest.date).toLocaleDateString()}`,
        {
          size: 11,
          color: bodyColor,
          indent: 12,
        }
      );
    }

    progressHistory.slice(-3).forEach((entry) => {
      const noteText = entry.note ? ` - ${entry.note}` : "";
      const details = `${new Date(entry.date).toLocaleDateString()}: ${entry.value}%${noteText}`;
      drawParagraph(details, {
        size: 11,
        color: bodyColor,
        indent: 18,
        bullet: true,
      });
    });

    spacer();
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await connectToDatabase();
  const chats = await Chat.find({ userId }).sort({ createdAt: 1 }).lean();
  const goals = await Goal.find({ userId }).lean();

  const summaryPrompt = `Create a short health summary for a patient using consultations: ${chats
    .map((chat) =>
      chat.messages
        .map((message) => `${message.role}: ${message.content}`)
        .join(" | ")
    )
    .join(" || ")} and goals: ${goals
    .map((goal) => {
      const history = goal.progressHistory ?? [];
      const latest = history[history.length - 1];
      return `${goal.title} latest ${(latest?.value ?? 0)}%`;
    })
    .join(", ")}. Provide three bullet insights.`;

  const summary = await callGemini(summaryPrompt);

  const buffer = await buildReportBuffer({ summary, chats, goals });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=ai-doctor-health-report.pdf",
    },
  });
}
