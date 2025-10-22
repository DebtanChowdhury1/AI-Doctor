'use client';

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";

interface Goal {
  _id: string;
  title: string;
  description?: string;
  targetDate?: string;
  progressHistory: Array<{ date: string; value: number; note?: string }>;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingGoal, setUpdatingGoal] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to fetch goals");
      const data = await res.json();
      setGoals(data.goals);
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
        body: JSON.stringify({ title, description, targetDate }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTitle("");
      setDescription("");
      setTargetDate("");
      await fetchGoals();
      toast({ title: "Goal added", description: "Your AI Doctor will keep you accountable." });
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to create goal", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (goalId: string, value: number) => {
    setUpdatingGoal(goalId);
    try {
      const res = await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, value }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchGoals();
      toast({ title: "Progress updated", description: `You\'re ${value}% closer — amazing work!` });
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
      toast({ title: "Goal removed", description: "We\'ll focus on the intentions that matter most." });
    } catch (error) {
      console.error(error);
      toast({ title: "Delete failed", description: "Please try again." });
    } finally {
      setUpdatingGoal(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Goal Tracker</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Set meaningful health goals and check in daily. The AI Doctor celebrates every win.
          </p>
        </div>
        <motion.div
          className="rounded-full bg-brand/10 px-4 py-2 text-sm font-medium text-brand"
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          Consistency builds momentum 💪
        </motion.div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a goal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Improve sleep hygiene" />
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a short description or daily actions." />
          <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
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
            You haven\'t created any goals yet. Start with one simple habit.
          </div>
        ) : (
          goals.map((goal) => {
            const latest = goal.progressHistory[goal.progressHistory.length - 1];
            return (
              <motion.div key={goal._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>{goal.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-500/10"
                        onClick={() => deleteGoal(goal._id)}
                        disabled={updatingGoal === goal._id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    {goal.targetDate && (
                      <p className="text-xs text-slate-500">
                        Target date {format(new Date(goal.targetDate), "PPP")}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                    {goal.description && <p>{goal.description}</p>}
                    <div className="rounded-2xl bg-brand/10 p-4">
                      <p className="font-semibold text-brand">{latest ? `${latest.value}% complete` : 'No updates yet'}</p>
                      <p className="text-xs text-slate-500">Last check-in {latest ? format(new Date(latest.date), "PPP") : 'pending'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[25, 50, 75, 100].map((value) => (
                        <Button
                          key={value}
                          variant="outline"
                          size="sm"
                          onClick={() => updateProgress(goal._id, value)}
                          disabled={updatingGoal === goal._id}
                        >
                          Mark {value}%
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2 text-xs">
                      {goal.progressHistory.slice(-3).map((entry) => (
                        <p key={`${goal._id}-${entry.date}`}>
                          {format(new Date(entry.date), "PPP")} — {entry.value}% {entry.note && `· ${entry.note}`}
                        </p>
                      ))}
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
