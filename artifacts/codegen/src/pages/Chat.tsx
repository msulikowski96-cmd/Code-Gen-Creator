import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import {
  Send,
  Bot,
  User,
  Loader2,
  FileCode2,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Terminal,
  Folder,
  FolderOpen,
  Download,
  FileText,
  Braces,
} from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
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

const LANG_COLORS: Record<string, string> = {
  java: "#B07219",
  kotlin: "#A97BFF",
  cpp: "#6e6e6e",
  objc: "#438EFF",
  swift: "#FA7343",
  typescript: "#3178C6",
};

const PLATFORM_LABELS: Record<string, string> = {
  android: "android",
  ios: "ios",
  shared: "shared",
};

const PLATFORM_COLORS: Record<string, string> = {
  android: "#a8ff78",
  ios: "#78b4ff",
  shared: "#c678ff",
};

function getFileIcon(language: string) {
  if (language === "typescript") return <Braces className="w-3.5 h-3.5" style={{ color: LANG_COLORS.typescript }} />;
  if (language === "java" || language === "kotlin") return <FileCode2 className="w-3.5 h-3.5" style={{ color: LANG_COLORS[language] }} />;
  if (language === "cpp") return <FileText className="w-3.5 h-3.5" style={{ color: LANG_COLORS.cpp }} />;
  return <FileCode2 className="w-3.5 h-3.5" style={{ color: LANG_COLORS[language] ?? "#888" }} />;
}

interface FileTreeFolder {
  platform: string;
  files: GeneratedFile[];
  open: boolean;
}

function buildFolderTree(files: GeneratedFile[]): FileTreeFolder[] {
  const order = ["android", "ios", "shared"];
  const map: Record<string, GeneratedFile[]> = {};
  for (const f of files) {
    const key = f.platform ?? "shared";
    if (!map[key]) map[key] = [];
    map[key].push(f);
  }
  return order
    .filter((p) => map[p]?.length)
    .map((p) => ({ platform: p, files: map[p], open: true }));
}

