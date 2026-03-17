import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  RotateCcw,
  Smartphone,
  Globe,
  Cpu,
  Zap,
} from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { FilesViewer } from "@/components/FilesViewer";
import type { GeneratedFile } from "@workspace/api-client-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  generatedFiles?: GeneratedFile[];
  moduleName?: string;
  specType?: string;
  platform?: string;
  isStreaming?: boolean;
}

interface GeneratedEvent {
  type: "generated";
  id: number;
  moduleName: string;
  specType: string;
  platform: string;
  files: GeneratedFile[];
}

const PROMPTS: Array<{ icon: React.ReactNode; label: string; text: string; color: string }> = [
  {
    icon: <Smartphone className="w-4 h-4" />,
    label: "Aplikacja mobilna",
    color: "text-green-400",
    text: "Stwórz aplikację mobilną na iOS i Android do zarządzania listą zadań (todo list). Powinna mieć ekran z listą zadań, możliwość dodawania i usuwania, oraz oznaczania jako ukończone.",
  },
  {
    icon: <Globe className="w-4 h-4" />,
    label: "Aplikacja webowa",
    color: "text-blue-400",
    text: "Zbuduj webową aplikację kalkulatora budżetu domowego w React. Powinna mieć możliwość dodawania przychodów i wydatków, kategorii i wykresu podsumowującego.",
  },
  {
    icon: <Smartphone className="w-4 h-4" />,
    label: "Aplikacja pogodowa",
    color: "text-yellow-400",
    text: "Stwórz aplikację pogodową na React Native (iOS + Android). Ekran główny z aktualną pogodą, prognozą na 7 dni i pięknym interfejsem.",
  },
  {
    icon: <Globe className="w-4 h-4" />,
    label: "Landing page",
    color: "text-purple-400",
    text: "Zrób nowoczesny landing page dla startupu SaaS oferującego narzędzie do zarządzania projektami. Sekcje: hero, features, pricing, testimonials, footer.",
  },
  {
    icon: <Smartphone className="w-4 h-4" />,
    label: "Aplikacja fitness",
    color: "text-orange-400",
    text: "Zbuduj aplikację fitness na React Native do śledzenia treningów. Ekrany: home dashboard, dodawanie treningu, historia, profil użytkownika.",
  },
  {
    icon: <Cpu className="w-4 h-4" />,
    label: "Natywny moduł",
    color: "text-primary",
    text: "Stwórz natywny moduł React Native (TurboModule) do obsługi Bluetooth — skanowanie urządzeń, łączenie i wysyłanie danych.",
  },
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
          isUser
            ? "bg-primary/20 border border-primary/30"
            : "bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/20"
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-white" />
        )}
      </div>

      <div className={cn("flex-1 min-w-0 max-w-[85%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-secondary/60 border border-border/50 text-foreground rounded-tl-sm"
          )}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Generuję kod...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          )}
        </div>

        {message.generatedFiles && message.generatedFiles.length > 0 && (
          <div className="w-full mt-2">
            <FilesViewer
              files={message.generatedFiles}
              moduleName={message.moduleName ?? "App"}
              specType={message.specType ?? "App"}
              platform={message.platform ?? "shared"}
            />
          </div>
        )}

        {message.isStreaming && message.content && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Piszę kod...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ onPromptClick }: { onPromptClick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-xl shadow-primary/30">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">AI App Generator</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
            Opisz aplikację, którą chcesz zbudować — AI wygeneruje kompletny kod.
            <br />
            Działa dla aplikacji mobilnych (iOS/Android), webowych i natywnych modułów.
          </p>
        </div>

        {/* Capability badges */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {[
            { icon: <Smartphone className="w-3.5 h-3.5" />, label: "React Native iOS/Android", color: "bg-green-400/10 text-green-400 border-green-400/20" },
            { icon: <Globe className="w-3.5 h-3.5" />, label: "Web App (React)", color: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
            { icon: <Cpu className="w-3.5 h-3.5" />, label: "Natywne moduły", color: "bg-primary/10 text-primary border-primary/20" },
          ].map((cap) => (
            <span
              key={cap.label}
              className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", cap.color)}
            >
              {cap.icon}
              {cap.label}
            </span>
          ))}
        </div>
      </div>

      {/* Example prompts */}
      <div className="w-full max-w-2xl">
        <p className="text-xs text-muted-foreground text-center mb-3">Przykładowe pomysły — kliknij żeby spróbować:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt.text}
              onClick={() => onPromptClick(prompt.text)}
              className="text-left px-4 py-3 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/50 hover:border-border transition-all group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("flex-shrink-0", prompt.color)}>{prompt.icon}</span>
                <span className="text-xs font-semibold text-foreground/80 group-hover:text-foreground">{prompt.label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{prompt.text}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || isLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: userText };
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "", isStreaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: userText });

    abortRef.current = new AbortController();

    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${base}/api/codegen/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let generatedData: GeneratedEvent | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === "token") {
              fullContent += event.content;
              setMessages((prev) =>
                prev.map((m) => m.id === assistantMsg.id ? { ...m, content: fullContent } : m)
              );
            } else if (event.type === "generated") {
              generatedData = event as GeneratedEvent;
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? {
                        ...m,
                        content: fullContent,
                        isStreaming: false,
                        ...(generatedData
                          ? {
                              generatedFiles: generatedData.files,
                              moduleName: generatedData.moduleName,
                              specType: generatedData.specType,
                              platform: generatedData.platform,
                            }
                          : {}),
                      }
                    : m
                )
              );
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: `Błąd: ${event.message}`, isStreaming: false }
                    : m
                )
              );
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: "Błąd połączenia. Spróbuj ponownie.", isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  return (
    <div className="flex flex-col flex-1 w-full bg-background text-foreground overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow shadow-green-500/50" />
          <span className="text-xs text-muted-foreground font-medium">Gemini AI · Generator aplikacji</span>
          <span className="text-[10px] text-muted-foreground/40">· iOS · Android · Web</span>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 text-muted-foreground" onClick={handleReset}>
            <RotateCcw className="w-3 h-3" />
            Nowy czat
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onPromptClick={(text) => { setInput(text); textareaRef.current?.focus(); }} />
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/80 backdrop-blur-xl px-4 py-4 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-3 items-end">
          <div className="flex-1 relative rounded-2xl border border-border bg-secondary/30 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Opisz aplikację, którą chcesz zbudować... (np. 'aplikacja todo na iOS i Android')"
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              style={{ minHeight: "48px", maxHeight: "160px" }}
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 p-0 rounded-xl flex-shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        <div className="flex items-center justify-center gap-3 mt-2">
          {[
            { icon: <Smartphone className="w-3 h-3" />, label: "Aplikacje mobilne" },
            { icon: <Globe className="w-3 h-3" />, label: "Aplikacje webowe" },
            { icon: <Zap className="w-3 h-3" />, label: "Natywne moduły" },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
              {item.icon}
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
