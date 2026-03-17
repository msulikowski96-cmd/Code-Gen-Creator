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
  File,
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

// Map our language value → Monaco editor language id
function getMonacoLanguage(lang: string, filename?: string): string {
  // First try by extension from filename
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
  // Fallback by language field
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

function getFileIcon(language: string, filename?: string) {
  const ext = filename?.split(".").pop()?.toLowerCase() ?? "";
  const color = LANG_COLORS[language] ?? LANG_COLORS[ext] ?? "#888";

  if (["typescript", "tsx", "jsx", "javascript"].includes(language)) {
    return <Braces className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />;
  }
  if (["json", "xml", "markdown", "text"].includes(language)) {
    return <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />;
  }
  if (language === "css") {
    return <File className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />;
  }
  return <FileCode2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />;
}

// --- Tree building ---

interface TreeFile {
  file: GeneratedFile;
  name: string;   // just the basename
}

interface TreeFolder {
  name: string;
  path: string;
  children: TreeNode[];
  open: boolean;
  platformColor?: string;
}

type TreeNode = { kind: "file"; data: TreeFile } | { kind: "folder"; data: TreeFolder };

function buildTree(files: GeneratedFile[]): TreeFolder {
  // Check if any filename has a path separator — if so, use path-based tree
  const hasNestedPaths = files.some((f) => f.filename.includes("/"));

  const root: TreeFolder = { name: "root", path: "", children: [], open: true };

  for (const file of files) {
    const parts = hasNestedPaths
      ? file.filename.split("/")
      : [file.platform, file.filename]; // legacy: group by platform

    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let existing = current.children.find(
        (c): c is { kind: "folder"; data: TreeFolder } =>
          c.kind === "folder" && c.data.name === part
      );
      if (!existing) {
        const newFolder: TreeFolder = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          children: [],
          open: true,
          platformColor: i === 0 ? PLATFORM_COLORS[part] : undefined,
        };
        const node: TreeNode = { kind: "folder", data: newFolder };
        current.children.push(node);
        existing = node as { kind: "folder"; data: TreeFolder };
      }
      current = existing.data;
    }

    const basename = parts[parts.length - 1];
    current.children.push({
      kind: "file",
      data: { file, name: basename },
    });
  }

  return root;
}

function TreeNodeView({
  node,
  activeFile,
  onFileClick,
  onFolderToggle,
  depth,
}: {
  node: TreeNode;
  activeFile: GeneratedFile | null;
  onFileClick: (f: GeneratedFile) => void;
  onFolderToggle: (path: string) => void;
  depth: number;
}) {
  const indent = depth * 12;

  if (node.kind === "file") {
    const { file, name } = node.data;
    const isActive =
      activeFile?.filename === file.filename && activeFile?.platform === file.platform;
    return (
      <button
        onClick={() => onFileClick(file)}
        className={cn(
          "w-full flex items-center gap-1.5 py-1 rounded text-left transition-colors",
          isActive
            ? "bg-[#1f6feb33] border-l-2 border-[#1f6feb]"
            : "hover:bg-[#1f2937] border-l-2 border-transparent"
        )}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {getFileIcon(file.language, name)}
        <span className={cn("text-xs truncate", isActive ? "text-foreground" : "text-foreground/60")}>
          {name}
        </span>
      </button>
    );
  }

  const { data: folder } = node;
  return (
    <div>
      <button
        className="w-full flex items-center gap-1.5 py-1 rounded hover:bg-[#1f2937] transition-colors"
        style={{ paddingLeft: `${indent + 4}px` }}
        onClick={() => onFolderToggle(folder.path)}
      >
        <ChevronRight
          className={cn("w-3 h-3 text-muted-foreground transition-transform flex-shrink-0", folder.open && "rotate-90")}
        />
        {folder.open
          ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: folder.platformColor ?? "#e8c07d" }} />
          : <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: folder.platformColor ?? "#e8c07d" }} />
        }
        <span className="text-xs text-foreground/80 truncate">{folder.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/40 flex-shrink-0 pr-2">
          {folder.children.filter((c) => c.kind === "file").length || ""}
        </span>
      </button>
      {folder.open && folder.children.map((child, i) => (
        <TreeNodeView
          key={i}
          node={child}
          activeFile={activeFile}
          onFileClick={onFileClick}
          onFolderToggle={onFolderToggle}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function toggleFolderInTree(root: TreeFolder, path: string): TreeFolder {
  function toggle(node: TreeNode): TreeNode {
    if (node.kind === "folder") {
      if (node.data.path === path) {
        return { kind: "folder", data: { ...node.data, open: !node.data.open } };
      }
      return { kind: "folder", data: { ...node.data, children: node.data.children.map(toggle) } };
    }
    return node;
  }
  return { ...root, children: root.children.map(toggle) };
}

function downloadAll(files: GeneratedFile[], appName: string) {
  const lines: string[] = [`# ${appName} — Generated Files\n`];
  for (const f of files)
    lines.push(`## ${f.filename}\n\`\`\`${f.language}\n${f.content}\n\`\`\`\n`);
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${appName}-generated.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

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

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFolderToggle = (path: string) => {
    setTree((prev) => toggleFolderInTree(prev, path));
  };

  const bodyStyle = fillHeight ? { flex: 1, display: "flex" as const } : { height: "420px", display: "flex" as const };

  // Badge label
  const typeLabel =
    specType === "ReactNativeApp"
      ? "React Native App"
      : specType === "WebApp"
        ? "Web App"
        : specType;

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
          <span className="text-xs text-muted-foreground">{typeLabel}</span>
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
            Download
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
        {/* File tree */}
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
            <TreeNodeView
              key={i}
              node={node}
              activeFile={activeFile}
              onFileClick={setActiveFile}
              onFolderToggle={handleFolderToggle}
              depth={0}
            />
          ))}
        </div>

        {/* Editor panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeFile && (
            <div className="flex items-center gap-0 border-b border-[#30363d] bg-[#0d1117] shrink-0 overflow-x-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-r border-[#30363d] border-b-2 border-b-[#1f6feb] flex-shrink-0">
                {getFileIcon(activeFile.language, activeFile.filename.split("/").pop())}
                <span className="text-xs text-foreground whitespace-nowrap">{activeFile.filename}</span>
              </div>
              <div className="flex-1" />
              <div className="px-3 flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: LANG_COLORS[activeFile.language] ?? "#888" }}
                />
                <span className="text-[10px] text-muted-foreground">{activeFile.language}</span>
              </div>
            </div>
          )}
          <div className="flex-1">
            {activeFile ? (
              <Editor
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
          <span className="capitalize">{platform}</span>
          <span>·</span>
          <span>{files.length} files</span>
        </div>
      </div>
    </div>
  );
}
