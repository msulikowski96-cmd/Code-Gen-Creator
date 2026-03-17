import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
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
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode2,
  Braces,
  FileText,
  File,
  X,
  Download,
  Copy,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  Terminal,
  Code2,
} from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import type { GeneratedFile } from "@workspace/api-client-react";
import {
  LANG_COLORS,
  PLATFORM_COLORS,
} from "@/components/FilesViewer";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Example prompts ──────────────────────────────────────────────────────────

const PROMPTS = [
  { icon: <Smartphone className="w-4 h-4" />, color: "text-green-400", bg: "bg-green-400/10 border-green-400/20", label: "Todo App (iOS/Android)", text: "Stwórz aplikację mobilną na iOS i Android do zarządzania listą zadań. Ekran z listą zadań, dodawanie, usuwanie i oznaczanie jako ukończone." },
  { icon: <Globe className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", label: "Landing Page (Web)", text: "Zbuduj nowoczesny landing page dla startupu SaaS. Sekcje: hero, features, pricing, testimonials, footer. Użyj Tailwind CSS." },
  { icon: <Smartphone className="w-4 h-4" />, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20", label: "Aplikacja pogodowa", text: "Stwórz aplikację pogodową na React Native. Ekran główny z aktualną pogodą i prognozą na 7 dni. Piękny interfejs z gradientami." },
  { icon: <Globe className="w-4 h-4" />, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20", label: "Kalkulator budżetu", text: "Zbuduj webową aplikację kalkulatora budżetu domowego w React + TypeScript. Dodawanie przychodów, wydatków, kategorii i wykresy." },
  { icon: <Smartphone className="w-4 h-4" />, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20", label: "Aplikacja fitness", text: "Zbuduj aplikację fitness na React Native. Dashboard z treningami, ekran dodawania ćwiczeń, historia aktywności, profil użytkownika." },
  { icon: <Cpu className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/10 border-primary/20", label: "Natywny moduł Bluetooth", text: "Stwórz natywny moduł React Native (TurboModule) do obsługi Bluetooth — skanowanie urządzeń, łączenie i wysyłanie danych." },
];

// ── File tree helpers ────────────────────────────────────────────────────────

interface TreeFile { file: GeneratedFile; name: string }
interface TreeFolder { name: string; path: string; children: TreeNode[]; open: boolean; platformColor?: string }
type TreeNode = { kind: "file"; data: TreeFile } | { kind: "folder"; data: TreeFolder };

function buildFileTree(files: GeneratedFile[]): TreeFolder {
  const hasNestedPaths = files.some((f) => f.filename.includes("/"));
  const root: TreeFolder = { name: "root", path: "", children: [], open: true };
  for (const file of files) {
    const parts = hasNestedPaths ? file.filename.split("/") : [file.platform, file.filename];
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let existing = current.children.find(
        (c): c is { kind: "folder"; data: TreeFolder } => c.kind === "folder" && c.data.name === part
      );
      if (!existing) {
        const folder: TreeFolder = { name: part, path: parts.slice(0, i + 1).join("/"), children: [], open: true, platformColor: i === 0 ? PLATFORM_COLORS[part] : undefined };
        const node: TreeNode = { kind: "folder", data: folder };
        current.children.push(node);
        existing = node as { kind: "folder"; data: TreeFolder };
      }
      current = existing.data;
    }
    current.children.push({ kind: "file", data: { file, name: parts[parts.length - 1] } });
  }
  return root;
}

function toggleFolder(root: TreeFolder, path: string): TreeFolder {
  const toggle = (node: TreeNode): TreeNode => {
    if (node.kind === "folder") {
      if (node.data.path === path) return { kind: "folder", data: { ...node.data, open: !node.data.open } };
      return { kind: "folder", data: { ...node.data, children: node.data.children.map(toggle) } };
    }
    return node;
  };
  return { ...root, children: root.children.map(toggle) };
}

function getMonacoLang(lang: string, filename?: string): string {
  if (filename) {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const m: Record<string, string> = { tsx: "typescript", ts: "typescript", jsx: "javascript", js: "javascript", java: "java", kt: "kotlin", swift: "swift", m: "objective-c", mm: "objective-c", h: "cpp", cpp: "cpp", css: "css", json: "json", xml: "xml", html: "html", gradle: "groovy", md: "markdown" };
    if (m[ext]) return m[ext];
  }
  const m: Record<string, string> = { typescript: "typescript", tsx: "typescript", jsx: "javascript", javascript: "javascript", java: "java", kotlin: "kotlin", swift: "swift", objc: "objective-c", cpp: "cpp", css: "css", json: "json", xml: "xml", gradle: "groovy", markdown: "markdown" };
  return m[lang] ?? "plaintext";
}

function FileIcon({ lang, filename, size = "w-3.5 h-3.5" }: { lang: string; filename?: string; size?: string }) {
  const color = LANG_COLORS[lang] ?? "#888";
  if (["typescript", "tsx", "jsx", "javascript"].includes(lang)) return <Braces className={cn(size, "flex-shrink-0")} style={{ color }} />;
  if (["json", "xml", "markdown", "text"].includes(lang)) return <FileText className={cn(size, "flex-shrink-0")} style={{ color }} />;
  if (lang === "css") return <File className={cn(size, "flex-shrink-0")} style={{ color }} />;
  return <FileCode2 className={cn(size, "flex-shrink-0")} style={{ color }} />;
}

// ── File Tree component ──────────────────────────────────────────────────────

function FileTreeNode({ node, active, onFile, onFolder, depth }: {
  node: TreeNode; active: GeneratedFile | null;
  onFile: (f: GeneratedFile) => void; onFolder: (path: string) => void; depth: number;
}) {
  const pl = depth * 14 + 8;
  if (node.kind === "file") {
    const { file, name } = node.data;
    const isActive = active?.filename === file.filename && active?.platform === file.platform;
    return (
      <button
        onClick={() => onFile(file)}
        style={{ paddingLeft: pl }}
        className={cn(
          "w-full flex items-center gap-2 py-1 pr-2 rounded text-left transition-all group",
          isActive ? "bg-primary/15 text-primary" : "text-[#8b949e] hover:bg-[#1f2937] hover:text-[#e6edf3]"
        )}
      >
        <FileIcon lang={file.language} filename={name} size="w-3.5 h-3.5" />
        <span className="text-xs truncate font-mono">{name}</span>
      </button>
    );
  }
  const { data: f } = node;
  return (
    <div>
      <button
        onClick={() => onFolder(f.path)}
        style={{ paddingLeft: pl - 4 }}
        className="w-full flex items-center gap-1.5 py-1 pr-2 rounded text-[#8b949e] hover:bg-[#1f2937] hover:text-[#e6edf3] transition-all"
      >
        <ChevronRight className={cn("w-3 h-3 transition-transform flex-shrink-0", f.open && "rotate-90")} />
        {f.open
          ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.platformColor ?? "#e8c07d" }} />
          : <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.platformColor ?? "#e8c07d" }} />}
        <span className="text-xs truncate">{f.name}</span>
      </button>
      {f.open && f.children.map((child, i) => (
        <FileTreeNode key={i} node={child} active={active} onFile={onFile} onFolder={onFolder} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── Editor welcome screen ────────────────────────────────────────────────────

function EditorWelcome({ onPrompt, isLoading }: { onPrompt: (text: string) => void; isLoading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center select-none font-sans">
      <div className="mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-600/30 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <Code2 className="w-7 h-7 text-primary/70" />
        </div>
        <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">Opisz aplikację, którą chcesz zbudować</h3>
        <p className="text-sm text-[#8b949e] max-w-sm leading-relaxed">
          Wpisz opis w polu czatu po prawej. AI wygeneruje kompletny kod — pliki pojawią się tutaj i w drzewie plików.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {PROMPTS.map((p) => (
          <button
            key={p.label}
            disabled={isLoading}
            onClick={() => onPrompt(p.text)}
            className={cn(
              "text-left p-3 rounded-xl border transition-all group",
              p.bg,
              "hover:opacity-90 disabled:opacity-40"
            )}
          >
            <div className={cn("flex items-center gap-2 mb-1", p.color)}>
              {p.icon}
              <span className="text-xs font-semibold">{p.label}</span>
            </div>
            <p className="text-[11px] text-[#8b949e] line-clamp-2 leading-relaxed group-hover:text-[#c9d1d9]">{p.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Chat message bubble ──────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
      className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser ? "bg-primary/20 border border-primary/30" : "bg-gradient-to-br from-primary to-purple-600")}>
        {isUser ? <User className="w-3 h-3 text-primary" /> : <Bot className="w-3 h-3 text-white" />}
      </div>
      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        <div className={cn("rounded-2xl px-3 py-2 text-xs leading-relaxed",
          isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-[#1c2128] border border-[#30363d] text-[#c9d1d9] rounded-tl-sm")}>
          {msg.isStreaming && !msg.content
            ? <span className="flex items-center gap-2 text-[#8b949e]"><Loader2 className="w-3 h-3 animate-spin" />Generuję kod...</span>
            : <span className="whitespace-pre-wrap break-words">{msg.content}</span>}
        </div>
        {msg.isStreaming && msg.content && (
          <span className="mt-1 flex items-center gap-1 text-[10px] text-[#8b949e]">
            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Piszę...
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Chat page ───────────────────────────────────────────────────────────

export default function Chat() {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // IDE state
  const [allFiles, setAllFiles] = useState<GeneratedFile[]>([]);
  const [fileTree, setFileTree] = useState<TreeFolder | null>(null);
  const [activeFile, setActiveFile] = useState<GeneratedFile | null>(null);
  const [openTabs, setOpenTabs] = useState<GeneratedFile[]>([]);
  const [appName, setAppName] = useState<string>("project");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openFile = useCallback((file: GeneratedFile) => {
    setActiveFile(file);
    setOpenTabs((prev) => {
      if (prev.find((f) => f.filename === file.filename && f.platform === file.platform)) return prev;
      return [...prev, file];
    });
  }, []);

  const closeTab = useCallback((file: GeneratedFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs((prev) => {
      const next = prev.filter((f) => !(f.filename === file.filename && f.platform === file.platform));
      if (activeFile?.filename === file.filename) setActiveFile(next[next.length - 1] ?? null);
      return next;
    });
  }, [activeFile]);

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAll = () => {
    const lines = allFiles.map((f) => `## ${f.filename}\n\`\`\`${f.language}\n${f.content}\n\`\`\``);
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${appName}-generated.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || isLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: userText };
    const aiMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "", isStreaming: true };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    setIsLoading(true);
    setIsGenerating(true);

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
      let genData: GeneratedEvent | null = null;

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
              setMessages((prev) => prev.map((m) => m.id === aiMsg.id ? { ...m, content: fullContent } : m));
            } else if (event.type === "generated") {
              genData = event as GeneratedEvent;
              // Populate IDE immediately
              const files = genData.files as GeneratedFile[];
              setAllFiles(files);
              setFileTree(buildFileTree(files));
              setAppName(genData.moduleName);
              if (files.length > 0) openFile(files[0]);
              setIsGenerating(false);
            } else if (event.type === "done") {
              setMessages((prev) => prev.map((m) =>
                m.id === aiMsg.id
                  ? { ...m, content: fullContent, isStreaming: false, ...(genData ? { generatedFiles: genData.files, moduleName: genData.moduleName, specType: genData.specType, platform: genData.platform } : {}) }
                  : m
              ));
            } else if (event.type === "error") {
              setMessages((prev) => prev.map((m) => m.id === aiMsg.id ? { ...m, content: `Błąd: ${event.message}`, isStreaming: false } : m));
              setIsGenerating(false);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => prev.map((m) => m.id === aiMsg.id ? { ...m, content: "Błąd połączenia. Spróbuj ponownie.", isStreaming: false } : m));
      }
      setIsGenerating(false);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, openFile]);

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setAllFiles([]);
    setFileTree(null);
    setActiveFile(null);
    setOpenTabs([]);
    setAppName("project");
    setIsLoading(false);
    setIsGenerating(false);
  };

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const basename = activeFile?.filename.split("/").pop() ?? "";
  const hasFiles = allFiles.length > 0;

  return (
    <div className="flex flex-1 w-full bg-[#0d1117] text-[#e6edf3] overflow-hidden font-mono">

      {/* ── LEFT: File Explorer ─────────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-shrink-0 bg-[#161b22] border-r border-[#30363d] flex flex-col overflow-hidden"
            style={{ minWidth: 0 }}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#30363d] shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8b949e]">Explorer</span>
              {hasFiles && (
                <button onClick={downloadAll} title="Pobierz wszystkie pliki" className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-1">
              {!hasFiles ? (
                <div className="flex flex-col items-center justify-center h-full pb-8 text-center px-3">
                  <Terminal className="w-8 h-8 text-[#30363d] mb-3" />
                  <p className="text-[11px] text-[#484f58] leading-relaxed">
                    Tu pojawią się pliki po wygenerowaniu kodu
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                    <FolderOpen className="w-3.5 h-3.5 text-[#e8c07d]" />
                    <span className="text-xs text-[#c9d1d9] font-semibold truncate">{appName}</span>
                    <span className="ml-auto text-[10px] text-[#484f58]">{allFiles.length}</span>
                  </div>
                  {fileTree?.children.map((node, i) => (
                    <FileTreeNode
                      key={i} node={node} active={activeFile}
                      onFile={openFile}
                      onFolder={(path) => setFileTree((prev) => prev ? toggleFolder(prev, path) : prev)}
                      depth={0}
                    />
                  ))}
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── CENTER: Editor ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">

        {/* Top bar */}
        <div className="flex items-center gap-0 border-b border-[#30363d] bg-[#161b22] shrink-0 h-9">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="h-9 w-9 flex items-center justify-center text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors flex-shrink-0"
            title={sidebarOpen ? "Ukryj pliki" : "Pokaż pliki"}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          <div className="w-px h-5 bg-[#30363d]" />

          {/* Open file tabs */}
          <div className="flex items-center overflow-x-auto flex-1 scrollbar-hide">
            {openTabs.map((tab) => {
              const name = tab.filename.split("/").pop() ?? tab.filename;
              const isActive = activeFile?.filename === tab.filename && activeFile?.platform === tab.platform;
              return (
                <button
                  key={`${tab.platform}-${tab.filename}`}
                  onClick={() => setActiveFile(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 h-9 text-xs border-r border-[#30363d] transition-colors whitespace-nowrap flex-shrink-0 group",
                    isActive ? "bg-[#0d1117] text-[#e6edf3] border-t-2 border-t-primary" : "text-[#8b949e] hover:bg-[#0d1117]/50 hover:text-[#c9d1d9]"
                  )}
                >
                  <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: LANG_COLORS[tab.language] ?? "#888" }} />
                  <span className="font-mono">{name}</span>
                  <span
                    onClick={(e) => closeTab(tab, e)}
                    className="ml-1 w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#30363d] transition-all flex-shrink-0"
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right actions */}
          {activeFile && (
            <div className="flex items-center flex-shrink-0 border-l border-[#30363d]">
              <button
                onClick={handleCopy}
                className="h-9 px-3 flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Skopiowano" : "Kopiuj"}
              </button>
            </div>
          )}
        </div>

        {/* Breadcrumb */}
        {activeFile && (
          <div className="flex items-center gap-1 px-3 py-1 bg-[#161b22] border-b border-[#30363d]/50 shrink-0">
            <span className="text-[11px] text-[#484f58]">{appName}</span>
            {activeFile.filename.split("/").map((part, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-[#30363d]" />
                <span className={cn("text-[11px] font-mono", i === arr.length - 1 ? "text-[#e6edf3]" : "text-[#484f58]")}>{part}</span>
              </span>
            ))}
            <span className="ml-auto text-[10px] text-[#484f58]">{activeFile.language}</span>
          </div>
        )}

        {/* Monaco / Welcome */}
        <div className="flex-1 relative min-h-0">
          {isGenerating && (
            <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-[#21262d] overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              />
            </div>
          )}

          {activeFile ? (
            <Editor
              key={`${activeFile.platform}-${activeFile.filename}`}
              height="100%"
              language={getMonacoLang(activeFile.language, basename)}
              value={activeFile.content}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: true },
                fontSize: 13,
                lineHeight: 22,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                renderLineHighlight: "line",
                wordWrap: "off",
                folding: true,
                glyphMargin: false,
                contextmenu: false,
                smoothScrolling: true,
              }}
            />
          ) : (
            <EditorWelcome onPrompt={(text) => { setInput(text); textareaRef.current?.focus(); }} isLoading={isLoading} />
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-primary border-t border-primary/50 shrink-0 text-primary-foreground">
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 opacity-80">
              <Sparkles className="w-2.5 h-2.5" /> Gemini AI
            </span>
            {hasFiles && (
              <>
                <span className="opacity-40">·</span>
                <span className="opacity-80">{appName}</span>
                <span className="opacity-40">·</span>
                <span className="opacity-80">{allFiles.length} plików</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] opacity-70">
            {activeFile && <span className="font-mono">{activeFile.language}</span>}
            {activeFile && <span>·</span>}
            {activeFile && <span className="font-mono">{activeFile.filename}</span>}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Chat Panel ───────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-l border-[#30363d] bg-[#161b22] flex flex-col font-sans">

        {/* Chat header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#30363d] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow shadow-green-400/50" />
            <span className="text-xs font-semibold text-[#e6edf3]">AI Chat</span>
            <span className="text-[10px] text-[#484f58]">· Gemini</span>
          </div>
          {messages.length > 0 && (
            <button onClick={handleReset} className="flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-[#e6edf3] transition-colors px-1.5 py-1 rounded hover:bg-[#21262d]">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center pb-4">
              <Zap className="w-8 h-8 text-[#30363d] mb-3" />
              <p className="text-xs text-[#484f58] leading-relaxed">
                Opisz aplikację lub kliknij przykład w edytorze po lewej.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#30363d] p-3 shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex flex-col gap-2">
            <div className="relative rounded-xl border border-[#30363d] bg-[#0d1117] focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Opisz aplikację..."
                rows={1}
                disabled={isLoading}
                className="w-full resize-none bg-transparent px-3 py-2.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none font-sans"
                style={{ minHeight: "40px", maxHeight: "120px" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1 text-[10px] text-[#484f58]">
                {isLoading
                  ? <><Loader2 className="w-3 h-3 animate-spin text-primary" /><span className="text-primary">Generuję...</span></>
                  : <span>Enter — wyślij</span>}
              </div>
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-7 px-3 text-xs gap-1.5 rounded-lg"
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Wyślij
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
