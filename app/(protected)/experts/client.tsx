"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bot, BrainCircuit, Edit, Globe, MessageSquare, NotebookPen, PlusCircle, Sparkles, Trash } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const defaultExperts = [
  {
    id: "ai",
    name: "AI Research Mentor",
    description: "Deep dive into LLMs, agents, and generative AI breakthroughs.",
    prompt: "You are an elite AI researcher who explains complex concepts with diagrams, maths, and research papers.",
    icon: "bot",
    tone: "visionary",
  },
  {
    id: "web",
    name: "Web Dev Strategist",
    description: "Architect scalable front-end and back-end systems.",
    prompt: "Guide me like a principal engineer building full-stack web applications with best practices.",
    icon: "globe",
    tone: "practical",
  },
  {
    id: "data",
    name: "Data Whisperer",
    description: "Master analytics, machine learning, and dashboards.",
    prompt: "Act as a data scientist mentoring on pipelines, modelling, and visualization.",
    icon: "brain",
    tone: "analytical",
  },
  {
    id: "math",
    name: "Math Sensei",
    description: "Turn problem sets into step-by-step wins.",
    prompt: "Explain mathematics with proofs, intuition, and practice drills.",
    icon: "notebook",
    tone: "supportive",
  },
];

type Expert = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
  tone: string;
  isCustom?: boolean;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface ExpertsClientProps {
  initialExperts: Expert[];
}

const iconMap: Record<string, JSX.Element> = {
  bot: <Bot className="h-5 w-5" />,
  globe: <Globe className="h-5 w-5" />,
  brain: <BrainCircuit className="h-5 w-5" />,
  notebook: <NotebookPen className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
};

export default function ExpertsClient({ initialExperts }: ExpertsClientProps) {
  const [customExperts, setCustomExperts] = useState<Expert[]>(
    initialExperts.map((expert) => ({ ...expert, isCustom: true })),
  );
  const [selectedExpertId, setSelectedExpertId] = useState<string>(defaultExperts[0].id);
  const [history, setHistory] = useState<Record<string, Message[]>>({});
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState({ name: "", prompt: "", description: "" });

  const experts: Expert[] = useMemo(
    () => [...defaultExperts, ...customExperts],
    [customExperts],
  );

  const selectedExpert = experts.find((expert) => expert.id === selectedExpertId) ?? experts[0];
  const messages = history[selectedExpert.id] ?? [];

  const handleAsk = async () => {
    if (!question.trim()) {
      toast.error("Ask something first");
      return;
    }

    try {
      setIsLoading(true);
      const optimistic = [...messages, { role: "user", content: question }];
      setHistory((prev) => ({
        ...prev,
        [selectedExpert.id]: optimistic,
      }));

      const response = await fetch("/api/ai/experts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `${selectedExpert.name}. ${selectedExpert.prompt}`, history: messages, message: question }),
      });

      if (!response.ok) {
        throw new Error("Expert is unavailable right now");
      }

      const data = await response.json();
      const finalHistory = [...optimistic, { role: "assistant", content: data.reply }];
      setHistory((prev) => ({
        ...prev,
        [selectedExpert.id]: finalHistory,
      }));
      setQuestion("");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!draft.name || !draft.prompt) {
      toast.error("Name and prompt are required");
      return;
    }

    try {
      const response = await fetch("/api/experts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft }),
      });

      if (!response.ok) {
        throw new Error("Unable to create expert");
      }

      const data = await response.json();
      const expert: Expert = { ...data.expert, isCustom: true };
      setCustomExperts((prev) => [expert, ...prev]);
      setDraft({ name: "", prompt: "", description: "" });
      setSelectedExpertId(expert.id);
      toast.success("Expert ready");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleEdit = async (expert: Expert) => {
    const name = prompt("Rename expert", expert.name) ?? expert.name;
    const promptText = prompt("Update expert instructions", expert.prompt) ?? expert.prompt;

    try {
      const response = await fetch(`/api/experts/${expert.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...expert, name, prompt: promptText }),
      });

      if (!response.ok) {
        throw new Error("Unable to update expert");
      }

      const data = await response.json();
      const updated: Expert = { ...data.expert, isCustom: true };
      setCustomExperts((prev) => prev.map((item) => (item.id === expert.id ? updated : item)));
      toast.success("Expert updated");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDelete = async (expert: Expert) => {
    if (!confirm("Delete this expert?")) return;

    try {
      const response = await fetch(`/api/experts/${expert.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Unable to delete expert");
      }
      setCustomExperts((prev) => prev.filter((item) => item.id !== expert.id));
      toast.success("Expert removed");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1.8fr]">
      <div className="space-y-6">
        <Card className="bg-background/60">
          <CardHeader>
            <CardTitle>Expert Library</CardTitle>
            <CardDescription>Pick a specialist or create your own mentor persona.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...defaultExperts, ...customExperts].map((expert) => (
                <button
                  key={expert.id}
                  onClick={() => setSelectedExpertId(expert.id)}
                  className={cn(
                    "w-full rounded-3xl border border-white/10 bg-background/70 p-4 text-left transition hover:border-primary/60",
                    selectedExpertId === expert.id && "border-primary/60 shadow-lg",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        {iconMap[expert.icon] ?? iconMap.sparkles}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">{expert.name}</h3>
                        <p className="text-xs text-muted-foreground">{expert.description}</p>
                      </div>
                    </div>
                    {expert.isCustom && (
                      <Badge variant="outline">Custom</Badge>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{expert.prompt}</p>
                  {expert.isCustom && (
                    <div className="mt-3 flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="gap-1" onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(expert);
                      }}>
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(expert);
                      }}>
                        <Trash className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/60">
          <CardHeader>
            <CardTitle>Create Custom Expert</CardTitle>
            <CardDescription>Name, persona, and prompt that shapes responses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Name" value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
            <Input
              placeholder="Short description"
              value={draft.description}
              onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
            />
            <Textarea
              placeholder="Prompt instructions"
              value={draft.prompt}
              onChange={(event) => setDraft((prev) => ({ ...prev, prompt: event.target.value }))}
            />
            <Button onClick={handleCreate} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Add Expert
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-background/60">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{selectedExpert.name}</CardTitle>
              <CardDescription>{selectedExpert.description}</CardDescription>
            </div>
            <Badge variant="outline">Tone: {selectedExpert.tone}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="max-h-[560px] rounded-3xl border border-white/10 bg-background/40 p-6">
            <div className="flex flex-col gap-5">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">Start the conversation to activate this expert.</p>
              )}
              {messages.map((entry, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "max-w-xl rounded-3xl p-5 text-sm shadow-xl backdrop-blur-xl",
                    entry.role === "assistant" ? "self-start bg-primary/10 text-primary" : "self-end bg-background/70",
                  )}
                >
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {entry.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    {entry.role === "assistant" ? selectedExpert.name : "You"}
                  </div>
                  <div className="prose prose-invert whitespace-pre-wrap text-sm leading-relaxed">
                    {entry.content}
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
          <div className="rounded-3xl border border-white/10 bg-background/70 p-4">
            <Textarea
              placeholder="Ask for feedback, code reviews, or insights"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={handleAsk} disabled={isLoading} className="gap-2">
                {isLoading ? <Bot className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Ask Expert
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
