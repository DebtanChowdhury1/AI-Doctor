"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/report");
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ai-doctor-health-report.pdf";
      link.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Report ready", description: "Your personalized health PDF has been downloaded." });
    } catch (error) {
      console.error(error);
      toast({ title: "Download failed", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Health Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Export AI-curated summaries of your consultations and goals to share with your care team.
          </p>
        </div>
        <motion.div
          className="rounded-full bg-warning/10 px-4 py-2 text-sm font-medium text-warning"
          animate={{ rotate: [0, 2, 0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 6 }}
        >
          Fresh insights every time you download
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
              Includes recent consultations, goal progress, and AI Doctor&apos;s top wellness advice.
            </p>
          </div>
          <Button onClick={handleDownload} disabled={loading} className="mt-4 sm:mt-0">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download report
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Reports are generated on-demand using your latest chats and goal updates. Each PDF is stamped with the generation
            time and includes the AI Doctor&apos;s personalized insights and recommendations.
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            <li className="rounded-2xl bg-brand/10 p-4">
              <p className="font-semibold text-brand">Consultation history</p>
              <p className="text-xs text-slate-500">
                Highlighted conversations and the AI Doctor&apos;s key responses.
              </p>
            </li>
            <li className="rounded-2xl bg-success/10 p-4">
              <p className="font-semibold text-success">Goal momentum</p>
              <p className="text-xs text-slate-500">
                Latest check-ins, progress percentages, and motivational nudges.
              </p>
            </li>
            <li className="rounded-2xl bg-warning/10 p-4">
              <p className="font-semibold text-warning">Actionable insights</p>
              <p className="text-xs text-slate-500">
                Our AI distills your data into professional recommendations.
              </p>
            </li>
            <li className="rounded-2xl bg-brand/10 p-4">
              <p className="font-semibold text-brand">Share anywhere</p>
              <p className="text-xs text-slate-500">
                Download and send to your healthcare providers with confidence.
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
