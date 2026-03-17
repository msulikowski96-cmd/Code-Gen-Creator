import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Editor from "@monaco-editor/react";
import {
  FileCode2,
  ChevronRight,
  Folder,
  FolderOpen,
  Download,
  FileText,
  Braces,
  Copy,
  Check,
  File,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import type { GeneratedFile } from "@workspace/api-client-react";

// Language → color
export const LANG_COLORS: Record<string, string> = {
  java: "#B07219",
  kotlin: "#A97BFF",
  cpp: "#6e6e6e",
  objc: "#438EFF",
  swift: "#FA7343",
  typescript: "#3178C6",
  tsx: "#3178C6",
  jsx: "#F7DF1E",
  javascript: "#F7DF1E",
  css: "#663399",
  json: "#cbcb41",
  xml: "#e37933",
  gradle: "#02303A",
  markdown: "#083fa1",
  text: "#888888",
};

export const PLATFORM_COLORS: Record<string, string> = {
  android: "#a8ff78",
  ios: "#78b4ff",
  shared: "#c678ff",
};

function getMonacoLanguage(lang: string, filename?: string): string {
  if (filename) {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const extMap: Record<string, string> = {
      tsx: "typescript", ts: "typescript", jsx: "javascript", js: "javascript",
      java: "java", kt: "kotlin", swift: "swift",
      m: "objective-c", mm: "objective-c", h: "cpp",
      cpp: "cpp", cc: "cpp", c: "cpp",
      css: "css", json: "json",
      xml: "xml", html: "html",
      gradle: "groovy",
      md: "markdown",
    };
    if (extMap[ext]) return extMap[ext];
  }
  const map: Record<string, string> = {
    java: "java", kotlin: "kotlin", cpp: "cpp",
    objc: "objective-c", swift: "swift",
    typescript: "typescript", tsx: "typescript",
    jsx: "javascript", javascript: "javascript",
    css: "css", json: "json", xml: "xml",
    gradle: "groovy", markdown: "markdown",
    text: "plaintext",
  };
  return map[lang] ?? "plaintext";
}

function getFileIcon(language: string, filename?: string, size = "w-3.5 h-3.5") {
  const color = LANG_COLORS[language] ?? LANG_COLORS[filename?.split(".").pop()?.toLowerCase() ?? ""] ?? "#888";
  if (["typescript", "tsx", "jsx", "javascript"].includes(language))
    return <Braces className={cn(size, "flex-shrink-0")} style={{ color }} />;
  if (["json", "xml", "markdown", "text"].includes(language))
    return <FileText className={cn(size, "flex-shrink-0")} style={{ color }} />;
  if (language === "css")
    return <File className={cn(size, "flex-shrink-0")} style={{ color }} />;
  return <FileCode2 className={cn(size, "flex-shrink-0")} style={{ color }} />;
}

// ── Tree ────────────────────────────────────────────────────────────────────

interface TreeFile { file: GeneratedFile; name: string }
interface TreeFolder { name: string; path: string; children: TreeNode[]; open: boolean; platformColor?: string }
type TreeNode = { kind: "file"; data: TreeFile } | { kind: "folder"; data: TreeFolder };

function buildTree(files: GeneratedFile[]): TreeFolder {
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
        const newFolder: TreeFolder = { name: part, path: parts.slice(0, i + 1).join("/"), children: [], open: true, platformColor: i === 0 ? PLATFORM_COLORS[part] : undefined };
        const node: TreeNode = { kind: "folder", data: newFolder };
        current.children.push(node);
        existing = node as { kind: "folder"; data: TreeFolder };
      }
      current = existing.data;
    }
    current.children.push({ kind: "file", data: { file, name: parts[parts.length - 1] } });
  }
  return root;
}

function toggleFolderInTree(root: TreeFolder, path: string): TreeFolder {
  function toggle(node: TreeNode): TreeNode {
    if (node.kind === "folder") {
      if (node.data.path === path) return { kind: "folder", data: { ...node.data, open: !node.data.open } };
      return { kind: "folder", data: { ...node.data, children: node.data.children.map(toggle) } };
    }
    return node;
  }
  return { ...root, children: root.children.map(toggle) };
}

