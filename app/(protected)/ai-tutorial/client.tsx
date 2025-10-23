"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Edit3, History, Loader2, MessageCircle, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
};

type ChatSession = {
  id: string;
  title: string;
  sourceType: "youtube" | "text" | string;
  sourceValue?: string;
  insights: string[];
  followUpPrompt?: string;
  messages: ChatMessage[];
  pdfUrl?: string;
  updatedAt: string;
};

interface AiTutorialClientProps {
  initialChats: ChatSession[];
}

export default function AiTutorialClient({ initialChats }: AiTutorialClientProps) {
  const [chats, setChats] = useState<ChatSession[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChats[0]?.id ?? null);
  const [sourceType, setSourceType] = useState<"youtube" | "text">("youtube");
  const [sourceValue, setSourceValue] = useState("");
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResponding, setIsResponding] = useState(false);

  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId) ?? null, [chats, activeChatId]);

  const handleAnalyze = async () => {
    if (!sourceValue.trim()) {
      toast.error("Add a YouTube link or topic to analyze");
      return;
    }

    try {
      setIsAnalyzing(true);
      const response = await fetch("/api/ai/tutorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "analyze", sourceType, sourceValue }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to analyze source");
      }

      const data = await response.json();
      const chat: ChatSession = data.chat;
      setChats((prev) => [chat, ...prev.filter((item) => item.id !== chat.id)]);
      setActiveChatId(chat.id);
      setSourceValue("");
      toast.success("Gemini prepared your tutorial");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !activeChat) {
      toast.error("Select a chat and write a question");
      return;
    }

    try {
      setIsResponding(true);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChat.id
            ? { ...chat, messages: [...chat.messages, { role: "user", content: message }] }
            : chat,
        ),
      );

      const response = await fetch("/api/ai/tutorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "message", chatId: activeChat.id, message }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to chat with tutor");
      }

      const data = await response.json();
      const chat: ChatSession = data.chat;
      setChats((prev) => prev.map((item) => (item.id === chat.id ? chat : item)));
      setMessage("");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsResponding(false);
    }
  };

  const handleRename = async (chat: ChatSession) => {
    const title = prompt("Rename session", chat.title)?.trim();
    if (!title) return;

    try {
      const response = await fetch(`/api/chats/${chat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename chat");
      }

      const data = await response.json();
      const updated: ChatSession = data.chat;
      setChats((prev) => prev.map((item) => (item.id === chat.id ? updated : item)));
      toast.success("Renamed session");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDelete = async (chat: ChatSession) => {
    if (!confirm("Delete this session?")) return;
    try {
      const response = await fetch(`/api/chats/${chat.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete session");
      }

      setChats((prev) => prev.filter((item) => item.id !== chat.id));
      if (activeChatId === chat.id) {
        setActiveChatId((prev) => (prev === chat.id ? null : prev));
      }
      toast.success("Session deleted");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDownload = async (chat: ChatSession) => {
    try {
      const response = await fetch(`/api/chats/${chat.id}/pdf`, { method: "POST" });
      if (!response.ok) {
        throw new Error("Unable to create PDF");
      }
      const data = await response.json();
      const url = data.url as string;
      window.open(url, "_blank");
      setChats((prev) => prev.map((item) => (item.id === chat.id ? { ...item, pdfUrl: url } : item)));
      toast.success("PDF ready");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setSourceValue("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Card className="bg-background/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>AI Tutorial Chat</CardTitle>
              <CardDescription>
                Paste a YouTube link or topic. Gemini 2.0 Flash extracts transcripts, answers questions, and crafts study notes.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleNewChat} className="gap-2">
              <Plus className="h-4 w-4" /> New Session
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={sourceType} onValueChange={(value) => setSourceType(value as "youtube" | "text")}
              className="space-y-4"
            >
              <TabsList>
                <TabsTrigger value="youtube">YouTube Link</TabsTrigger>
                <TabsTrigger value="text">Topic / Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="youtube" className="space-y-3">
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={sourceValue}
                  onChange={(event) => setSourceValue(event.target.value)}
                />
                <Button onClick={handleAnalyze} disabled={isAnalyzing} className="gap-2">
                  {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Analyze Video
                </Button>
              </TabsContent>
              <TabsContent value="text" className="space-y-3">
                <Textarea
                  placeholder="Paste a topic outline, summary, or custom transcript"
                  value={sourceValue}
                  onChange={(event) => setSourceValue(event.target.value)}
                />
                <Button onClick={handleAnalyze} disabled={isAnalyzing} className="gap-2">
                  {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SparkIcon />}
                  Turn into Tutor
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="bg-background/60">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>Center-aligned chat bubbles keep the focus on learning.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <ScrollArea className="max-h-[480px] rounded-3xl border border-white/10 bg-background/40 p-6">
                <div className="flex flex-col items-center gap-6">
                  {activeChat ? (
                    activeChat.messages.map((message, index) => (
                      <motion.div
                        key={`${message.role}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "max-w-2xl rounded-3xl p-6 text-sm shadow-xl backdrop-blur-xl",
                          message.role === "assistant"
                            ? "bg-primary/10 text-primary"
                            : "bg-background/70 text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          {message.role === "assistant" ? <SparkIcon /> : <MessageCircle className="h-3.5 w-3.5" />}
                          {message.role === "assistant" ? "AI Mentor" : "You"}
                        </div>
                        <div className="prose prose-invert mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">
                      Upload a source to begin a new conversation.
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="rounded-3xl border border-white/10 bg-background/60 p-4">
                <Textarea
                  placeholder={activeChat?.followUpPrompt ?? "Ask a question or request a practice quiz"}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <div className="mt-3 flex justify-end">
                  <Button onClick={handleSend} disabled={isResponding || !activeChat} className="gap-2">
                    {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    Ask Tutor
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="bg-background/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>History</CardTitle>
              <CardDescription>Every session is saved with insights and PDF downloads.</CardDescription>
            </div>
            <History className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[680px] pr-2">
              <div className="space-y-4">
                {chats.length === 0 && <p className="text-sm text-muted-foreground">No sessions yet.</p>}
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "rounded-3xl border border-white/10 bg-background/70 p-4 transition hover:border-primary/40",
                      activeChatId === chat.id && "border-primary/60",
                    )}
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => setActiveChatId(chat.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">{chat.title}</h3>
                          <p className="text-xs text-muted-foreground">Updated {formatDate(chat.updatedAt)}</p>
                        </div>
                        <Badge variant="outline">{chat.sourceType === "youtube" ? "Video" : "Topic"}</Badge>
                      </div>
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {chat.insights.slice(0, 3).map((insight, index) => (
                          <li key={index}>• {insight}</li>
                        ))}
                      </ul>
                    </button>
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleRename(chat)}>
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleDelete(chat)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => handleDownload(chat)}>
                        <Download className="h-3.5 w-3.5" /> Note
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SparkIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M5.6 5.6l2.8 2.8" />
      <path d="M15.6 15.6l2.8 2.8" />
      <path d="M5.6 18.4l2.8-2.8" />
      <path d="M15.6 8.4l2.8-2.8" />
    </svg>;
}