function downloadAllFiles(files: GeneratedFile[], moduleName: string) {
  const lines: string[] = [`# ${moduleName} — Generated Files\n`];
  for (const f of files) {
    lines.push(`## ${f.platform}/${f.filename}\n\`\`\`${f.language}\n${f.content}\n\`\`\`\n`);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${moduleName}-codegen.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

const PROMPTS = [
  "Create a NativeModule for Bluetooth scanning and connecting to devices",
  "Build a camera access module with photo capture and video recording",
  "Generate a secure local storage module with encryption support",
  "Make a NativeComponent for custom video player with playback controls",
  "Create a biometric authentication module (Face ID + fingerprint)",
  "Build a GPS location tracker with background updates",
];

function getMonacoLanguage(lang: string) {
  const map: Record<string, string> = {
    java: "java",
    kotlin: "kotlin",
    cpp: "cpp",
    objc: "objective-c",
    swift: "swift",
    typescript: "typescript",
  };
  return map[lang] || "plaintext";
}

function FilesViewer({ files, moduleName, specType, platform }: {
  files: GeneratedFile[];
  moduleName: string;
  specType: string;
  platform: string;
}) {
  const [folders, setFolders] = useState<FileTreeFolder[]>(() => buildFolderTree(files));
  const [activeFile, setActiveFile] = useState<GeneratedFile | null>(files[0] ?? null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleFolder = (platformKey: string) => {
    setFolders((prev) =>
      prev.map((f) => f.platform === platformKey ? { ...f, open: !f.open } : f)
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-border overflow-hidden bg-[#0d1117] shadow-xl shadow-black/40">
      {/* Top header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">{moduleName}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{specType}</span>
          <span
            className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0"
            style={{ background: "#1f6feb", color: "#fff" }}
          >
            {files.length} files
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => downloadAllFiles(files, moduleName)}
            title="Download all"
          >
            <Download className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      {/* Main split pane */}
      <div className="flex" style={{ height: "420px" }}>
        {/* Left: file tree */}
        <div className="w-52 flex-shrink-0 border-r border-[#30363d] bg-[#0d1117] overflow-y-auto">
          {/* Tree header */}
          <div className="px-3 py-1.5 border-b border-[#30363d]">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Explorer
            </span>
          </div>

          {/* Root label */}
          <div className="px-2 pt-2 pb-1">
            <div className="flex items-center gap-1.5 px-1 py-0.5">
              <FolderOpen className="w-3.5 h-3.5 text-yellow-400/80" />
              <span className="text-xs font-medium text-foreground/70">{moduleName}</span>
            </div>
          </div>

          {/* Platform folders */}
          {folders.map((folder) => (
            <div key={folder.platform} className="ml-2">
              {/* Folder row */}
              <button
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#1f2937] transition-colors group"
                onClick={() => toggleFolder(folder.platform)}
              >
                <ChevronRight
                  className={cn(
                    "w-3 h-3 text-muted-foreground transition-transform flex-shrink-0",
                    folder.open && "rotate-90"
                  )}
                />
                {folder.open
                  ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: PLATFORM_COLORS[folder.platform] ?? "#888" }} />
                  : <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: PLATFORM_COLORS[folder.platform] ?? "#888" }} />
                }
                <span className="text-xs text-foreground/80 truncate">
                  {PLATFORM_LABELS[folder.platform] ?? folder.platform}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground/50 flex-shrink-0">
                  {folder.files.length}
                </span>
              </button>

              {/* Files inside folder */}
              {folder.open && (
                <div className="ml-4">
                  {folder.files.map((file) => {
                    const isActive = activeFile?.filename === file.filename && activeFile?.platform === file.platform;
                    return (
                      <button
                        key={`${file.platform}-${file.filename}`}
                        onClick={() => setActiveFile(file)}
                        className={cn(
                          "w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors",
                          isActive
                            ? "bg-[#1f6feb33] border-l-2 border-[#1f6feb]"
                            : "hover:bg-[#1f2937] border-l-2 border-transparent"
                        )}
                      >
                        {getFileIcon(file.language)}
                        <span className={cn(
                          "text-xs truncate",
                          isActive ? "text-foreground" : "text-foreground/60"
                        )}>
                          {file.filename}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right: editor pane */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
          {/* File tab bar */}
          {activeFile && (
            <div className="flex items-center gap-0 border-b border-[#30363d] bg-[#0d1117] px-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-r border-[#30363d] border-b-2 border-b-[#1f6feb] bg-[#0d1117]">
                {getFileIcon(activeFile.language)}
                <span className="text-xs text-foreground">{activeFile.filename}</span>
                <span className="text-[10px] text-muted-foreground/50 ml-1">
                  {activeFile.platform}
                </span>
              </div>
              <div className="flex-1" />
              <div className="px-3 flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: LANG_COLORS[activeFile.language] ?? "#888" }}
                />
                <span className="text-[10px] text-muted-foreground">{activeFile.language}</span>
              </div>
            </div>
          )}

          {/* Monaco editor */}
          {activeFile ? (
            <div className="flex-1">
              <Editor
                height="100%"
                language={getMonacoLanguage(activeFile.language)}
                value={activeFile.content}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  padding: { top: 12 },
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  renderLineHighlight: "all",
                  wordWrap: "off",
                }}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
              Select a file to preview
            </div>
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#161b22] border-t border-[#30363d]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground/60">
            {activeFile ? `${activeFile.platform}/${activeFile.filename}` : "No file selected"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
          <span className="capitalize">{platform}</span>
          <span>·</span>
          <span>{files.length} files generated</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
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

      {/* Content */}
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
              <span>Generating...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          )}
        </div>

        {/* Generated Files */}
        {message.generatedFiles && message.generatedFiles.length > 0 && (
          <div className="w-full mt-1">
            <FilesViewer
              files={message.generatedFiles}
              moduleName={message.moduleName ?? "Module"}
              specType={message.specType ?? "NativeModule"}
              platform={message.platform ?? "both"}
            />
          </div>
        )}

        {/* Streaming cursor */}
        {message.isStreaming && message.content && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Generating...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ onPromptClick }: { onPromptClick: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-16 gap-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-xl shadow-primary/30">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">AI Codegen Chat</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Describe what native module or component you need, and I'll generate the TypeScript spec and native code for you.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="text-left px-4 py-3 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/60 hover:border-border transition-all text-xs text-muted-foreground hover:text-foreground group"
          >
            <div className="flex items-start gap-2">
              <Terminal className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary/60 group-hover:text-primary transition-colors" />
              <span>{prompt}</span>
            </div>
          </button>
        ))}
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    // Build conversation history for API
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

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

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
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: fullContent }
                    : m
                )
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
                    ? { ...m, content: `Error: ${event.message}`, isStreaming: false }
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
              ? { ...m, content: "Connection error. Please try again.", isStreaming: false }
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

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  return (
    <div className="flex flex-col flex-1 w-full bg-background text-foreground overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow shadow-green-500/50" />
          <span className="text-xs text-muted-foreground font-medium">Gemini 3 Flash · React Native Expert</span>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 text-muted-foreground"
            onClick={handleReset}
          >
            <RotateCcw className="w-3 h-3" />
            New chat
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onPromptClick={(p) => { setInput(p); textareaRef.current?.focus(); }} />
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background/80 backdrop-blur-xl px-4 py-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto flex gap-3 items-end"
        >
          <div className="flex-1 relative rounded-2xl border border-border bg-secondary/30 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the native module or component you want to build..."
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none pr-12"
              style={{ minHeight: "48px", maxHeight: "160px" }}
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 p-0 rounded-xl flex-shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <p className="text-center text-[10px] text-muted-foreground/50 mt-2 max-w-4xl mx-auto">
          AI generates TypeScript specs and native code · Results saved to history
        </p>
      </div>
    </div>
  );
}
