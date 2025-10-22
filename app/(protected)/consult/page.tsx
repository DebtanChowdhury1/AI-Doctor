"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2, Paperclip, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  imageBase64?: string;
}

export default function ConsultPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    const loadChats = async () => {
      try {
        const res = await fetch("/api/chat");
        if (!res.ok) {
          throw new Error("Failed to load chats");
        }
        const data = await res.json();
        const latest = data.chats?.[0]?.messages ?? [];
        setMessages(latest);
      } catch (error) {
        console.error(error);
        toast({
          title: "Unable to load chats",
          description: "Please try again later.",
        });
      }
    };

    loadChats();
  }, [toast]);

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
      { role: 'user', content: input, createdAt: new Date().toISOString(), imageBase64: image },
      { role: 'assistant', content: 'AI Doctor is analyzing your information…', createdAt: new Date().toISOString() },
    ];
    setMessages(optimisticMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, imageBase64: image }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setMessages(data.chat.messages);
      setInput("");
      setImage(undefined);
    } catch (error) {
      console.error(error);
      toast({
        title: "Consultation failed",
        description: "We couldn\'t reach the AI Doctor. Please try again.",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">AI Consultation</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Share your symptoms or upload an image for the AI Doctor to review. Responses are saved securely to your profile.
          </p>
        </div>
        <motion.div
          className="flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-brand"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 4 }}
        >
          <Sparkles className="h-4 w-4" /> Gemini 2.0 Flash in real-time
        </motion.div>
      </div>

      <div className="glass-card min-h-[480px] rounded-3xl p-6">
        <div className="space-y-5">
          {messages.length === 0 && !loading ? (
            <p className="text-center text-sm text-slate-500">
              Describe how you are feeling today to begin your AI consultation.
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={`${message.role}-${index}-${message.createdAt}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.02 }}
                  className={`flex gap-3 ${message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse text-right'}`}
                >
                  <div
                    className={`rounded-3xl px-5 py-3 text-sm shadow-lg ${
                      message.role === 'assistant'
                        ? 'bg-white/80 text-slate-700 dark:bg-slate-900/80 dark:text-slate-100'
                        : 'bg-brand text-white'
                    }`}
                  >
                    <p>{message.content}</p>
                    {message.imageBase64 && (
                      <div className="mt-3 overflow-hidden rounded-2xl border border-white/40">
                        <Image
                          src={`data:image/png;base64,${message.imageBase64}`}
                          alt="Consultation attachment"
                          width={220}
                          height={220}
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="grid gap-4">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe your symptoms, concerns, or upload an image for review."
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
                  Analyzing…
                </>
              ) : (
                <>
                  Send consultation
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          {image && <p className="text-xs text-slate-500">Image attached. Sending with your next message.</p>}
        </div>
      </div>
    </div>
  );
}
