import { useState } from "react";
import Editor from "@monaco-editor/react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Layers,
  History as HistoryIcon,
  Smartphone,
  Apple,
  MonitorSmartphone,
  Box,
  Component,
  Trash2,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Info,
  Cpu,
  Puzzle,
  ArrowRight,
  Terminal,
  RotateCcw,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import {
  useGenerateCode,
  useListTemplates,
  useListHistory,
  useClearHistory,
  type GenerateCodeRequestPlatform,
  type GenerateCodeRequestSpecType,
  type GeneratedFile,
} from "@workspace/api-client-react";

import { Button } from "@/components/Button";
import { FilesViewer } from "@/components/FilesViewer";
import { cn } from "@/lib/utils";

const DEFAULT_SPEC = `import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  readonly getConstants: () => {};
  multiply(a: number, b: number): Promise<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'CalculatorModule',
);`;

const SPEC_TYPE_INFO = {
  NativeModule: {
    icon: <Cpu className="w-4 h-4" />,
    label: "NativeModule",
    short: "TurboModule",
    color: "text-primary",
    bg: "bg-primary/10",
    desc: "Exposes native functions (Java/Kotlin/Obj-C/Swift) to JavaScript as async or sync methods. Use for device APIs: camera, Bluetooth, sensors, storage.",
  },
  NativeComponent: {
    icon: <Puzzle className="w-4 h-4" />,
    label: "NativeComponent",
    short: "Fabric",
    color: "text-green-400",
    bg: "bg-green-400/10",
    desc: "Wraps a native View (Android ViewGroup / iOS UIView) and exposes it as a React component with typed props. Use for custom rendering: maps, video, charts.",
  },
};

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: <Terminal className="w-4 h-4" />,
    title: "Write a TypeScript Spec",
    desc: "Define your module's interface using React Native's Codegen-compatible TypeScript syntax.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    step: "2",
    icon: <Play className="w-4 h-4" />,
    title: "Click Generate Code",
    desc: "The engine converts your spec into Java, C++, Objective-C and TypeScript boilerplate.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    step: "3",
    icon: <FileCode2 className="w-4 h-4" />,
    title: "Get Native Files",
    desc: "Browse the file tree, copy or download generated code, and drop it into your RN project.",
    color: "text-green-400",
    bg: "bg-green-400/10",
  },
];

