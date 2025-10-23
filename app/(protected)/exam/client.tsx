"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Loader2, PencilRuler, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";

import type { ExamQuestion } from "@/lib/ai/gemini";

type ExamSession = {
  id: string;
  topic: string;
  questions: ExamQuestion[];
  score: number;
  gradingGuide: string;
  pdfUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

interface ExamClientProps {
  initialExams: ExamSession[];
}

export default function ExamClient({ initialExams }: ExamClientProps) {
  const [exams, setExams] = useState<ExamSession[]>(initialExams);
  const [activeExamId, setActiveExamId] = useState<string | null>(initialExams[0]?.id ?? null);
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const activeExam = useMemo(
    () => exams.find((exam) => exam.id === activeExamId) ?? null,
    [exams, activeExamId],
  );

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Add a topic to generate the exam");
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch("/api/ai/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to generate exam");
      }

      const data = await response.json();
      const exam: ExamSession = data.exam;
      setExams((prev) => [exam, ...prev]);
      setActiveExamId(exam.id);
      setAnswers({});
      setTopic("");
      toast.success("Exam ready");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleGrade = async () => {
    if (!activeExam) return;

    try {
      setIsGrading(true);
      const response = await fetch("/api/ai/exam/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: activeExam.id, answers }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to grade exam");
      }

      const data = await response.json();
      const updated: ExamSession = data.exam;
      setExams((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(`Score: ${updated.score}%`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsGrading(false);
    }
  };

  const handleDelete = async (exam: ExamSession) => {
    if (!confirm("Delete this exam history?")) return;

    try {
      const response = await fetch(`/api/exams/${exam.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete exam");
      setExams((prev) => prev.filter((item) => item.id !== exam.id));
      toast.success("Exam deleted");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDownload = async (exam: ExamSession) => {
    try {
      const response = await fetch(`/api/exams/${exam.id}/pdf`, { method: "POST" });
      if (!response.ok) throw new Error("Unable to create PDF");
      const data = await response.json();
      window.open(data.url, "_blank");
      setExams((prev) => prev.map((item) => (item.id === exam.id ? { ...item, pdfUrl: data.url } : item)));
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
            <CardTitle>AI Exam Generator</CardTitle>
            <CardDescription>Enter a topic for 10 MCQs plus short answers. Gemini handles the grading.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Topic or skill (e.g. Diffusion Models)"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            />
            <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilRuler className="h-4 w-4" />}
              Generate Exam
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-background/60">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{activeExam ? activeExam.topic : "Select an exam"}</CardTitle>
                <CardDescription>
                  Answer all questions, then let Gemini grade and deliver feedback instantly.
                </CardDescription>
              </div>
              {activeExam && (
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline">Score: {activeExam.score ?? 0}%</Badge>
                  <Progress value={activeExam.score ?? 0} className="h-2 w-32" />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {activeExam ? (
              <ScrollArea className="max-h-[520px] space-y-4 pr-4">
                <div className="space-y-5">
                  {activeExam.questions.map((question, index) => (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-3xl border border-white/10 bg-background/70 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{index + 1}. {question.prompt}</p>
                          <Badge variant="outline" className="mt-2">
                            {question.type === "mcq" ? "Multiple Choice" : "Short Answer"}
                          </Badge>
                        </div>
                        {question.isCorrect !== undefined && (
                          <CheckCircle2
                            className={cn(
                              "h-5 w-5",
                              question.isCorrect ? "text-emerald-500" : "text-red-500",
                            )}
                          />
                        )}
                      </div>
                      {question.type === "mcq" ? (
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {question.options?.map((option) => (
                            <button
                              key={option}
                              onClick={() => handleAnswerChange(question.id, option)}
                              className={cn(
                                "rounded-2xl border border-white/10 px-4 py-3 text-left text-sm transition hover:border-primary/50",
                                (answers[question.id] ?? "") === option && "border-primary/70 bg-primary/10",
                              )}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Textarea
                          className="mt-4"
                          placeholder="Write your answer"
                          value={answers[question.id] ?? question.userAnswer ?? ""}
                          onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                        />
                      )}
                      {question.explanation && (
                        <p className="mt-3 text-xs text-muted-foreground">{question.explanation}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">Generate or select an exam to begin.</p>
            )}
            <div className="flex justify-end">
              <Button onClick={handleGrade} disabled={!activeExam || isGrading} className="gap-2">
                {isGrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Grade with Gemini
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-background/60">
        <CardHeader>
          <CardTitle>Exam History</CardTitle>
          <CardDescription>Revisit questions, export notes, and track scores.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[700px] pr-2">
            <div className="space-y-4">
              {exams.length === 0 && <p className="text-sm text-muted-foreground">No exams generated yet.</p>}
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className={cn(
                    "rounded-3xl border border-white/10 bg-background/70 p-4 transition hover:border-primary/40",
                    activeExamId === exam.id && "border-primary/60",
                  )}
                >
                  <button className="w-full text-left" onClick={() => setActiveExamId(exam.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{exam.topic}</h3>
                        <p className="text-xs text-muted-foreground">{formatDate(exam.updatedAt ?? exam.createdAt ?? new Date())}</p>
                      </div>
                      <Badge variant="outline">{exam.score ?? 0}%</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{exam.gradingGuide}</p>
                  </button>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleDelete(exam)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => handleDownload(exam)}>
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
