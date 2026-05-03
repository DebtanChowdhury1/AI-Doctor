"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

import { CalendarDays, CheckCircle2, Edit3, Loader2, PlusCircle, Target, Trash2, Wand2 } from "lucide-react";

interface GoalRoadmapStep {
  dayLabel: string;
  focus: string;
  actions: string[];
}

interface GoalProgressEntry {
  date: string;
  value: number;
  note?: string;
  guidance?: string;
  checklist?: string[];
}

interface Goal {
  _id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  roadmapSummary?: string;
  roadmap?: GoalRoadmapStep[];
  progressHistory: GoalProgressEntry[];
}

function formatInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseJsonFromText(value?: string) {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normaliseRoadmapStep(step: Record<string, unknown>, index: number): GoalRoadmapStep {
  return {
    dayLabel:
      typeof step.dayLabel === "string"
        ? step.dayLabel
        : typeof step.day_label === "string"
          ? step.day_label
          : typeof step.step_number === "number"
            ? `Step ${step.step_number}`
            : `Step ${index + 1}`,
    focus:
      typeof step.focus === "string"
        ? step.focus
        : typeof step.step_title === "string"
          ? step.step_title
          : "Stay consistent",
    actions: asStringArray(step.actions),
  };
}

function getRoadmapDisplay(goal: Goal) {
  const parsed = parseJsonFromText(goal.roadmapSummary);
  const parsedSteps = parsed
    ? Array.isArray(parsed.steps)
      ? parsed.steps
      : Array.isArray(parsed.roadmap_steps)
        ? parsed.roadmap_steps
        : []
    : [];
  const fallbackRoadmap = parsedSteps
    .filter((step): step is Record<string, unknown> => Boolean(step) && typeof step === "object")
    .map(normaliseRoadmapStep);

  let summary = goal.roadmapSummary;
  if (parsed) {
    if (typeof parsed.summary === "string") {
      summary = parsed.summary;
    } else if (parsed.summary && typeof parsed.summary === "object" && "goal" in parsed.summary) {
      const goalSummary = (parsed.summary as Record<string, unknown>).goal;
      summary = typeof goalSummary === "string" ? goalSummary : summary;
    } else if (typeof parsed.goal_title === "string") {
      summary = parsed.goal_title;
    }
  }

  return {
    summary,
    roadmap: goal.roadmap?.length ? goal.roadmap : fallbackRoadmap,
  };
}

function getGuidanceDisplay(entry?: GoalProgressEntry) {
  const parsed = parseJsonFromText(entry?.guidance);
  if (!parsed) {
    return {
      guidance: entry?.guidance,
      checklist: entry?.checklist ?? [],
    };
  }

  const roadmapSteps = Array.isArray(parsed.roadmap_steps) ? parsed.roadmap_steps : [];
  const fallbackChecklist = roadmapSteps
    .filter((step): step is Record<string, unknown> => Boolean(step) && typeof step === "object")
    .flatMap((step) => asStringArray(step.actions))
    .slice(0, 4);
  const parsedChecklist = asStringArray(parsed.checklist);

  return {
    guidance:
      typeof parsed.guidance === "string"
        ? parsed.guidance
        : typeof parsed.latest_progress === "string"
          ? parsed.latest_progress
          : typeof parsed.goal_title === "string"
            ? `Tomorrow, keep your focus on ${parsed.goal_title}.`
            : entry?.guidance,
    checklist: entry?.checklist?.length ? entry.checklist : parsedChecklist.concat(fallbackChecklist).slice(0, 4),
  };
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingGoal, setUpdatingGoal] = useState<string | null>(null);
  const [dailyUpdates, setDailyUpdates] = useState<Record<string, { value: number; note: string }>>({});
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<
    Record<string, { title: string; description: string; startDate: string; endDate: string; regenerateRoadmap: boolean }>
  >({});
  const { toast } = useToast();

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to fetch goals");
      const data = await res.json();
      setGoals(data.goals);
      setDailyUpdates({});
    } catch (error) {
      console.error(error);
      toast({ title: "Unable to load goals", description: "Please try again later." });
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createGoal = async () => {
    if (!title.trim()) {
      toast({ title: "Goal title required", description: "Give your goal a clear, motivating name." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, startDate, endDate }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTitle("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      await fetchGoals();
      toast({ title: "Goal added", description: "Your AI Doctor mapped a personalized roadmap." });
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to create goal", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleDailyUpdateChange = (goalId: string, updates: Partial<{ value: number; note: string }>) => {
    setDailyUpdates((prev) => ({
      ...prev,
      [goalId]: {
        value: updates.value ?? prev[goalId]?.value ?? 0,
        note: updates.note ?? prev[goalId]?.note ?? "",
      },
    }));
  };

  const submitDailyUpdate = async (goalId: string) => {
    const entry = dailyUpdates[goalId];
    const value = entry?.value ?? goals.find((goal) => goal._id === goalId)?.progressHistory.slice(-1)?.[0]?.value ?? 0;

    if (Number.isNaN(value)) {
      toast({ title: "Choose a progress value", description: "Set the slider before logging your update." });
      return;
    }

    setUpdatingGoal(goalId);
    try {
      const res = await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, value, note: entry?.note }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      await fetchGoals();
      setDailyUpdates((prev) => ({ ...prev, [goalId]: { value, note: "" } }));
      toast({
        title: "Progress updated",
        description: result.plan?.guidance ?? "Tomorrow's plan is ready. Keep the momentum going!",
      });
    } catch (error) {
      console.error(error);
      toast({ title: "Update failed", description: "Please try again." });
    } finally {
      setUpdatingGoal(null);
    }
  };

  const deleteGoal = async (goalId: string) => {
    setUpdatingGoal(goalId);
    try {
      const res = await fetch(`/api/goals?goalId=${goalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await fetchGoals();
      toast({ title: "Goal removed", description: "We&apos;ll focus on the intentions that matter most." });
    } catch (error) {
      console.error(error);
      toast({ title: "Delete failed", description: "Please try again." });
    } finally {
      setUpdatingGoal(null);
    }
  };

  const startEditing = (goal: Goal) => {
    setEditGoalId(goal._id);
    setEditDrafts((prev) => ({
      ...prev,
      [goal._id]: {
        title: goal.title,
        description: goal.description ?? "",
        startDate: formatInputDate(goal.startDate),
        endDate: formatInputDate(goal.endDate),
        regenerateRoadmap: false,
      },
    }));
  };

  const updateEditDraft = (
    goalId: string,
    updates: Partial<{ title: string; description: string; startDate: string; endDate: string; regenerateRoadmap: boolean }>
  ) => {
    setEditDrafts((prev) => ({
      ...prev,
      [goalId]: {
        title: updates.title ?? prev[goalId]?.title ?? "",
        description: updates.description ?? prev[goalId]?.description ?? "",
        startDate: updates.startDate ?? prev[goalId]?.startDate ?? "",
        endDate: updates.endDate ?? prev[goalId]?.endDate ?? "",
        regenerateRoadmap: updates.regenerateRoadmap ?? prev[goalId]?.regenerateRoadmap ?? false,
      },
    }));
  };

  const saveGoalEdits = async (goalId: string) => {
    const draft = editDrafts[goalId];
    if (!draft) return;

    setUpdatingGoal(goalId);
    try {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId,
          title: draft.title,
          description: draft.description,
          startDate: draft.startDate || undefined,
          endDate: draft.endDate || undefined,
          regenerateRoadmap: draft.regenerateRoadmap,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchGoals();
      setEditGoalId(null);
      toast({ title: "Goal updated", description: "Your AI roadmap has been refreshed." });
    } catch (error) {
      console.error(error);
      toast({ title: "Update failed", description: "Please try again." });
    } finally {
      setUpdatingGoal(null);
    }
  };

  const cancelEdit = () => {
    setEditGoalId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Goal Navigator</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Plot your start and finish dates, then let our AI-powered doctor craft the roadmap and daily motivation.
          </p>
        </div>
        <motion.div
          className="rounded-full bg-brand/10 px-4 py-2 text-sm font-medium text-brand"
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          Consistency builds momentum
        </motion.div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a goal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Improve sleep hygiene" />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add a short description or daily actions."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                <CalendarDays className="h-4 w-4" /> Start date
              </label>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                <CalendarDays className="h-4 w-4" /> Target date
              </label>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
          </div>
          <Button onClick={createGoal} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add goal
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {goals.length === 0 ? (
          <div className="glass-card col-span-full rounded-3xl p-8 text-center text-sm text-slate-500">
            You haven&apos;t created any goals yet. Start with one simple habit.
          </div>
        ) : (
          goals.map((goal) => {
            const latest = goal.progressHistory[goal.progressHistory.length - 1];
            const updateDraft = dailyUpdates[goal._id] ?? {
              value: latest?.value ?? 0,
              note: "",
            };
            const editDraft = editDrafts[goal._id];
            const roadmapDisplay = getRoadmapDisplay(goal);
            const guidanceDisplay = getGuidanceDisplay(latest);

            return (
              <motion.div key={goal._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="flex h-full flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>{goal.title}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-brand hover:bg-brand/10"
                          onClick={() => startEditing(goal)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-500/10"
                          onClick={() => deleteGoal(goal._id)}
                          disabled={updatingGoal === goal._id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {goal.startDate && <span>Start: {format(new Date(goal.startDate), "PPP")}</span>}
                      {goal.endDate && <span>Target: {format(new Date(goal.endDate), "PPP")}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col space-y-5 text-sm text-slate-600 dark:text-slate-300">
                    {editGoalId === goal._id && editDraft ? (
                      <div className="rounded-3xl border border-brand/10 bg-brand/5 p-4 dark:border-brand/20 dark:bg-slate-900/60">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            value={editDraft.title}
                            onChange={(event) => updateEditDraft(goal._id, { title: event.target.value })}
                            placeholder="Goal title"
                          />
                          <Input
                            type="date"
                            value={editDraft.startDate}
                            onChange={(event) => updateEditDraft(goal._id, { startDate: event.target.value })}
                          />
                          <Textarea
                            className="sm:col-span-2"
                            value={editDraft.description}
                            onChange={(event) => updateEditDraft(goal._id, { description: event.target.value })}
                            placeholder="Update description"
                          />
                          <Input
                            type="date"
                            value={editDraft.endDate}
                            onChange={(event) => updateEditDraft(goal._id, { endDate: event.target.value })}
                          />
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-500 sm:justify-end">
                            <input
                              type="checkbox"
                              checked={editDraft.regenerateRoadmap}
                              onChange={(event) =>
                                updateEditDraft(goal._id, { regenerateRoadmap: event.target.checked })
                              }
                            />
                            Refresh roadmap with AI
                          </label>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <Button
                            size="sm"
                            onClick={() => saveGoalEdits(goal._id)}
                            disabled={updatingGoal === goal._id}
                          >
                            <Wand2 className="mr-2 h-4 w-4" /> Save updates
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {goal.description && <p>{goal.description}</p>}
                        {roadmapDisplay.summary && (
                          <div className="rounded-2xl border border-brand/10 bg-brand/10 p-4 text-sm font-medium text-brand dark:border-brand/20 dark:bg-brand/15">
                            {roadmapDisplay.summary}
                          </div>
                        )}
                      </>
                    )}

                    {roadmapDisplay.roadmap.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand/80">
                          <Target className="h-4 w-4" />
                          <span>Roadmap milestones</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {roadmapDisplay.roadmap.slice(0, 6).map((step, index) => (
                            <div
                              key={`${goal._id}-roadmap-${step.dayLabel}-${index}`}
                              className="rounded-2xl border border-brand/10 bg-white/80 p-3 shadow-sm dark:border-brand/20 dark:bg-slate-900/60"
                            >
                              <p className="text-xs font-semibold text-brand">{step.dayLabel}</p>
                              <p className="mt-1 break-words text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {step.focus}
                              </p>
                              {step.actions?.length > 0 && (
                                <ul className="mt-2 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                                  {step.actions.slice(0, 3).map((action) => (
                                    <li key={action} className="flex gap-2">
                                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                                      <span className="break-words">{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/80">
                        Daily update
                      </p>
                      <div className="rounded-3xl border border-brand/10 p-4 dark:border-brand/20">
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={updateDraft.value}
                            onChange={(event) =>
                              handleDailyUpdateChange(goal._id, { value: Number(event.target.value) })
                            }
                            className="h-2 w-full accent-brand"
                          />
                          <span className="text-sm font-semibold text-brand">{updateDraft.value}%</span>
                        </div>
                        <Textarea
                          className="mt-3"
                          placeholder="Add a quick note about today&apos;s progress"
                          value={updateDraft.note}
                          onChange={(event) => handleDailyUpdateChange(goal._id, { note: event.target.value })}
                        />
                        <Button
                          className="mt-3"
                          onClick={() => submitDailyUpdate(goal._id)}
                          disabled={updatingGoal === goal._id}
                        >
                          {updatingGoal === goal._id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Logging
                            </>
                          ) : (
                            <>Log today&apos;s progress</>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      {guidanceDisplay.guidance ? (
                        <div className="rounded-2xl border border-brand/10 bg-brand/5 p-4 dark:border-brand/20 dark:bg-slate-900/70">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand/80">
                            <Wand2 className="h-4 w-4" />
                            <span>AI powered guidance for tomorrow</span>
                          </div>
                          <p className="mt-3 break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                            {guidanceDisplay.guidance}
                          </p>
                          {guidanceDisplay.checklist.length > 0 && (
                            <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                              {guidanceDisplay.checklist.map((item) => (
                                <li key={item} className="flex gap-2">
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                                  <span className="break-words">{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-500">
                          Log your first daily update to unlock tomorrow&apos;s personalized plan.
                        </p>
                      )}

                      <div className="space-y-2">
                        {goal.progressHistory.slice(-3).map((entry) => (
                          <p key={`${goal._id}-${entry.date}`}>
                            {format(new Date(entry.date), "PPP")} - {entry.value}%
                            {entry.note && ` - ${entry.note}`}
                          </p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
