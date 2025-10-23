"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, BookOpenCheck, MessagesSquare, PlayCircle } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type DashboardResponse = {
  stats: {
    chats: number;
    videosAnalyzed: number;
    examsTaken: number;
    summariesCreated: number;
  };
  timeline: Array<{ date: string; chats: number; exams: number; summaries: number }>;
  xp: { total: number; target: number; progress: number };
};

const icons = [
  <MessagesSquare key="chat" className="h-5 w-5" />,
  <PlayCircle key="video" className="h-5 w-5" />,
  <BookOpenCheck key="exam" className="h-5 w-5" />,
  <Brain key="summary" className="h-5 w-5" />,
];

export default function DashboardClient() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          throw new Error("Unable to load dashboard");
        }
        const payload = await response.json();
        setData(payload);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = data?.stats ?? {
    chats: 0,
    videosAnalyzed: 0,
    examsTaken: 0,
    summariesCreated: 0,
  };

  const items = [
    { label: "AI Chats", value: stats.chats },
    { label: "Videos Analyzed", value: stats.videosAnalyzed },
    { label: "Exams Taken", value: stats.examsTaken },
    { label: "Summaries Created", value: stats.summariesCreated },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[40px] border border-white/10 bg-background/60 p-6 shadow-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Learning Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Track AI chats, expert sessions, and exam performance in real time.
            </p>
          </div>
          <Badge variant="outline">XP {data?.xp.total ?? 0} / {data?.xp.target ?? 100}</Badge>
        </div>
        <div className="mt-4">
          <Progress value={data?.xp.progress ?? 0} />
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <Card key={item.label} className="bg-background/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {icons[index]}
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{loading ? "--" : item.value}</p>
              <p className="text-xs text-muted-foreground">Powered by Gemini insights</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="bg-background/60">
          <CardHeader>
            <CardTitle>Usage Timeline</CardTitle>
            <CardDescription>Daily interactions across chats, exams, and summaries.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.timeline ?? []}>
                <defs>
                  <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExams" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2ec4b6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2ec4b6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="date" stroke="rgba(148,163,184,0.6)" fontSize={12} />
                <Tooltip
                  cursor={{ stroke: "rgba(108, 99, 255, 0.3)", strokeWidth: 1 }}
                  contentStyle={{ borderRadius: 16, background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.2)" }}
                />
                <Area type="monotone" dataKey="chats" stroke="#6c63ff" fill="url(#colorChats)" />
                <Area type="monotone" dataKey="exams" stroke="#2ec4b6" fill="url(#colorExams)" />
                <Area type="monotone" dataKey="summaries" stroke="#ff9f1c" fillOpacity={0.2} fill="#ff9f1c" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-background/60">
          <CardHeader>
            <CardTitle>XP Progress</CardTitle>
            <CardDescription>Complete chats, exams, and summaries to level up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[10, 25, 15].map((value, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{["Chats", "Exams", "Summaries"][index]}</span>
                  <span className="text-muted-foreground">+{value} XP each</span>
                </div>
                <Progress value={Math.min(100, ((index === 0 ? stats.chats : index === 1 ? stats.examsTaken : stats.summariesCreated) * value) % 100)} />
              </div>
            ))}
            <div className="rounded-3xl border border-white/10 bg-background/70 p-4 text-sm text-muted-foreground">
              Keep interacting with AI Mentor to unlock new badges and higher XP tiers.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
