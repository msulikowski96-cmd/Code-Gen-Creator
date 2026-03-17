import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import type { GeneratedFile } from "@workspace/api-client-react";

export const LANG_COLORS: Record<string, string> = {
  java: "#B07219",
  kotlin: "#A97BFF",
  cpp: "#6e6e6e",
  objc: "#438EFF",
  swift: "#FA7343",
  typescript: "#3178C6",
};

export const PLATFORM_COLORS: Record<string, string> = {
  android: "#a8ff78",
  ios: "#78b4ff",
  shared: "#c678ff",
};

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

function getFileIcon(language: string) {
  if (language === "typescript")
    return <Braces className="w-3.5 h-3.5 flex-shrink-0" style={{ color: LANG_COLORS.typescript }} />;
  if (language === "cpp")
    return <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: LANG_COLORS.cpp }} />;
  return <FileCode2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: LANG_COLORS[language] ?? "#888" }} />;
}

interface FolderState {
  platform: string;
  files: GeneratedFile[];
  open: boolean;
}

function buildTree(files: GeneratedFile[]): FolderState[] {
  const order = ["android", "ios", "shared"];
  const map: Record<string, GeneratedFile[]> = {};
  for (const f of files) {
    const key = f.platform ?? "shared";
    if (!map[key]) map[key] = [];
    map[key].push(f);
  }
  return order.filter((p) => map[p]?.length).map((p) => ({ platform: p, files: map[p], open: true }));
}

function downloadAll(files: GeneratedFile[], moduleName: string) {
  const lines: string[] = [`# ${moduleName} — Generated Files\n`];
  for (const f of files)
    lines.push(`## ${f.platform}/${f.filename}\n\`\`\`${f.language}\n${f.content}\n\`\`\`\n`);
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${moduleName}-codegen.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

interface FilesViewerProps {
  files: GeneratedFile[];
  moduleName: string;
  specType: string;
  platform: string;
  /** When true the viewer fills its parent (flex-1). When false uses a fixed 420px. */
  fillHeight?: boolean;
}

export function FilesViewer({ files, moduleName, specType, platform, fillHeight = false }: FilesViewerProps) {
  const [folders, setFolders] = useState<FolderState[]>(() => buildTree(files));
  const [activeFile, setActiveFile] = useState<GeneratedFile | null>(files[0] ?? null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFolder = (p: string) =>
    setFolders((prev) => prev.map((f) => (f.platform === p ? { ...f, open: !f.open } : f)));

  const bodyStyle = fillHeight ? { flex: 1, display: "flex" as const } : { height: "420px", display: "flex" as const };

  return (
    <div
      className={cn(
        "rounded-xl border border-[#30363d] overflow-hidden bg-[#0d1117] shadow-xl shadow-black/40",
        fillHeight ? "flex flex-col flex-1" : "mt-3"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d] shrink-0">
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
            onClick={() => downloadAll(files, moduleName)}
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

      {/* Split body */}
      <div style={bodyStyle} className={fillHeight ? "flex-1" : ""}>
        {/* Tree */}
        <div className="w-52 flex-shrink-0 border-r border-[#30363d] bg-[#0d1117] overflow-y-auto">
          <div className="px-3 py-1.5 border-b border-[#30363d]">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Explorer</span>
          </div>
          <div className="px-2 pt-2 pb-1">
            <div className="flex items-center gap-1.5 px-1 py-0.5">
              <FolderOpen className="w-3.5 h-3.5 text-yellow-400/80" />
              <span className="text-xs font-medium text-foreground/70 truncate">{moduleName}</span>
            </div>
          </div>
          {folders.map((folder) => (
            <div key={folder.platform} className="ml-2">
              <button
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#1f2937] transition-colors"
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
                <span className="text-xs text-foreground/80 truncate">{folder.platform}</span>
                <span className="ml-auto text-[10px] text-muted-foreground/50 flex-shrink-0">{folder.files.length}</span>
              </button>
              {folder.open && (
                <div className="ml-4">
                  {folder.files.map((file) => {
                    const isActive =
                      activeFile?.filename === file.filename && activeFile?.platform === file.platform;
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
                        <span className={cn("text-xs truncate", isActive ? "text-foreground" : "text-foreground/60")}>
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

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeFile && (
            <div className="flex items-center gap-0 border-b border-[#30363d] bg-[#0d1117] shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-r border-[#30363d] border-b-2 border-b-[#1f6feb]">
                {getFileIcon(activeFile.language)}
                <span className="text-xs text-foreground">{activeFile.filename}</span>
                <span className="text-[10px] text-muted-foreground/50 ml-1">{activeFile.platform}</span>
              </div>
              <div className="flex-1" />
              <div className="px-3 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: LANG_COLORS[activeFile.language] ?? "#888" }} />
                <span className="text-[10px] text-muted-foreground">{activeFile.language}</span>
              </div>
            </div>
          )}
          <div className="flex-1">
            {activeFile ? (
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
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  renderLineHighlight: "all",
                  wordWrap: "off",
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                Select a file to preview
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#161b22] border-t border-[#30363d] shrink-0">
        <span className="text-[10px] text-muted-foreground/60">
          {activeFile ? `${activeFile.platform}/${activeFile.filename}` : "No file selected"}
        </span>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
          <span className="capitalize">{platform}</span>
          <span>·</span>
          <span>{files.length} files generated</span>
        </div>
      </div>
    </div>
  );
}
