"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, NotebookText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";


type SummaryRecord = {
  id: string;
  source: string;
  originalText: string;
  summary: string;
  keyPoints: string[];
  quiz: Array<{ question: string; answer: string }>;
  pdfUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

interface SummarizerClientProps {
  initialSummaries: SummaryRecord[];
}

export default function SummarizerClient({ initialSummaries }: SummarizerClientProps) {
  const [summaries, setSummaries] = useState<SummaryRecord[]>(initialSummaries);
  const [activeId, setActiveId] = useState<string | null>(initialSummaries[0]?.id ?? null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("Untitled Source");
  const [isSummarizing, setIsSummarizing] = useState(false);

  const activeSummary = useMemo(
    () => summaries.find((summary) => summary.id === activeId) ?? null,
    [summaries, activeId],
  );

  const handleSummarize = async () => {
    if (!text.trim()) {
      toast.error("Paste some text to summarize");
      return;
    }

    try {
      setIsSummarizing(true);
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source: title }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to summarize");
      }

      const data = await response.json();
      const record: SummaryRecord = data.summary;
      setSummaries((prev) => [record, ...prev]);
      setActiveId(record.id);
      setText("");
      toast.success("Summary complete");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDelete = async (summary: SummaryRecord) => {
    if (!confirm("Delete this summary?")) return;

    try {
      const response = await fetch(`/api/summaries/${summary.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete summary");
      setSummaries((prev) => prev.filter((item) => item.id !== summary.id));
      toast.success("Summary removed");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDownload = async (summary: SummaryRecord) => {
    try {
      const response = await fetch(`/api/summaries/${summary.id}/pdf`, { method: "POST" });
      if (!response.ok) throw new Error("Unable to create PDF");
      const data = await response.json();
      window.open(data.url, "_blank");
      setSummaries((prev) => prev.map((item) => (item.id === summary.id ? { ...item, pdfUrl: data.url } : item)));
      toast.success("PDF ready");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <Card className="bg-background/60">
          <CardHeader>
            <CardTitle>AI Summarizer</CardTitle>
            <CardDescription>Paste text, transcripts, or research to generate key insights and quizzes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Source name" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Textarea
              placeholder="Paste article, notes, or transcript here"
              minRows={12}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <Button onClick={handleSummarize} disabled={isSummarizing} className="gap-2">
              {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookText className="h-4 w-4" />}
              Summarize
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-background/60">
          <CardHeader>
            <CardTitle>{activeSummary ? activeSummary.source : "Summary"}</CardTitle>
            <CardDescription>Insights, highlights, and practice questions ready for download.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {activeSummary ? (
              <div className="space-y-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl border border-white/10 bg-background/70 p-5">
                  <h3 className="text-sm font-semibold">Key Takeaways</h3>
                  <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{activeSummary.summary}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/10 bg-background/70 p-5">
                  <h3 className="text-sm font-semibold">Highlights</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {activeSummary.keyPoints.map((point, index) => (
                      <li key={index}>• {point}</li>
                    ))}
                  </ul>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/10 bg-background/70 p-5">
                  <h3 className="text-sm font-semibold">Mini Quiz</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {activeSummary.quiz.map((item, index) => (
                      <li key={index}>
                        <p className="font-medium">{index + 1}. {item.question}</p>
                        <p className="text-xs">Answer: {item.answer}</p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Summaries will appear here.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-background/60">
        <CardHeader>
          <CardTitle>Summary History</CardTitle>
          <CardDescription>Edit, delete, or download your knowledge packets.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[700px] pr-2">
            <div className="space-y-4">
              {summaries.length === 0 && <p className="text-sm text-muted-foreground">No summaries yet.</p>}
              {summaries.map((summary) => (
                <div
                  key={summary.id}
                  className={cn(
                    "rounded-3xl border border-white/10 bg-background/70 p-4 transition hover:border-primary/40",
                    activeId === summary.id && "border-primary/60",
                  )}
                >
                  <button className="w-full text-left" onClick={() => setActiveId(summary.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{summary.source}</h3>
                        <p className="text-xs text-muted-foreground">{formatDate(summary.updatedAt ?? summary.createdAt ?? new Date())}</p>
                      </div>
                      <Badge variant="outline">{summary.quiz.length} Qs</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{summary.summary}</p>
                  </button>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleDelete(summary)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => handleDownload(summary)}>
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
