"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Clock,
  Download,
  Edit3,
  History,
  Loader2,
  Paperclip,
  Pill,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  imageBase64?: string;
}

interface ChatThread {
  _id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const shimmerVariants = {
  animate: {
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
  },
};

function formatRelativeTime(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch (error) {
    console.error(error);
    return "recently";
  }
}

const sectionIconMap: Array<{ pattern: RegExp; icon: LucideIcon }> = [
  { pattern: /(important|warning|caution|disclaimer|note)/i, icon: AlertTriangle },
  { pattern: /(next steps|plan|management|care)/i, icon: ClipboardList },
  { pattern: /(medication|treatment|therapy|pharmac)/i, icon: Pill },
  { pattern: /(cause|symptom|analysis|assessment|diagnos)/i, icon: Activity },
  { pattern: /(definition|overview|summary|insight|introduction)/i, icon: Sparkles },
  { pattern: /(hydration|rest|monitor|lifestyle)/i, icon: ShieldCheck },
];

function pickSectionIcon(title: string): LucideIcon {
  const entry = sectionIconMap.find(({ pattern }) => pattern.test(title));
  return entry ? entry.icon : Sparkles;
}

function renderSectionBody(lines: string[]) {
  return (
    <div className="mt-3 space-y-3 text-slate-700 dark:text-slate-200">
      {lines.map((line, index) => {
        const orderedMatch = line.match(/^(\d+)\.\s*(.*)$/);
        if (orderedMatch) {
          return (
            <div
              key={`ordered-${index}`}
              className="flex items-start gap-3 rounded-2xl border border-brand/10 bg-white/70 p-4 dark:border-brand/20 dark:bg-slate-900/50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                {orderedMatch[1]}
              </span>
              <p className="text-sm leading-relaxed">{orderedMatch[2] || orderedMatch[0]}</p>
            </div>
          );
        }

        if (/^[-•]/.test(line)) {
          const cleaned = line.replace(/^[-•]\s*/, "");
          return (
            <div
              key={`bullet-${index}`}
              className="flex items-start gap-3 rounded-2xl bg-brand/5 p-3 text-sm leading-relaxed dark:bg-brand/10"
            >
              <Pill className="mt-0.5 h-4 w-4 text-brand" />
              <span className="text-slate-700 dark:text-slate-200">{cleaned}</span>
            </div>
          );
        }

        const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
        if (colonMatch && colonMatch[1].length <= 80) {
          return (
            <div
              key={`definition-${index}`}
              className="rounded-2xl border border-brand/10 bg-brand/5 p-3 dark:border-brand/30 dark:bg-brand/15"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand/80">
                {colonMatch[1]}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-100">{colonMatch[2]}</p>
            </div>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="rounded-2xl bg-white/70 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
            {line}
          </p>
        );
      })}
    </div>
  );
}

function renderAssistantContent(content: string) {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6 text-sm leading-relaxed">
      {blocks.map((block, index) => {
        const lines = block.split(/\n+/).map((line) => line.trim()).filter(Boolean);
        if (lines.length === 0) {
          return null;
        }

        const firstLine = lines[0].replace(/^[#*\s]+/, "");
        const headingCandidate = lines.length > 1 && !/^([-•]|\d+\.)/.test(firstLine);

        if (headingCandidate) {
          const title = firstLine;
          const Icon = pickSectionIcon(title);
          const cautionTone = /(important|warning|caution|disclaimer|note)/i.test(title);
          const baseClasses = cautionTone
            ? "border-amber-300/60 bg-amber-50/80 text-amber-900 dark:border-amber-200/30 dark:bg-amber-900/30 dark:text-amber-100"
            : "border-brand/10 bg-white/80 text-slate-800 shadow-inner dark:border-brand/20 dark:bg-slate-900/70 dark:text-slate-100";

          return (
            <div
              key={`section-${index}`}
              className={`rounded-3xl border p-5 backdrop-blur ${baseClasses}`}
            >
              <div className="flex items-center gap-3 text-base font-semibold">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/60 text-brand dark:bg-slate-900/60">
                  <Icon className="h-5 w-5" />
                </span>
                <span>{title}</span>
              </div>
              {renderSectionBody(lines.slice(1))}
            </div>
          );
        }

        if (/^\d+\./.test(firstLine)) {
          return (
            <div key={`standalone-list-${index}`} className="space-y-3">
              {renderSectionBody(lines)}
            </div>
          );
        }

        if (/^[-•]/.test(firstLine)) {
          return (
            <div
              key={`bullet-standalone-${index}`}
              className="space-y-3 rounded-3xl border border-brand/10 bg-brand/5 p-4 dark:border-brand/20 dark:bg-brand/10"
            >
              {renderSectionBody(lines)}
            </div>
          );
        }

        return (
          <p
            key={`plain-${index}`}
            className="rounded-3xl bg-white/80 p-5 text-sm leading-relaxed text-slate-700 shadow-inner dark:bg-slate-900/60 dark:text-slate-200"
          >
            {block}
          </p>
        );
      })}
    </div>
  );
}

export default function ConsultPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | undefined>();
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [downloadingThreadId, setDownloadingThreadId] = useState<string | null>(null);
  const { toast } = useToast();

  const activeThread = useMemo(
    () => (activeThreadId ? threads.find((thread) => thread._id === activeThreadId) ?? null : null),
    [threads, activeThreadId]
  );

  useEffect(() => {
    const loadChats = async () => {
      try {
        const res = await fetch("/api/chat");
        if (!res.ok) {
          throw new Error("Failed to load consultations");
        }
        const data = await res.json();
        const fetchedThreads = (data.chats ?? []) as ChatThread[];
        setThreads(fetchedThreads);
        if (fetchedThreads.length > 0) {
          const firstThread = fetchedThreads[0];
          setActiveThreadId(firstThread._id);
          setMessages(firstThread.messages ?? []);
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Unable to load consultations",
          description: "Please try again later.",
        });
      }
    };

    loadChats();
  }, [toast]);

  useEffect(() => {
    if (!activeThread) {
      setMessages([]);
      return;
    }
    setMessages(activeThread.messages ?? []);
  }, [activeThread]);

  const handleSend = async () => {
    if (!input.trim()) {
      toast({
        title: "Message required",
        description: "Share your symptoms or question to start the consultation.",
      });
      return;
    }

    setLoading(true);
    const optimisticMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: input, createdAt: new Date().toISOString(), imageBase64: image },
      { role: "assistant", content: "AI Doctor is reviewing your information…", createdAt: new Date().toISOString() },
    ];
    setMessages(optimisticMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          imageBase64: image,
          chatId: activeThreadId ?? undefined,
          title: activeThread?.title,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      const updatedChat = data.chat as ChatThread;
      setThreads((prev) => {
        const filtered = prev.filter((item) => item._id !== updatedChat._id);
        return [updatedChat, ...filtered];
      });
      setActiveThreadId(updatedChat._id);
      setMessages(updatedChat.messages ?? []);
      setInput("");
      setImage(undefined);
    } catch (error) {
      console.error(error);
      toast({
        title: "Consultation failed",
        description: "We couldn't reach the AI Doctor. Please try again.",
      });
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result;
      if (typeof base64 === "string") {
        const base64Data = base64.split(",")[1];
        setImage(base64Data);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateThread = () => {
    setActiveThreadId(null);
    setMessages([]);
    setInput("");
    setImage(undefined);
  };

  const downloadThreadReport = async (thread: ChatThread) => {
    setDownloadingThreadId(thread._id);
    try {
      const res = await fetch(`/api/report?threadId=${thread._id}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeTitle = thread.title
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "")
        .toLowerCase() || "consultation";
      link.download = `${safeTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Report prepared",
        description: "Your AI-powered consultation brief is downloading.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Download failed",
        description: "We couldn't create that report. Please try again shortly.",
      });
    } finally {
      setDownloadingThreadId(null);
    }
  };

  const handleSelectThread = (thread: ChatThread) => {
    setActiveThreadId(thread._id);
  };

  const beginEditTitle = (thread: ChatThread) => {
    setEditingTitleId(thread._id);
    setTitleDraft(thread.title);
  };

  const cancelEditTitle = () => {
    setEditingTitleId(null);
    setTitleDraft("");
  };

  const saveTitle = async (threadId: string) => {
    if (!titleDraft.trim()) {
      toast({
        title: "Title required",
        description: "Give your consultation a descriptive title.",
      });
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: threadId, title: titleDraft }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      const updatedChat = data.chat as ChatThread;
      setThreads((prev) => prev.map((thread) => (thread._id === updatedChat._id ? updatedChat : thread)));
      if (activeThreadId === updatedChat._id) {
        setMessages(updatedChat.messages ?? []);
      }
      cancelEditTitle();
      toast({
        title: "Consultation renamed",
        description: "Your consultation title was updated successfully.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to save title",
        description: "Please try again.",
      });
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      const res = await fetch("/api/chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: threadId }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setThreads((prev) => prev.filter((thread) => thread._id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
        setMessages([]);
      }
      toast({
        title: "Consultation removed",
        description: "The conversation has been deleted from your history.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to delete",
        description: "Please try again later.",
      });
    }
  };

  const totalMessages = activeThread?.messages?.length ?? 0;

  const consultStats = [
    {
      label: "Total consultations",
      value: threads.length,
      icon: History,
    },
    {
      label: "Latest activity",
      value: threads.length > 0 ? formatRelativeTime(threads[0].updatedAt ?? threads[0].createdAt) : "—",
      icon: Clock,
    },
    {
      label: "Messages in session",
      value: totalMessages,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
              AI powered
            </span>
            <motion.span
              className="hidden items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand xl:flex"
              variants={shimmerVariants}
              animate="animate"
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
              style={{ backgroundSize: "400% 400%" }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Real-time clinical companion
            </motion.span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">AI Doctor Consultation Lounge</h1>
          <p className="mt-2 max-w-2xl text-base text-slate-500 dark:text-slate-300">
            Describe your symptoms, share daily vitals, and receive doctor-style assessments with suggested next steps and medication
            reminders. Every session is saved securely so you can revisit, rename, or remove them at any time.
          </p>
        </div>
        <motion.div
          className="glass-card w-full max-w-sm rounded-3xl p-5 text-sm xl:w-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <Stethoscope className="h-10 w-10 rounded-2xl bg-brand/10 p-2 text-brand" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wellness snapshot</p>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {threads.length > 0 ? `Last checked ${formatRelativeTime(threads[0].updatedAt ?? threads[0].createdAt)}` : "Awaiting your first check-in"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {consultStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/30 bg-white/50 p-3 text-center dark:border-slate-800/60 dark:bg-slate-900/50">
                <stat.icon className="mx-auto h-5 w-5 text-brand" />
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{stat.value}</p>
                <p className="text-xs uppercase tracking-wider text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <motion.aside
          className="glass-card h-full rounded-3xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Consultation history</h2>
              <p className="text-xs text-slate-500">Manage, rename, or revisit any saved session.</p>
            </div>
            <Button size="icon" variant="outline" onClick={handleCreateThread} aria-label="Start new consultation">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            {threads.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300/60 p-6 text-center text-xs text-slate-400">
                Your upcoming consultations will appear here.
              </p>
            ) : (
              threads.map((thread) => {
                const isActive = thread._id === activeThreadId;
                return (
                  <motion.div
                    key={thread._id}
                    layout
                    className={`group rounded-3xl border p-4 transition ${
                      isActive
                        ? "border-brand/60 bg-brand/5 shadow-[0_20px_60px_-30px_rgba(59,130,246,0.6)]"
                        : "border-transparent bg-white/60 hover:border-brand/30 hover:bg-white/80 dark:bg-slate-900/40"
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => handleSelectThread(thread)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {editingTitleId === thread._id ? (
                          <input
                            value={titleDraft}
                            onChange={(event) => setTitleDraft(event.target.value)}
                            className="w-full rounded-xl border border-brand/40 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                            autoFocus
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{thread.title}</p>
                        )}
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">
                          {format(new Date(thread.updatedAt ?? thread.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-300">
                        {(thread.messages?.[thread.messages.length - 1]?.content ?? "").slice(0, 120) || "Awaiting notes"}
                      </p>
                    </button>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadThreadReport(thread)}
                        disabled={downloadingThreadId === thread._id}
                      >
                        {downloadingThreadId === thread._id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Preparing
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Report
                          </>
                        )}
                      </Button>
                      {editingTitleId === thread._id ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={cancelEditTitle}>
                            Cancel
                          </Button>
                          <Button variant="default" size="sm" onClick={() => saveTitle(thread._id)}>
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => beginEditTitle(thread)} aria-label="Rename consultation">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteThread(thread._id)}
                            aria-label="Delete consultation"
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          <div className="mt-6 rounded-3xl bg-gradient-to-br from-brand/10 via-white/60 to-brand/5 p-5 text-xs text-slate-600 shadow-inner dark:from-brand/10 dark:via-slate-900/60 dark:to-brand/10 dark:text-slate-300">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-brand" />
              <p className="font-semibold">Safety reminder</p>
            </div>
            <p className="mt-2 leading-relaxed">
              Always consult a licensed healthcare professional for urgent concerns. This AI-powered companion offers educational
              insights and suggested over-the-counter options, but it does not replace personalized medical care.
            </p>
          </div>
        </motion.aside>

        <motion.section
          className="glass-card min-h-[520px] rounded-3xl p-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Live consultation</h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Share your symptoms or upload supportive imagery. The AI Doctor responds with physician-style analysis, care plan
                  highlights, and medication cues.
                </p>
              </div>
              <motion.div
                className="flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-xs font-medium text-brand"
                animate={{ opacity: [0.65, 1, 0.65] }}
                transition={{ repeat: Infinity, duration: 4 }}
              >
                <Sparkles className="h-3.5 w-3.5" /> Intelligent review in progress
              </motion.div>
            </div>

            <div className="relative space-y-5 overflow-hidden rounded-3xl bg-gradient-to-br from-white/70 via-white to-white/70 p-6 dark:from-slate-900/60 dark:via-slate-900 dark:to-slate-900/70">
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand/10 to-transparent" aria-hidden />
              {messages.length === 0 && !loading ? (
                <div className="relative z-10 flex flex-col items-center justify-center gap-4 py-16 text-center text-slate-400">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <User className="h-7 w-7" />
                  </div>
                  <p className="text-sm">
                    Begin by telling the AI Doctor how you&apos;re feeling, recent changes, or medications you&apos;re taking.
                  </p>
                </div>
              ) : (
                <div className="relative z-10 space-y-6">
                  {messages.map((message, index) => {
                    const isAssistant = message.role === "assistant";
                    const timestamp = format(new Date(message.createdAt), "MMM d, yyyy - h:mm a");

                    if (isAssistant) {
                      return (
                        <motion.div
                          key={`${message.role}-${index}-${message.createdAt}`}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: index * 0.03 }}
                          className="relative flex gap-4 text-left"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                            <Stethoscope className="h-6 w-6" />
                          </div>
                          <div className="flex-1 space-y-4 rounded-3xl border border-brand/10 bg-white/80 p-5 shadow-lg backdrop-blur dark:border-brand/20 dark:bg-slate-900/80">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand">Doctor&apos;s guidance</p>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400">{timestamp}</span>
                            </div>
                            {renderAssistantContent(message.content)}
                            <div className="rounded-2xl bg-emerald-100/60 p-4 text-xs text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
                              <div className="flex items-center gap-2 font-semibold">
                                <Pill className="h-4 w-4" /> Suggested medication & care tips
                              </div>
                              <p className="mt-2 leading-relaxed">
                                Review the above recommendations and confirm suitability with your pharmacist or doctor. Adjust current
                                prescriptions only under professional guidance.
                              </p>
                            </div>
                            <div className="rounded-2xl bg-amber-100/70 p-4 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                              <div className="flex items-center gap-2 font-semibold">
                                <ShieldCheck className="h-4 w-4" /> Important disclaimer
                              </div>
                              <p className="mt-2 leading-relaxed">
                                This AI-powered consultation provides educational support and does not constitute a definitive medical
                                diagnosis. Seek urgent care if symptoms escalate or new concerns arise.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div
                        key={`${message.role}-${index}-${message.createdAt}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.03 }}
                        className="flex flex-row-reverse gap-4 text-right"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="max-w-xl space-y-3 rounded-3xl bg-brand text-left text-white shadow-lg">
                          <div className="flex items-center justify-between gap-3 rounded-t-3xl bg-brand/80 px-5 py-3 text-xs uppercase tracking-[0.3em]">
                            <span>Patient briefing</span>
                            <span className="text-white/70">{timestamp}</span>
                          </div>
                          <p className="px-5 pb-4 text-sm leading-relaxed">{message.content}</p>
                          {message.imageBase64 && (
                            <div className="overflow-hidden rounded-3xl border border-white/40">
                              <Image
                                src={`data:image/png;base64,${message.imageBase64}`}
                                alt="Consultation attachment"
                                width={320}
                                height={320}
                                className="object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-3xl border border-white/40 bg-white/80 p-6 backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/70">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Describe your symptoms, recent test results, or daily wellness notes."
                className="min-h-[140px] rounded-2xl border-none bg-white/60 text-base shadow-inner focus-visible:ring-2 focus-visible:ring-brand dark:bg-slate-900/60"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-brand">
                  <Paperclip className="h-4 w-4" />
                  Attach image (optional)
                  <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                </label>
                <Button onClick={handleSend} disabled={loading} className="sm:w-auto">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reviewing…
                    </>
                  ) : (
                    <>
                      Send consultation
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              {image && <p className="text-xs text-slate-500">Image attached. It will accompany your next message.</p>}
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-brand/5 via-white/60 to-brand/10 p-5 text-xs text-slate-500 shadow-inner dark:from-brand/10 dark:via-slate-900/60 dark:to-brand/20 dark:text-slate-300">
              <p className="font-semibold uppercase tracking-[0.4em] text-brand">Medical caution</p>
              <p className="mt-2 leading-relaxed">
                Emergency symptoms such as severe chest pain, difficulty breathing, or sudden confusion require immediate attention from
                emergency services. Always follow up with a licensed clinician to validate medication plans and treatment paths.
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
