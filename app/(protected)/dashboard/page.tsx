"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
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
    trend: Array<{ date: string; value: number }>;
  }>;
  insights: string;
}

const COLORS = ["#6C63FF", "#2EC4B6", "#FFB703", "#F97316", "#22D3EE"];

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Wellness Intelligence Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Track your consultation history, AI confidence trends, and the symptoms you discuss most.
          </p>
        </div>
        <motion.span
          className="rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          AI Confidence {data.avgConfidence}%
        </motion.span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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
            <CardTitle>Top Symptoms</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {data.topSymptoms.length === 0 && <li>No symptom trends identified yet.</li>}
              {data.topSymptoms.map((symptom) => (
                <li key={symptom.keyword} className="flex justify-between">
                  <span className="capitalize">{symptom.keyword}</span>
                  <span className="font-semibold">{symptom.count}</span>
                </li>
              ))}
            </ul>
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wellness Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {data.insights.split(/\n+/).map((insight, index) => (
              <p key={index} className="leading-relaxed">
                {insight}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
