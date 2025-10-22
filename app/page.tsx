"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { AnimatedDoctor } from "@/components/layout/animated-doctor";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-12 text-center">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex max-w-3xl flex-col items-center gap-6"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-5 py-2 text-sm font-medium text-brand">
          <Sparkles className="h-4 w-4" /> AI Doctor — Your Smart Health Companion
        </span>
        <h1 className="grad-text text-4xl font-bold leading-tight sm:text-6xl">
          Intelligent, compassionate health guidance in seconds.
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Chat securely with our Gemini-powered medical assistant, monitor your wellness goals, and receive actionable insights
          crafted just for you. Sign in to unlock personalized, always-available care.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="px-8">
            <Link href="/consult" className="flex items-center gap-2">
              Start Consultation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8">
            <Link href="/dashboard">Explore Dashboard</Link>
          </Button>
        </div>
      </motion.section>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.9 }}
        className="glass-card flex w-full flex-col gap-8 rounded-3xl p-10 shadow-2xl sm:flex-row sm:items-center"
      >
        <AnimatedDoctor />
        <div className="flex-1 space-y-5 text-left">
          <h2 className="text-2xl font-semibold">Always-on support for your health journey</h2>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
              AI consultations with empathetic explanations and next steps.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-success" />
              Dashboards and goals that turn your data into motivating insights.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-warning" />
              Secure PDF reports to share with your care team.
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
