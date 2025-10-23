"use client";

import { motion } from "framer-motion";
import { ArrowRight, Brain, GraduationCap, Sparkles, Youtube } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const highlights = [
  {
    icon: <Youtube className="h-6 w-6" />,
    title: "Any video becomes a tutor",
    description: "Drop a YouTube link and unlock transcripts, instant Q&A, and adaptive lessons powered by Gemini 2.0 Flash.",
  },
  {
    icon: <Brain className="h-6 w-6" />,
    title: "Dynamic assessments",
    description: "Generate personalized exams, grade instantly, and capture feedback with living knowledge graphs.",
  },
  {
    icon: <GraduationCap className="h-6 w-6" />,
    title: "Custom AI experts",
    description: "Design your mentor council with unique tones, prompts, and specialties ready on demand.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16 pb-10">
      <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-slate-950/20 via-indigo-900/20 to-slate-900/10 p-12 text-center shadow-xl backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
              ✨ Your personal AI learning universe
            </Badge>
          </div>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-tight text-white md:text-6xl">
            Learn Smarter with <span className="gradient-text">AI Mentor</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-200">
            Transform any topic or video into an interactive tutor. Ask questions, generate exams, summarize insights, and download
            everything as beautiful PDFs — all in one glassmorphic workspace.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="px-8">
              <Link href="/ai-tutorial" className="flex items-center gap-2">
                Start Exploring <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8 text-white">
              <Link href="/summarizer" className="flex items-center gap-2">
                Summarize Anything <Sparkles className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </motion.div>
        <motion.div
          className="pointer-events-none absolute inset-x-0 -bottom-32 h-64 bg-gradient-to-t from-purple-500/40 via-purple-500/5 to-transparent blur-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {highlights.map((highlight, index) => (
          <motion.div
            key={highlight.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.12 }}
            viewport={{ once: true }}
          >
            <Card className="h-full bg-background/80">
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {highlight.icon}
                </div>
                <CardTitle>{highlight.title}</CardTitle>
                <CardDescription>{highlight.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-6 rounded-[40px] border border-white/10 bg-background/50 p-10 shadow-xl backdrop-blur-xl md:grid-cols-2">
        <div className="space-y-4">
          <Badge variant="outline">Workflow</Badge>
          <h2 className="text-3xl font-semibold">One Orbit for Learning</h2>
          <p className="text-muted-foreground">
            Upload YouTube videos, launch expert mentors, practice with AI exams, and summarize your learning streak with
            effortless exports. Every session is saved securely and synced across devices.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>• Gemini 2.0 Flash powers conversational tutoring, grading, and PDF generation.</li>
            <li>• Clerk authentication keeps your learning journeys personal and secure.</li>
            <li>• MongoDB tracks chats, experts, exams, and summaries for instant recall.</li>
          </ul>
          <Button asChild className="px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              View Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4">
          <Card className="bg-background/70">
            <CardHeader>
              <CardTitle>Interactive Tutor</CardTitle>
              <CardDescription>Chat like a pro with center-aligned bubbles and quick note downloads.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                “Explain diffusion models like I am presenting at a hackathon.”
              </p>
              <p className="mt-2 rounded-2xl bg-primary/10 p-3 text-primary">
                “Start with intuition, show code-ready steps, and quiz me at the end.”
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background/70">
            <CardHeader>
              <CardTitle>Exam Engine</CardTitle>
              <CardDescription>Ten MCQs + short answers with automated grading in seconds.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Track XP, streaks, and badges in your dashboard.</p>
              <p>• Export polished PDFs for revision or sharing.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
