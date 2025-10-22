import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import PDFDocument from "pdfkit";
import { connectToDatabase } from "@/lib/mongoose";
import { Chat } from "@/models/Chat";
import { Goal } from "@/models/Goal";
import { callGemini } from "@/lib/gemini";

async function buildReportBuffer({
  summary,
  chats,
  goals,
}: {
  summary: string;
  chats: Array<{ createdAt: Date; messages: Array<{ role: string; content: string; createdAt: Date }> }>;
  goals: Array<{ title: string; progressHistory: Array<{ date: Date; value: number; note?: string }> }>;
}) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const buffers: Uint8Array[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (data) => buffers.push(data));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err) => reject(err));

    doc.fontSize(24).fillColor("#1f2937").text("AI Doctor Health Summary", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).fillColor("#4b5563").text(new Date().toLocaleString(), { align: "center" });
    doc.moveDown(2);

    doc.fontSize(16).fillColor("#111827").text("Wellness Insights", { underline: true });
    doc.moveDown();
    summary.split(/\n+/).forEach((line) => {
      doc.fontSize(12).fillColor("#374151").text(`• ${line}`);
    });

    doc.moveDown(2);
    doc.fontSize(16).fillColor("#111827").text("Consultation Highlights", { underline: true });
    doc.moveDown();

    chats.slice(-5).forEach((chat, index) => {
      doc.fontSize(13).fillColor("#1f2937").text(`Consultation ${index + 1} — ${new Date(chat.createdAt).toLocaleDateString()}`);
      chat.messages.slice(-4).forEach((message) => {
        doc
          .fontSize(11)
          .fillColor(message.role === "assistant" ? "#2563eb" : "#16a34a")
          .text(`${message.role === "assistant" ? "AI" : "You"}: ${message.content}`, {
            indent: 20,
          });
      });
      doc.moveDown();
    });

    doc.moveDown();
    doc.fontSize(16).fillColor("#111827").text("Goal Progress", { underline: true });
    doc.moveDown();

    goals.forEach((goal) => {
      const latest = goal.progressHistory[goal.progressHistory.length - 1];
      doc.fontSize(13).fillColor("#111827").text(goal.title);
      if (latest) {
        doc
          .fontSize(11)
          .fillColor("#374151")
          .text(`Latest progress: ${latest.value}% on ${new Date(latest.date).toLocaleDateString()}`);
      }
      goal.progressHistory.slice(-3).forEach((entry) => {
        doc
          .fontSize(11)
          .fillColor("#4b5563")
          .text(`• ${new Date(entry.date).toLocaleDateString()}: ${entry.value}% ${entry.note ? `- ${entry.note}` : ""}`);
      });
      doc.moveDown();
    });

    doc.end();
  });
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
      const latest = goal.progressHistory[goal.progressHistory.length - 1];
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
