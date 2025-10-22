"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface DashboardData {
  totalConsultations: number;
  avgConfidence: number;
  symptomCounts: Array<{ keyword: string; count: number }>;
  topSymptoms: Array<{ keyword: string; count: number }>;
  goalProgress: Array<{
    goalId: string;
    title: string;
    latestValue: number;
    roadmapSummary: string;
    roadmapSteps: Array<{ dayLabel: string; focus: string; actions: string[] }>;
    trend: Array<{ date: string; value: number }>;
  }>;
  insights: string;
  currentStreak: number;
  weeklyEngagement: Array<{ label: string; consults: number; checkins: number }>;
  careFocus: Array<{ label: string; score: number; description: string }>;
  nextMilestones: Array<{ goalId: string; title: string; dayLabel: string; focus: string; actions: string[] }>;
  momentumScore: number;
}

const COLORS = ["#6C63FF", "#2EC4B6", "#FFB703", "#F97316", "#22D3EE"];
const FOCUS_COLORS = ["from-brand/20 to-brand/5", "from-success/20 to-success/5", "from-warning/20 to-warning/5"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error(error);
        toast({
          title: "Dashboard unavailable",
          description: "Please refresh to try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card rounded-3xl p-12 text-center text-sm text-slate-500">
        We were unable to load your analytics. Please try again later.
      </div>
    );
  }

  const consultationTrend = data.goalProgress.flatMap((goal) =>
    goal.trend.map((entry) => ({
      name: goal.title,
      date: new Date(entry.date).toLocaleDateString(),
      value: entry.value,
    }))
  );

  const symptomData = data.symptomCounts.filter((item) => item.count > 0);
  const weeklyEngagement = data.weeklyEngagement;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Wellness Intelligence Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Track your consultation history, AI confidence trends, and the symptoms you discuss most.
          </p>
        </div>
        <motion.div
          className="flex items-center gap-3 rounded-full bg-brand/10 px-5 py-2 text-sm font-medium text-brand"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_0_4px_rgba(124,58,237,0.15)]" />
          AI Confidence {data.avgConfidence}%
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-brand">{data.totalConsultations}</p>
            <p className="text-xs text-slate-500">Every conversation powers more personalized care.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-success">{data.goalProgress.length}</p>
            <p className="text-xs text-slate-500">Stay focused with daily progress check-ins.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-warning">{data.currentStreak}</p>
            <p className="text-xs text-slate-500">Consecutive days with a wellness touchpoint.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Momentum Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16">
                <svg className="h-16 w-16" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200 dark:text-slate-700"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                  />
                  <path
                    className="text-brand"
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    strokeDasharray={`${data.momentumScore}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-brand">
                  {data.momentumScore}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                An overall pulse blending consults, goal progress, and streaks.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Wellness Rhythm</CardTitle>
            <p className="text-xs text-slate-500">
              Touchpoints from the past seven days blending conversations and goal check-ins.
            </p>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyEngagement}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#6C63FF" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="consults" name="Consults" stroke="#6C63FF" fill="#6C63FF33" strokeWidth={2} />
                <Bar dataKey="checkins" name="Goal check-ins" fill="#22D3EE" radius={[8, 8, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Care Focus Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.careFocus.map((focus, index) => (
              <div
                key={focus.label}
                className={`rounded-3xl bg-gradient-to-br ${FOCUS_COLORS[index % FOCUS_COLORS.length]} p-4 shadow-inner dark:shadow-none`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{focus.label}</p>
                  <span className="text-lg font-bold text-brand">{focus.score}%</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-200">{focus.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Goal Momentum</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={consultationTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: 16, borderColor: "#6C63FF" }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="value" stroke="#6C63FF" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Symptom Focus</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={symptomData}
                  dataKey="count"
                  nameKey="keyword"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={6}
                >
                  {symptomData.map((entry, index) => (
                    <Cell key={entry.keyword} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#2EC4B6" }} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-4 space-y-1 text-xs text-slate-500">
              {data.topSymptoms.slice(0, 4).map((symptom) => (
                <li key={`${symptom.keyword}-label`} className="flex justify-between">
                  <span className="capitalize">{symptom.keyword}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{symptom.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming AI Roadmap Highlights</CardTitle>
          <p className="text-xs text-slate-500">The assistant&apos;s next actions for each goal based on your roadmap.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.nextMilestones.length === 0 && (
            <p className="text-sm text-slate-500">Set a goal to unlock personalized roadmap milestones.</p>
          )}
          {data.nextMilestones.map((milestone) => (
            <motion.div
              key={milestone.goalId}
              className="rounded-3xl border border-brand/10 bg-white/70 p-5 dark:border-brand/20 dark:bg-slate-900/70"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{milestone.title}</h3>
                <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">{milestone.dayLabel}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{milestone.focus}</p>
              {milestone.actions?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {milestone.actions.slice(0, 3).map((action) => (
                    <span
                      key={action}
                      className="rounded-full bg-brand/15 px-3 py-1 text-xs text-brand dark:bg-brand/20"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wellness Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.insights
            .split(/\n+/)
            .filter(Boolean)
            .map((insight, index) => (
              <div
                key={`${insight}-${index}`}
                className="rounded-3xl border border-brand/10 bg-brand/5 p-4 text-sm leading-relaxed text-slate-700 dark:border-brand/20 dark:bg-slate-900/70 dark:text-slate-200"
              >
                {insight}
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