function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden mb-3">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">How it works</span>
        </div>
        <ChevronDown
          className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 space-y-3 bg-background/30">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="flex items-start gap-3">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", step.bg)}>
                <span className={cn("w-4 h-4", step.color)}>{step.icon}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground leading-snug">{step.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyOutput() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-10 py-12 text-center gap-8">
      <div className="space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-secondary/40 border border-border/40 flex items-center justify-center mx-auto">
          <Terminal className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No output yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Write your TypeScript spec in the editor, configure the module settings, then click{" "}
          <span className="text-primary font-medium">Generate Code</span>.
        </p>
      </div>

      {/* Steps */}
      <div className="w-full max-w-xs space-y-2">
        {HOW_IT_WORKS.map((step, i) => (
          <div key={step.step} className="relative">
            <div className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-secondary/20">
              <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0", step.bg)}>
                <span className={cn("w-3.5 h-3.5", step.color)}>{step.icon}</span>
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-foreground">{step.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
            {i < HOW_IT_WORKS.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowRight className="w-3.5 h-3.5 text-border rotate-90" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Studio() {
  const { data: templatesData, isLoading: isLoadingTemplates } = useListTemplates();
  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useListHistory();
  const generateMutation = useGenerateCode();
  const clearHistoryMutation = useClearHistory();

  const [spec, setSpec] = useState(DEFAULT_SPEC);
  const [moduleName, setModuleName] = useState("CalculatorModule");
  const [specType, setSpecType] = useState<GenerateCodeRequestSpecType>("NativeModule");
  const [platform, setPlatform] = useState<GenerateCodeRequestPlatform>("both");

  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [generatedMeta, setGeneratedMeta] = useState<{ moduleName: string; specType: string; platform: string } | null>(null);

  const [activeSidebarTab, setActiveSidebarTab] = useState<"templates" | "history">("templates");
  const [showSpecInfo, setShowSpecInfo] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

  const handleGenerate = async () => {
    try {
      const response = await generateMutation.mutateAsync({
        data: { spec, moduleName, specType, platform },
      });
      setGeneratedFiles(response.files);
      setGeneratedMeta({ moduleName, specType, platform });
      refetchHistory();
    } catch (err) {
      console.error("Failed to generate code:", err);
    }
  };

  const loadTemplate = (t: { spec: string; moduleName: string; specType: string }) => {
    setSpec(t.spec);
    setModuleName(t.moduleName);
    setSpecType(t.specType as GenerateCodeRequestSpecType);
    setGeneratedFiles([]);
    setGeneratedMeta(null);
  };

  const loadHistoryItem = (h: {
    spec: string;
    moduleName: string;
    specType: string;
    platform: string;
    files: unknown;
  }) => {
    setSpec(h.spec);
    setModuleName(h.moduleName);
    setSpecType(h.specType as GenerateCodeRequestSpecType);
    setPlatform(h.platform as GenerateCodeRequestPlatform);
    const files = h.files as GeneratedFile[];
    setGeneratedFiles(files);
    setGeneratedMeta({ moduleName: h.moduleName, specType: h.specType, platform: h.platform });
  };

  const info = SPEC_TYPE_INFO[specType];

  return (
    <div className="flex flex-1 w-full bg-background text-foreground overflow-hidden">
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ───────────────────────────────────── */}
        <aside className="w-72 border-r border-border flex flex-col bg-sidebar overflow-hidden">
          <div className="flex p-3 gap-2 border-b border-border/50 shrink-0">
            <Button
              variant={activeSidebarTab === "templates" ? "ghost-active" : "ghost"}
              size="sm"
              className="flex-1 rounded-full h-8 text-xs font-medium"
              onClick={() => setActiveSidebarTab("templates")}
            >
              <Layers className="w-3.5 h-3.5 mr-2" />
              Templates
            </Button>
            <Button
              variant={activeSidebarTab === "history" ? "ghost-active" : "ghost"}
              size="sm"
              className="flex-1 rounded-full h-8 text-xs font-medium"
              onClick={() => setActiveSidebarTab("history")}
            >
              <HistoryIcon className="w-3.5 h-3.5 mr-2" />
              History
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <HowItWorks />

            <AnimatePresence mode="wait">
              {/* TEMPLATES */}
              {activeSidebarTab === "templates" && (
                <motion.div
                  key="templates"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    Starter Templates
                  </p>
                  {isLoadingTemplates ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : templatesData?.templates?.length === 0 ? (
                    <div className="text-center p-4 text-xs text-muted-foreground">No templates available</div>
                  ) : (
                    templatesData?.templates?.map((t) => {
                      const isModule = t.specType === "NativeModule";
                      return (
                        <button
                          key={t.id}
                          onClick={() => loadTemplate(t)}
                          className="w-full text-left p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-accent/5 hover:border-accent/30 transition-all group flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-sm text-foreground/90 group-hover:text-foreground transition-colors leading-tight">
                              {t.name}
                            </span>
                            <span
                              className={cn(
                                "flex-shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                isModule ? "bg-primary/15 text-primary" : "bg-green-400/15 text-green-400"
                              )}
                            >
                              {isModule ? <Box className="w-2.5 h-2.5" /> : <Component className="w-2.5 h-2.5" />}
                              {isModule ? "Module" : "Component"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.description}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                            <ArrowRight className="w-3 h-3" />
                            <span>Click to load</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </motion.div>
              )}

              {/* HISTORY */}
              {activeSidebarTab === "history" && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Recent Runs
                    </p>
                    {(historyData?.items?.length ?? 0) > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          clearHistoryMutation.mutate(undefined, { onSuccess: () => refetchHistory() })
                        }
                        title="Clear history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : historyData?.items?.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-border rounded-xl space-y-2">
                      <HistoryIcon className="w-6 h-6 mx-auto text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">No runs yet. Generate some code first!</p>
                    </div>
                  ) : (
                    historyData?.items?.map((h) => {
                      const isExpanded = expandedHistoryId === h.id;
                      return (
                        <div
                          key={h.id}
                          className="rounded-xl border border-border/50 bg-background/50 overflow-hidden"
                        >
                          {/* Row */}
                          <button
                            className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-accent/5 transition-colors"
                            onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-semibold text-primary/90 truncate">
                                  {h.moduleName}
                                </span>
                                <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                                  {format(new Date(h.generatedAt), "HH:mm")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded-full font-medium",
                                    h.specType === "NativeModule"
                                      ? "bg-primary/10 text-primary"
                                      : "bg-green-400/10 text-green-400"
                                  )}
                                >
                                  {h.specType === "NativeModule" ? "Module" : "Component"}
                                </span>
                                <div className="flex items-center gap-1">
                                  {h.platform === "android" && <Smartphone className="w-3 h-3" />}
                                  {h.platform === "ios" && <Apple className="w-3 h-3" />}
                                  {(h.platform === "both" || h.platform === "shared") && (
                                    <MonitorSmartphone className="w-3 h-3" />
                                  )}
                                  <span className="capitalize">{h.platform}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <FileCode2 className="w-3 h-3" />
                                  <span>{h.fileCount} files</span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight
                              className={cn(
                                "w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1 transition-transform",
                                isExpanded && "rotate-90"
                              )}
                            />
                          </button>
                          {/* Expanded actions */}
                          {isExpanded && (
                            <div className="px-3 pb-3 flex gap-2 border-t border-border/50 pt-2.5">
                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs gap-1.5 rounded-lg"
                                onClick={() => loadHistoryItem(h as Parameters<typeof loadHistoryItem>[0])}
                              >
                                <RotateCcw className="w-3 h-3" />
                                Reload into editor
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* ── MAIN EDITOR ───────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 border-r border-border relative z-0">

          {/* Config Bar */}
          <div className="h-auto min-h-[60px] border-b border-border bg-background/50 flex items-center px-4 gap-4 shrink-0 py-2 flex-wrap">
            {/* Module name */}
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                Module Name
              </label>
              <input
                type="text"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full bg-transparent border-none text-sm font-mono text-foreground focus:outline-none p-0 placeholder:text-muted-foreground/30"
                placeholder="e.g. MyNativeModule"
              />
            </div>

            <div className="h-8 w-px bg-border/50 hidden sm:block" />

            {/* Spec Type with info popover */}
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Spec Type
                </label>
                <button
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  onClick={() => setShowSpecInfo((v) => !v)}
                  title="What's the difference?"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
              <div className="flex bg-secondary rounded-md p-0.5 border border-border/50">
                {(["NativeModule", "NativeComponent"] as const).map((type) => {
                  const t = SPEC_TYPE_INFO[type];
                  return (
                    <button
                      key={type}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all",
                        specType === type
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setSpecType(type)}
                    >
                      <span className={specType === type ? t.color : ""}>{t.icon}</span>
                      {t.short}
                    </button>
                  );
                })}
              </div>

              {/* Spec type popover */}
              <AnimatePresence>
                {showSpecInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-72 z-50 bg-popover border border-border rounded-xl shadow-2xl shadow-black/40 p-4 space-y-3"
                  >
                    <p className="text-xs font-semibold text-foreground">Spec Types Explained</p>
                    {(["NativeModule", "NativeComponent"] as const).map((type) => {
                      const t = SPEC_TYPE_INFO[type];
                      return (
                        <div key={type} className={cn("flex items-start gap-3 p-2.5 rounded-lg", t.bg)}>
                          <div className={cn("mt-0.5 flex-shrink-0", t.color)}>{t.icon}</div>
                          <div>
                            <p className={cn("text-xs font-semibold", t.color)}>{t.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowSpecInfo(false)}
                    >
                      Close
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-px bg-border/50 hidden sm:block" />

            {/* Platform */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                Platform
              </label>
              <div className="flex bg-secondary rounded-md p-0.5 border border-border/50">
                {(
                  [
                    { value: "android", icon: <Smartphone className="w-4 h-4" />, label: "Android", activeClass: "text-green-400" },
                    { value: "ios", icon: <Apple className="w-4 h-4" />, label: "iOS", activeClass: "text-blue-400" },
                    { value: "both", icon: <MonitorSmartphone className="w-4 h-4" />, label: "Both", activeClass: "text-primary" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.value}
                    className={cn(
                      "p-1.5 rounded transition-all",
                      platform === p.value
                        ? `bg-background ${p.activeClass} shadow-sm`
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setPlatform(p.value)}
                    title={p.label}
                  >
                    {p.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 relative bg-[#1E1E1E]" onClick={() => setShowSpecInfo(false)}>
            {/* Editor label */}
            <div className="absolute top-3 right-4 z-10 flex items-center gap-2 pointer-events-none">
              <span className="text-[10px] font-mono text-muted-foreground/40 bg-[#1E1E1E]/80 px-2 py-0.5 rounded">
                TypeScript Spec
              </span>
            </div>
            <Editor
              height="100%"
              language="typescript"
              theme="vs-dark"
              value={spec}
              onChange={(val) => setSpec(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 24,
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                contextmenu: false,
                renderLineHighlight: "all",
              }}
            />
          </div>

          {/* Footer */}
          <div className="h-14 border-t border-border bg-background/80 backdrop-blur flex items-center justify-between px-5 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium", info.bg, info.color)}>
                {info.icon}
                {info.label}
              </span>
              <span className="capitalize text-muted-foreground/60">· {platform}</span>
            </div>

            <div className="flex items-center gap-3">
              {generateMutation.isError && (
                <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{generateMutation.error?.error || "Generation failed"}</span>
                </div>
              )}
              {generateMutation.isSuccess && !generateMutation.isPending && (
                <div className="flex items-center gap-2 text-green-500 text-xs bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{generatedFiles.length} files ready</span>
                </div>
              )}
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !spec.trim()}
                className="gap-2 px-6 shadow-primary/25 rounded-full"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" fill="currentColor" />
                )}
                <span className="font-semibold">
                  {generateMutation.isPending ? "Generating..." : "Generate Code"}
                </span>
              </Button>
            </div>
          </div>
        </main>

        {/* ── OUTPUT AREA ───────────────────────────────── */}
        <section className="w-[45%] flex flex-col bg-background min-w-0 overflow-hidden">
          {generatedFiles.length === 0 ? (
            <EmptyOutput />
          ) : generatedMeta ? (
            <FilesViewer
              files={generatedFiles}
              moduleName={generatedMeta.moduleName}
              specType={generatedMeta.specType}
              platform={generatedMeta.platform}
              fillHeight
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
