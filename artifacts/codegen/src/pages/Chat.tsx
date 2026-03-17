import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import {
  Send,
  Bot,
  User,
  Loader2,
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
  Layers,
  RotateCcw,
  Home,
  Play,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import type { GeneratedFile } from "@workspace/api-client-react";
import { LANG_COLORS, PLATFORM_COLORS } from "@/components/FilesViewer";
import { AI_TEMPLATES } from "@/pages/Home";

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

type SidebarTab = "files" | "templates";

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

function FileIcon({ lang, size = "w-3.5 h-3.5" }: { lang: string; size?: string }) {
  const color = LANG_COLORS[lang] ?? "#888";
  if (["typescript", "tsx", "jsx", "javascript"].includes(lang)) return <Braces className={cn(size, "flex-shrink-0")} style={{ color }} />;
  if (["json", "xml", "markdown", "text"].includes(lang)) return <FileText className={cn(size, "flex-shrink-0")} style={{ color }} />;
  if (lang === "css") return <File className={cn(size, "flex-shrink-0")} style={{ color }} />;
  return <FileCode2 className={cn(size, "flex-shrink-0")} style={{ color }} />;
}

// ── File Tree ────────────────────────────────────────────────────────────────

function FileTreeNode({ node, active, onFile, onFolder, depth }: {
  node: TreeNode; active: GeneratedFile | null;
  onFile: (f: GeneratedFile) => void; onFolder: (path: string) => void; depth: number;
}) {
  const pl = depth * 14 + 8;
  if (node.kind === "file") {
    const { file, name } = node.data;
    const isActive = active?.filename === file.filename && active?.platform === file.platform;
    return (
      <button onClick={() => onFile(file)} style={{ paddingLeft: pl }}
        className={cn("w-full flex items-center gap-2 py-[5px] pr-2 rounded text-left transition-all",
          isActive ? "bg-[#1f6feb]/20 text-[#e6edf3] border-l-2 border-[#1f6feb] -ml-px" : "text-[#8b949e] hover:bg-[#1f2937] hover:text-[#e6edf3]")}>
        <FileIcon lang={file.language} size="w-3.5 h-3.5" />
        <span className="text-xs truncate font-mono">{name}</span>
      </button>
    );
  }
  const { data: f } = node;
  return (
    <div>
      <button onClick={() => onFolder(f.path)} style={{ paddingLeft: pl - 4 }}
        className="w-full flex items-center gap-1.5 py-[5px] pr-2 rounded text-[#8b949e] hover:bg-[#1f2937] hover:text-[#e6edf3] transition-all">
        <ChevronRight className={cn("w-3 h-3 transition-transform flex-shrink-0", f.open && "rotate-90")} />
        {f.open ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.platformColor ?? "#e8c07d" }} />
          : <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.platformColor ?? "#e8c07d" }} />}
        <span className="text-xs truncate">{f.name}</span>
      </button>
      {f.open && f.children.map((child, i) => (
        <FileTreeNode key={i} node={child} active={active} onFile={onFile} onFolder={onFolder} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── Console Panel ────────────────────────────────────────────────────────────

function ConsolePanel({ logs, isLoading }: { logs: string[]; isLoading: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  return (
    <div className="flex flex-col h-full font-mono bg-[#0d1117]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#30363d] shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <span className="text-[10px] text-[#484f58] ml-1">console</span>
        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto" />}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 text-xs space-y-0.5">
        {logs.length === 0
          ? <span className="text-[#484f58]">$ Gotowy. Opis aplikację w AI Chacie po prawej stronie.</span>
          : logs.map((line, i) => (
            <div key={i} className={cn("leading-relaxed",
              line.startsWith("[ERROR]") ? "text-red-400" :
                line.startsWith("[OK]") ? "text-green-400" :
                  line.startsWith("[AI]") ? "text-primary" : "text-[#8b949e]")}>
              {line}
            </div>
          ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Welcome screen ───────────────────────────────────────────────────────────

function EditorWelcome({ onPrompt, isLoading }: { onPrompt: (text: string) => void; isLoading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center select-none font-sans">
      <div className="mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-600/30 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <Code2 className="w-7 h-7 text-primary/70" />
        </div>
        <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">Gotowy do generowania</h3>
        <p className="text-sm text-[#8b949e] max-w-xs leading-relaxed">
          Wpisz opis projektu w polu po prawej lub kliknij szablon poniżej.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {AI_TEMPLATES.slice(0, 6).map((t) => (
          <button key={t.id} disabled={isLoading} onClick={() => onPrompt(t.prompt)}
            className={cn("text-left p-3 rounded-xl border transition-all group bg-gradient-to-br", t.color, t.border, "hover:opacity-90 disabled:opacity-40")}>
            <div className={cn("flex items-center gap-2 mb-1", t.iconColor)}>
              {t.icon} <span className="text-xs font-semibold">{t.label}</span>
            </div>
            <p className="text-[11px] text-[#8b949e] line-clamp-1 leading-relaxed">{t.sublabel}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Chat bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
      className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser ? "bg-primary/20 border border-primary/30" : "bg-gradient-to-br from-primary to-purple-600")}>
        {isUser ? <User className="w-3 h-3 text-primary" /> : <Bot className="w-3 h-3 text-white" />}
      </div>
      <div className={cn("max-w-[88%]", isUser && "flex flex-col items-end")}>
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

// ── Template sidebar ─────────────────────────────────────────────────────────

function TemplateSidebar({ onSelect }: { onSelect: (prompt: string) => void }) {
  const categories = [
    { label: "Mobilne", icon: <Smartphone className="w-3.5 h-3.5" />, templates: AI_TEMPLATES.filter((t) => t.platform.includes("android") || t.platform.includes("ios")) },
    { label: "Web", icon: <Globe className="w-3.5 h-3.5" />, templates: AI_TEMPLATES.filter((t) => t.platform === "web") },
    { label: "Natywne moduły", icon: <Cpu className="w-3.5 h-3.5" />, templates: AI_TEMPLATES.filter((t) => t.id.includes("native") || t.id.includes("bluetooth") || t.id.includes("camera")) },
  ];
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-3 py-2 border-b border-[#30363d]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#484f58]">Szablony</span>
      </div>
      {categories.map((cat) => (
        <div key={cat.label}>
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-[#8b949e]">{cat.icon}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#484f58]">{cat.label}</span>
          </div>
          {cat.templates.map((t) => (
            <button key={t.id} onClick={() => onSelect(t.prompt)}
              className="w-full flex items-start gap-2 px-3 py-2 hover:bg-[#1f2937] transition-colors text-left group">
              <span className={cn("flex-shrink-0 mt-0.5", t.iconColor)}>{t.icon}</span>
              <div className="min-w-0">
                <p className="text-xs text-[#c9d1d9] group-hover:text-[#e6edf3] truncate font-medium">{t.label}</p>
                <p className="text-[10px] text-[#484f58] truncate">{t.sublabel}</p>
              </div>
              <ArrowRight className="w-3 h-3 text-[#30363d] group-hover:text-[#8b949e] transition-colors flex-shrink-0 mt-0.5 ml-auto" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Activity bar ─────────────────────────────────────────────────────────────

function ActivityBar({ active, onSet }: { active: SidebarTab | null; onSet: (t: SidebarTab | null) => void }) {
  const items: { id: SidebarTab; icon: React.ReactNode; title: string }[] = [
    { id: "files", icon: <FileCode2 className="w-5 h-5" />, title: "Explorer" },
    { id: "templates", icon: <Layers className="w-5 h-5" />, title: "Szablony" },
  ];
  return (
    <div className="flex flex-col items-center gap-1 py-2 w-12 flex-shrink-0 bg-[#161b22] border-r border-[#30363d]">
      <Link href="/" title="Strona główna">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-all cursor-pointer">
          <Home className="w-5 h-5" />
        </div>
      </Link>
      {items.map((item) => (
        <button key={item.id} title={item.title} onClick={() => onSet(active === item.id ? null : item.id)}
          className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            active === item.id ? "bg-[#1f6feb]/20 text-primary border border-[#1f6feb]/30" : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]")}>
          {item.icon}
        </button>
      ))}
    </div>
  );
}

// ── Main Workspace page ──────────────────────────────────────────────────────

export default function Workspace() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialPrompt = params.get("prompt") ?? "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [allFiles, setAllFiles] = useState<GeneratedFile[]>([]);
  const [fileTree, setFileTree] = useState<TreeFolder | null>(null);
  const [activeFile, setActiveFile] = useState<GeneratedFile | null>(null);
  const [openTabs, setOpenTabs] = useState<GeneratedFile[]>([]);
  const [appName, setAppName] = useState<string>("mój-projekt");
  const [editingName, setEditingName] = useState(false);

  const [sidebarTab, setSidebarTab] = useState<SidebarTab | null>("files");
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);

  const [copied, setCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (editingName) nameInputRef.current?.focus(); }, [editingName]);

  const addLog = useCallback((line: string) => {
    setConsoleLogs((prev) => [...prev, line]);
  }, []);

  const openFile = useCallback((file: GeneratedFile) => {
    setActiveFile(file);
    setOpenTabs((prev) => prev.find((f) => f.filename === file.filename && f.platform === file.platform) ? prev : [...prev, file]);
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
    const a = document.createElement("a"); a.href = url; a.download = `${appName}.txt`; a.click();
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
    setConsoleOpen(true);
    addLog(`[AI] Przetwarzam: "${userText.slice(0, 60)}${userText.length > 60 ? "..." : ""}"`);

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
              const files = genData.files as GeneratedFile[];
              setAllFiles(files);
              setFileTree(buildFileTree(files));
              setAppName(genData.moduleName);
              setSidebarTab("files");
              if (files.length > 0) openFile(files[0]);
              setIsGenerating(false);
              addLog(`[OK] Wygenerowano ${files.length} plików dla "${genData.moduleName}"`);
              files.forEach((f) => addLog(`  ✓ ${f.filename}`));
            } else if (event.type === "done") {
              setMessages((prev) => prev.map((m) =>
                m.id === aiMsg.id
                  ? { ...m, content: fullContent, isStreaming: false, ...(genData ? { generatedFiles: genData.files, moduleName: genData.moduleName, specType: genData.specType, platform: genData.platform } : {}) }
                  : m
              ));
              addLog("[OK] Gotowe.");
            } else if (event.type === "error") {
              setMessages((prev) => prev.map((m) => m.id === aiMsg.id ? { ...m, content: `Błąd: ${event.message}`, isStreaming: false } : m));
              addLog(`[ERROR] ${event.message}`);
              setIsGenerating(false);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => prev.map((m) => m.id === aiMsg.id ? { ...m, content: "Błąd połączenia. Spróbuj ponownie.", isStreaming: false } : m));
        addLog("[ERROR] Błąd połączenia z serwerem.");
      }
      setIsGenerating(false);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, openFile, addLog]);

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([]); setAllFiles([]); setFileTree(null);
    setActiveFile(null); setOpenTabs([]); setAppName("mój-projekt");
    setIsLoading(false); setIsGenerating(false); setConsoleLogs([]);
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const hasFiles = allFiles.length > 0;
  const basename = activeFile?.filename.split("/").pop() ?? "";
  const sidebarWidth = sidebarTab ? 220 : 0;

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-[#e6edf3] overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="flex items-center h-10 bg-[#161b22] border-b border-[#30363d] shrink-0 px-2 gap-2">
        {/* Project name */}
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              className="bg-[#21262d] border border-[#30363d] rounded px-2 py-0.5 text-xs text-[#e6edf3] focus:outline-none focus:border-primary/50 font-mono w-36"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }}
            />
          ) : (
            <button onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#21262d] transition-colors group">
              <span className="text-xs font-semibold text-[#e6edf3] font-mono">{appName}</span>
              <Pencil className="w-3 h-3 text-[#484f58] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-[#30363d] mx-1" />

        {/* Tabs */}
        <div className="flex items-center flex-1 overflow-x-auto scrollbar-hide">
          {openTabs.map((tab) => {
            const name = tab.filename.split("/").pop() ?? tab.filename;
            const isActive = activeFile?.filename === tab.filename && activeFile?.platform === tab.platform;
            return (
              <button key={`${tab.platform}-${tab.filename}`} onClick={() => setActiveFile(tab)}
                className={cn("flex items-center gap-1.5 px-3 h-10 text-xs border-r border-[#30363d] transition-colors whitespace-nowrap flex-shrink-0 group",
                  isActive ? "bg-[#0d1117] text-[#e6edf3] border-t-2 border-t-primary -mt-px" : "text-[#8b949e] hover:bg-[#0d1117]/50 hover:text-[#c9d1d9]")}>
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: LANG_COLORS[tab.language] ?? "#888" }} />
                <span className="font-mono">{name}</span>
                <span onClick={(e) => closeTab(tab, e)}
                  className="ml-1 w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#30363d] transition-all flex-shrink-0">
                  <X className="w-2.5 h-2.5" />
                </span>
              </button>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {hasFiles && (
            <>
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Skopiowano" : "Kopiuj"}
              </button>
              <button onClick={downloadAll} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors">
                <Download className="w-3.5 h-3.5" /> Pobierz
              </button>
            </>
          )}
          {messages.length > 0 && (
            <button onClick={handleReset} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-[#8b949e] hover:text-red-400 hover:bg-red-400/10 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Main body ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Activity bar */}
        <ActivityBar active={sidebarTab} onSet={setSidebarTab} />

        {/* Sidebar panel */}
        <AnimatePresence initial={false}>
          {sidebarTab && (
            <motion.aside
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: sidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="flex-shrink-0 bg-[#161b22] border-r border-[#30363d] overflow-hidden flex flex-col"
            >
              {sidebarTab === "files" && (
                <div className="flex flex-col h-full" style={{ width: sidebarWidth }}>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d] shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#484f58]">Explorer</span>
                    {hasFiles && (
                      <button onClick={downloadAll} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors p-1 rounded hover:bg-[#21262d]">
                        <Download className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto py-2 px-1">
                    {!hasFiles ? (
                      <div className="flex flex-col items-center justify-center h-full pb-8 text-center px-4">
                        <Terminal className="w-8 h-8 text-[#21262d] mb-3" />
                        <p className="text-[11px] text-[#484f58] leading-relaxed">Pliki pojawią się tu po wygenerowaniu</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                          <FolderOpen className="w-3.5 h-3.5 text-[#e8c07d]" />
                          <span className="text-xs text-[#c9d1d9] font-semibold truncate">{appName}</span>
                          <span className="ml-auto text-[10px] text-[#484f58]">{allFiles.length}</span>
                        </div>
                        {fileTree?.children.map((node, i) => (
                          <FileTreeNode key={i} node={node} active={activeFile}
                            onFile={openFile}
                            onFolder={(path) => setFileTree((prev) => prev ? toggleFolder(prev, path) : prev)}
                            depth={0} />
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
              {sidebarTab === "templates" && (
                <div style={{ width: sidebarWidth }} className="h-full">
                  <TemplateSidebar onSelect={(prompt) => { setInput(prompt); setSidebarTab("files"); textareaRef.current?.focus(); }} />
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Editor + Console ─────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Breadcrumb bar */}
          {activeFile && (
            <div className="flex items-center gap-1 px-3 py-1 bg-[#0d1117] border-b border-[#30363d]/50 shrink-0">
              <span className="text-[11px] text-[#484f58] font-mono">{appName}</span>
              {activeFile.filename.split("/").map((part, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-[#21262d]" />
                  <span className={cn("text-[11px] font-mono", i === arr.length - 1 ? "text-[#e6edf3]" : "text-[#484f58]")}>{part}</span>
                </span>
              ))}
              <span className="ml-auto text-[10px] text-[#484f58] font-mono">{activeFile.language}</span>
            </div>
          )}

          {/* Monaco / Welcome */}
          <div className="flex-1 relative min-h-0">
            {isGenerating && (
              <div className="absolute inset-x-0 top-0 z-10 h-[2px] bg-[#21262d] overflow-hidden">
                <motion.div className="h-full bg-primary"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }} />
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
                  readOnly: true, minimap: { enabled: true }, fontSize: 13, lineHeight: 22,
                  lineNumbers: "on", scrollBeyondLastLine: false, padding: { top: 16 },
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  renderLineHighlight: "line", wordWrap: "off", folding: true,
                  glyphMargin: false, contextmenu: false, smoothScrolling: true,
                }}
              />
            ) : (
              <EditorWelcome onPrompt={(text) => { setInput(text); textareaRef.current?.focus(); }} isLoading={isLoading} />
            )}
          </div>

          {/* Console panel */}
          <div className={cn("border-t border-[#30363d] flex-shrink-0 transition-all", consoleOpen ? "h-36" : "h-0 overflow-hidden")}>
            <ConsolePanel logs={consoleLogs} isLoading={isGenerating} />
          </div>

          {/* Bottom status bar */}
          <div className="flex items-center h-6 bg-primary border-t border-primary/30 px-3 shrink-0">
            <div className="flex items-center gap-3 text-[10px] text-primary-foreground/80 flex-1">
              <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> Gemini AI</span>
              {hasFiles && <><span className="opacity-40">·</span><span>{appName}</span><span className="opacity-40">·</span><span>{allFiles.length} plików</span></>}
            </div>
            <button onClick={() => setConsoleOpen((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-primary-foreground/70 hover:text-primary-foreground transition-colors ml-auto">
              <Terminal className="w-2.5 h-2.5" />
              Console
              {consoleOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
            </button>
            {activeFile && (
              <><span className="opacity-40 mx-2">·</span>
                <span className="text-[10px] text-primary-foreground/60 font-mono">{activeFile.language}</span>
              </>
            )}
          </div>
        </div>

        {/* ── AI Chat panel ────────────────────────────── */}
        <div className="w-80 flex-shrink-0 border-l border-[#30363d] bg-[#161b22] flex flex-col font-sans">

          {/* Chat header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#30363d] shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 shadow shadow-green-400/50 animate-pulse" />
              <span className="text-xs font-semibold text-[#e6edf3]">AI Chat</span>
              <span className="text-[10px] text-[#484f58]">· Gemini</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center pb-4">
                <Zap className="w-8 h-8 text-[#21262d] mb-3" />
                <p className="text-xs text-[#484f58] leading-relaxed">
                  Opisz aplikację lub kliknij szablon w lewym panelu.
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
                  className="w-full resize-none bg-transparent px-3 py-2.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none"
                  style={{ minHeight: "40px", maxHeight: "120px" }}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-[10px] text-[#484f58]">
                  {isLoading ? <span className="text-primary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Generuję...</span> : "Enter — wyślij"}
                </div>
                <Button type="submit" disabled={!input.trim() || isLoading} className="h-7 px-3 text-xs gap-1.5 rounded-lg">
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Wyślij
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