function TreeNodeView({ node, activeFile, onFileClick, onFolderToggle, depth }: {
  node: TreeNode; activeFile: GeneratedFile | null;
  onFileClick: (f: GeneratedFile) => void; onFolderToggle: (path: string) => void; depth: number;
}) {
  const indent = depth * 12;
  if (node.kind === "file") {
    const { file, name } = node.data;
    const isActive = activeFile?.filename === file.filename && activeFile?.platform === file.platform;
    return (
      <button onClick={() => onFileClick(file)}
        className={cn("w-full flex items-center gap-1.5 py-1 rounded text-left transition-colors",
          isActive ? "bg-[#1f6feb33] border-l-2 border-[#1f6feb]" : "hover:bg-[#1f2937] border-l-2 border-transparent")}
        style={{ paddingLeft: `${indent + 8}px` }}>
        {getFileIcon(file.language, name)}
        <span className={cn("text-xs truncate", isActive ? "text-foreground" : "text-foreground/60")}>{name}</span>
      </button>
    );
  }
  const { data: folder } = node;
  return (
    <div>
      <button className="w-full flex items-center gap-1.5 py-1 rounded hover:bg-[#1f2937] transition-colors"
        style={{ paddingLeft: `${indent + 4}px` }} onClick={() => onFolderToggle(folder.path)}>
        <ChevronRight className={cn("w-3 h-3 text-muted-foreground transition-transform flex-shrink-0", folder.open && "rotate-90")} />
        {folder.open
          ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: folder.platformColor ?? "#e8c07d" }} />
          : <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: folder.platformColor ?? "#e8c07d" }} />}
        <span className="text-xs text-foreground/80 truncate">{folder.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/40 flex-shrink-0 pr-2">
          {folder.children.filter((c) => c.kind === "file").length || ""}
        </span>
      </button>
      {folder.open && folder.children.map((child, i) => (
        <TreeNodeView key={i} node={child} activeFile={activeFile} onFileClick={onFileClick} onFolderToggle={onFolderToggle} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── Download ────────────────────────────────────────────────────────────────

function downloadAll(files: GeneratedFile[], appName: string) {
  const lines: string[] = [`# ${appName} — Generated Files\n`];
  for (const f of files) lines.push(`## ${f.filename}\n\`\`\`${f.language}\n${f.content}\n\`\`\`\n`);
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${appName}-generated.txt`; a.click();
  URL.revokeObjectURL(url);
}

// ── Fullscreen Modal ────────────────────────────────────────────────────────

function FullscreenModal({ files, moduleName, specType, onClose }: {
  files: GeneratedFile[]; moduleName: string; specType: string; onClose: () => void;
}) {
  const [activeFile, setActiveFile] = useState<GeneratedFile>(files[0]);
  const [tree, setTree] = useState<TreeFolder>(() => buildTree(files));
  const [copied, setCopied] = useState(false);

  const currentIndex = files.indexOf(activeFile);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeFile]);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const typeLabel = specType === "ReactNativeApp" ? "React Native App" : specType === "WebApp" ? "Web App" : specType;
  const basename = activeFile.filename.split("/").pop() ?? activeFile.filename;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex flex-col" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col w-full h-full bg-[#0d1117] overflow-hidden" style={{ maxHeight: "100dvh" }}>

        {/* Modal header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] shrink-0">
          <FileCode2 className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">{moduleName}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{typeLabel}</span>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "#1f6feb", color: "#fff" }}>
            {files.length} files
          </span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => downloadAll(files, moduleName)}>
            <Download className="w-3.5 h-3.5" /> Pobierz
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Skopiowano" : "Kopiuj"}
          </Button>
          <button onClick={onClose} className="ml-2 flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-[#21262d] transition-colors" title="Zamknij (Esc)">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* File tabs bar */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-[#0d1117] border-b border-[#30363d] overflow-x-auto shrink-0 scrollbar-hide">
          {files.map((f) => {
            const isActive = f === activeFile;
            const fname = f.filename.split("/").pop() ?? f.filename;
            return (
              <button
                key={`${f.platform}-${f.filename}`}
                onClick={() => setActiveFile(f)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all whitespace-nowrap flex-shrink-0",
                  isActive
                    ? "bg-[#1f2937] text-foreground border border-[#30363d] border-b-[#1f6feb] border-b-2"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-[#1f2937]/50"
                )}
              >
                {getFileIcon(f.language, fname, "w-3 h-3")}
                <span>{fname}</span>
                {f.platform !== "shared" && (
                  <span className="text-[9px] px-1 rounded" style={{ background: `${PLATFORM_COLORS[f.platform]}22`, color: PLATFORM_COLORS[f.platform] }}>
                    {f.platform}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main body: tree + editor */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left tree panel */}
          <div className="w-60 flex-shrink-0 border-r border-[#30363d] bg-[#0d1117] overflow-y-auto">
            <div className="px-3 py-1.5 border-b border-[#30363d]">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Explorer</span>
            </div>
            <div className="px-2 pt-2 pb-1">
              <div className="flex items-center gap-1.5 px-1 py-0.5">
                <FolderOpen className="w-3.5 h-3.5 text-yellow-400/80" />
                <span className="text-xs font-medium text-foreground/70 truncate">{moduleName}</span>
              </div>
            </div>
            {tree.children.map((node, i) => (
              <TreeNodeView key={i} node={node} activeFile={activeFile}
                onFileClick={setActiveFile}
                onFolderToggle={(path) => setTree((prev) => toggleFolderInTree(prev, path))}
                depth={0} />
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-0 border-b border-[#30363d] bg-[#0d1117] shrink-0 px-3 py-1.5">
              <span className="text-muted-foreground/50 text-xs">{moduleName}</span>
              {activeFile.filename.split("/").map((part, i, arr) => (
                <span key={i} className="flex items-center">
                  <ChevronRightIcon className="w-3 h-3 text-muted-foreground/30 mx-1" />
                  <span className={cn("text-xs", i === arr.length - 1 ? "text-foreground font-medium" : "text-muted-foreground/50")}>{part}</span>
                </span>
              ))}
              <div className="flex-1" />
              <span className="inline-block w-2 h-2 rounded-full mr-1.5 flex-shrink-0" style={{ background: LANG_COLORS[activeFile.language] ?? "#888" }} />
              <span className="text-[10px] text-muted-foreground">{activeFile.language}</span>
            </div>

            {/* Monaco */}
            <div className="flex-1">
              <Editor
                key={`${activeFile.platform}-${activeFile.filename}`}
                height="100%"
                language={getMonacoLanguage(activeFile.language, basename)}
                value={activeFile.content}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  padding: { top: 16 },
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  renderLineHighlight: "all",
                  wordWrap: "off",
                  folding: true,
                }}
              />
            </div>

            {/* Bottom nav: prev / next file */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-t border-[#30363d] shrink-0">
              <button
                onClick={() => hasPrev && setActiveFile(files[currentIndex - 1])}
                disabled={!hasPrev}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {hasPrev ? (files[currentIndex - 1].filename.split("/").pop()) : "Poprzedni"}
              </button>
              <span className="text-[10px] text-muted-foreground/50">{currentIndex + 1} / {files.length}</span>
              <button
                onClick={() => hasNext && setActiveFile(files[currentIndex + 1])}
                disabled={!hasNext}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {hasNext ? (files[currentIndex + 1].filename.split("/").pop()) : "Następny"}
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main FilesViewer ────────────────────────────────────────────────────────

interface FilesViewerProps {
  files: GeneratedFile[];
  moduleName: string;
  specType: string;
  platform: string;
  fillHeight?: boolean;
}

export function FilesViewer({ files, moduleName, specType, platform, fillHeight = false }: FilesViewerProps) {
  const [tree, setTree] = useState<TreeFolder>(() => buildTree(files));
  const [activeFile, setActiveFile] = useState<GeneratedFile | null>(files[0] ?? null);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bodyStyle = fillHeight
    ? { flex: 1, display: "flex" as const }
    : { height: "420px", display: "flex" as const };

  const typeLabel = specType === "ReactNativeApp" ? "React Native App" : specType === "WebApp" ? "Web App" : specType;

  return (
    <>
      <div className={cn("rounded-xl border border-[#30363d] overflow-hidden bg-[#0d1117] shadow-xl shadow-black/40", fillHeight ? "flex flex-col flex-1" : "mt-3")}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">{moduleName}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{typeLabel}</span>
            <span className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0" style={{ background: "#1f6feb", color: "#fff" }}>
              {files.length} files
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => downloadAll(files, moduleName)}>
              <Download className="w-3 h-3" /> Pobierz
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleCopy}>
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Skopiowano" : "Kopiuj"}
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-6 px-2 text-xs gap-1.5 text-primary/80 hover:text-primary hover:bg-primary/10 font-medium"
              onClick={() => setFullscreen(true)}
              title="Otwórz podgląd pełnoekranowy"
            >
              <Maximize2 className="w-3 h-3" />
              Podgląd
            </Button>
          </div>
        </div>

        {/* Split body */}
        <div style={bodyStyle} className={fillHeight ? "flex-1" : ""}>
          {/* Tree */}
          <div className="w-56 flex-shrink-0 border-r border-[#30363d] bg-[#0d1117] overflow-y-auto">
            <div className="px-3 py-1.5 border-b border-[#30363d]">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Explorer</span>
            </div>
            <div className="px-2 pt-2 pb-1">
              <div className="flex items-center gap-1.5 px-1 py-0.5">
                <FolderOpen className="w-3.5 h-3.5 text-yellow-400/80" />
                <span className="text-xs font-medium text-foreground/70 truncate">{moduleName}</span>
              </div>
            </div>
            {tree.children.map((node, i) => (
              <TreeNodeView key={i} node={node} activeFile={activeFile}
                onFileClick={setActiveFile}
                onFolderToggle={(path) => setTree((prev) => toggleFolderInTree(prev, path))}
                depth={0} />
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeFile && (
              <div className="flex items-center gap-0 border-b border-[#30363d] bg-[#0d1117] shrink-0 overflow-x-auto">
                <div className="flex items-center gap-1.5 px-3 py-1.5 border-r border-[#30363d] border-b-2 border-b-[#1f6feb] flex-shrink-0">
                  {getFileIcon(activeFile.language, activeFile.filename.split("/").pop())}
                  <span className="text-xs text-foreground whitespace-nowrap">{activeFile.filename}</span>
                </div>
                <div className="flex-1" />
                <div className="px-3 flex items-center gap-1.5 flex-shrink-0">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: LANG_COLORS[activeFile.language] ?? "#888" }} />
                  <span className="text-[10px] text-muted-foreground">{activeFile.language}</span>
                </div>
              </div>
            )}
            <div className="flex-1">
              {activeFile ? (
                <Editor
                  key={`${activeFile.platform}-${activeFile.filename}`}
                  height="100%"
                  language={getMonacoLanguage(activeFile.language, activeFile.filename.split("/").pop())}
                  value={activeFile.content}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    padding: { top: 12 },
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    renderLineHighlight: "all",
                    wordWrap: "off",
                  }}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                  Wybierz plik z drzewa po lewej
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#161b22] border-t border-[#30363d] shrink-0">
          <span className="text-[10px] text-muted-foreground/60 truncate">
            {activeFile ? activeFile.filename : "Brak wybranego pliku"}
          </span>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 flex-shrink-0">
            <button onClick={() => setFullscreen(true)} className="flex items-center gap-1 hover:text-primary transition-colors">
              <Maximize2 className="w-2.5 h-2.5" />
              Pełny ekran
            </button>
            <span>·</span>
            <span className="capitalize">{platform}</span>
            <span>·</span>
            <span>{files.length} files</span>
          </div>
        </div>
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <FullscreenModal
          files={files}
          moduleName={moduleName}
          specType={specType}
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  );
}
