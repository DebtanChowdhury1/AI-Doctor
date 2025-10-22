"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { Download, Edit3, FileText, Loader2, PlusCircle, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface ReportSection {
  heading: string;
  bullets: string[];
}

interface Report {
  _id: string;
  title: string;
  summary: string;
  careNote?: string;
  focusHighlights: string[];
  sections: ReportSection[];
  personalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, { title: string; personalNotes: string }>>({});
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/report");
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch (error) {
      console.error(error);
      toast({ title: "Unable to load reports", description: "Please try again later." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchReports();
      toast({ title: "Report generated", description: "A fresh PDF snapshot is ready." });
    } catch (error) {
      console.error(error);
      toast({ title: "Generation failed", description: "Please try again." });
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (reportId: string, filename: string) => {
    setDownloadingId(reportId);
    try {
      const res = await fetch(`/api/report?reportId=${reportId}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename || "ai-doctor-report"}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Report ready", description: "Downloaded your selected health report." });
    } catch (error) {
      console.error(error);
      toast({ title: "Download failed", description: "Please try again." });
    } finally {
      setDownloadingId(null);
    }
  };

  const removeReport = async (reportId: string) => {
    setDownloadingId(reportId);
    try {
      const res = await fetch(`/api/report?reportId=${reportId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await fetchReports();
      toast({ title: "Report removed", description: "The report has been deleted." });
    } catch (error) {
      console.error(error);
      toast({ title: "Delete failed", description: "Please try again." });
    } finally {
      setDownloadingId(null);
    }
  };

  const startEditing = (report: Report) => {
    setEditingId(report._id);
    setNotesDraft((prev) => ({
      ...prev,
      [report._id]: {
        title: report.title,
        personalNotes: report.personalNotes ?? "",
      },
    }));
  };

  const updateDraft = (reportId: string, updates: Partial<{ title: string; personalNotes: string }>) => {
    setNotesDraft((prev) => ({
      ...prev,
      [reportId]: {
        title: updates.title ?? prev[reportId]?.title ?? "",
        personalNotes: updates.personalNotes ?? prev[reportId]?.personalNotes ?? "",
      },
    }));
  };

  const saveEdits = async (reportId: string) => {
    const draft = notesDraft[reportId];
    if (!draft) return;
    setDownloadingId(reportId);
    try {
      const res = await fetch("/api/report", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, title: draft.title, personalNotes: draft.personalNotes }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchReports();
      setEditingId(null);
      toast({ title: "Report updated", description: "Details saved successfully." });
    } catch (error) {
      console.error(error);
      toast({ title: "Update failed", description: "Please try again." });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Health Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Export AI-powered summaries of your consultations and goals. Save, edit, or download individual wellness briefs.
          </p>
        </div>
        <motion.div
          className="rounded-full bg-warning/10 px-4 py-2 text-sm font-medium text-warning"
          animate={{ rotate: [0, 2, 0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 6 }}
        >
          Fresh insights every time you generate
        </motion.div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-brand" />
              Personalized PDF summaries
            </CardTitle>
            <p className="text-sm text-slate-500">
              Includes recent consultations, goal progress, and your AI Doctor&apos;s top wellness advice.
            </p>
          </div>
          <Button onClick={generateReport} disabled={generating} className="mt-4 sm:mt-0">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Crafting…
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Generate new report
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Reports are generated on-demand using your latest chats and goal updates. Each PDF is stamped with the generation
            time and includes the AI Doctor&apos;s personalized insights, focus highlights, and a clinical reminder section.
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            <li className="rounded-2xl bg-brand/10 p-4">
              <p className="font-semibold text-brand">Consultation history</p>
              <p className="text-xs text-slate-500">Highlighted conversations and the AI Doctor&apos;s key responses.</p>
            </li>
            <li className="rounded-2xl bg-success/10 p-4">
              <p className="font-semibold text-success">Goal momentum</p>
              <p className="text-xs text-slate-500">Latest check-ins, progress percentages, and motivational nudges.</p>
            </li>
            <li className="rounded-2xl bg-warning/10 p-4">
              <p className="font-semibold text-warning">Actionable insights</p>
              <p className="text-xs text-slate-500">Our AI distills your data into professional recommendations.</p>
            </li>
            <li className="rounded-2xl bg-brand/10 p-4">
              <p className="font-semibold text-brand">Share anywhere</p>
              <p className="text-xs text-slate-500">Download and send to your healthcare providers with confidence.</p>
            </li>
          </ul>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {reports.length === 0 ? (
            <div className="glass-card col-span-full rounded-3xl p-8 text-center text-sm text-slate-500">
              Generate your first report to see your AI-powered health brief.
            </div>
          ) : (
            reports.map((report) => {
              const draft = notesDraft[report._id];
              const isEditing = editingId === report._id;
              return (
                <motion.div key={report._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="flex h-full flex-col">
                    <CardHeader className="space-y-2">
                      {isEditing ? (
                        <Input
                          value={draft?.title ?? report.title}
                          onChange={(event) => updateDraft(report._id, { title: event.target.value })}
                          className="text-lg font-semibold"
                        />
                      ) : (
                        <CardTitle className="text-xl">{report.title}</CardTitle>
                      )}
                      <p className="text-xs text-slate-500">Generated {new Date(report.createdAt).toLocaleString()}</p>
                      {report.careNote && (
                        <p className="rounded-2xl bg-warning/10 p-3 text-xs text-warning">{report.careNote}</p>
                      )}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4 text-sm text-slate-600 dark:text-slate-300">
                      <p className="leading-relaxed">{report.summary}</p>
                      {report.focusHighlights?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/80">Focus highlights</p>
                          <div className="grid gap-2">
                            {report.focusHighlights.map((item) => (
                              <span
                                key={item}
                                className="rounded-2xl border border-brand/10 bg-brand/5 px-3 py-2 text-xs text-brand dark:border-brand/20 dark:bg-slate-900/60"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {report.sections?.length > 0 && (
                        <div className="space-y-3">
                          {report.sections.slice(0, 3).map((section) => (
                            <div
                              key={`${report._id}-${section.heading}`}
                              className="rounded-3xl border border-brand/10 bg-white/80 p-4 dark:border-brand/20 dark:bg-slate-900/60"
                            >
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{section.heading}</p>
                              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                                {section.bullets.slice(0, 4).map((bullet) => (
                                  <li key={bullet}>• {bullet}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                      {isEditing ? (
                        <Textarea
                          value={draft?.personalNotes ?? report.personalNotes ?? ""}
                          onChange={(event) => updateDraft(report._id, { personalNotes: event.target.value })}
                          placeholder="Add personal notes to include in the PDF header"
                        />
                      ) : (
                        report.personalNotes && (
                          <div className="rounded-2xl border border-brand/10 bg-brand/5 p-3 text-xs text-brand dark:border-brand/20 dark:bg-slate-900/60">
                            {report.personalNotes}
                          </div>
                        )
                      )}
                      <div className="mt-auto flex flex-wrap gap-3">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => saveEdits(report._id)}
                              disabled={downloadingId === report._id}
                            >
                              <Loader2
                                className={`mr-2 h-4 w-4 ${downloadingId === report._id ? "animate-spin" : "hidden"}`}
                              />
                              Save changes
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => startEditing(report)}>
                              <Edit3 className="mr-2 h-4 w-4" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadReport(report._id, report.title)}
                              disabled={downloadingId === report._id}
                            >
                              {downloadingId === report._id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="mr-2 h-4 w-4" />
                              )}
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:bg-red-500/10"
                              onClick={() => removeReport(report._id)}
                              disabled={downloadingId === report._id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
