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
  RotateCcw,
  Zap,
  MousePointer,
  Download,
  Sparkles,
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

// Definiujesz tutaj interfejs swojego modułu natywnego.
// Każda metoda to funkcja dostępna w JavaScript,
// ale uruchamiana w natywnym kodzie (Java / Swift / C++).

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
    label: "NativeModule (TurboModule)",
    short: "TurboModule",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    example: "Bluetooth, GPS, kamera, czujniki, szyfrowanie",
    desc: "Eksponuje funkcje natywne (Java/Kotlin/Obj-C/Swift) do JavaScriptu. Używaj gdy chcesz wywołać kod natywny — np. odczyt baterii, Bluetooth, zapis pliku.",
  },
  NativeComponent: {
    icon: <Puzzle className="w-4 h-4" />,
    label: "NativeComponent (Fabric)",
    short: "Fabric",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
    example: "Mapy, odtwarzacz wideo, niestandardowe widoki",
    desc: "Opakowuje natywny widok (Android ViewGroup / iOS UIView) jako komponent React z typowanymi propsami. Używaj gdy chcesz natywne renderowanie.",
  },
};

function StepBadge({ n, color }: { n: number; color: string }) {
  return (
    <div
      className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
        color
      )}
    >
      {n}
    </div>
  );
}

function PanelHeader({
  step,
  stepColor,
  title,
  subtitle,
  action,
}: {
  step: number;
  stepColor: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/60 shrink-0">
      <StepBadge n={step} color={stepColor} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-none">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed truncate">{subtitle}</p>
      </div>
      {action}
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
  const [generatedMeta, setGeneratedMeta] = useState<{
    moduleName: string;
    specType: string;
    platform: string;
  } | null>(null);

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
    setGeneratedFiles(h.files as GeneratedFile[]);
    setGeneratedMeta({ moduleName: h.moduleName, specType: h.specType, platform: h.platform });
  };

  const info = SPEC_TYPE_INFO[specType];
  const hasGenerated = generatedFiles.length > 0 && generatedMeta;

  return (
    <div className="flex flex-1 w-full bg-background text-foreground overflow-hidden flex-col">

      {/* ── TOP BANNER ─── co to jest Studio ──────────── */}
      <div className="flex items-center gap-6 px-5 py-2.5 bg-secondary/20 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span>
            <span className="font-semibold text-foreground">Studio</span>
            {" "}— napisz specyfikację TypeScript, kliknij Generuj i otrzymaj gotowy kod natywny dla Android i iOS.
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/70 inline-block" />TypeScript spec</span>
          <ArrowRight className="w-3 h-3" />
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400/70 inline-block" />Generuj</span>
          <ArrowRight className="w-3 h-3" />
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400/70 inline-block" />Java · C++ · Obj-C · Swift</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── PANEL 1: WYBIERZ SZABLON ─────────────────── */}
        <aside className="w-72 border-r border-border flex flex-col bg-sidebar overflow-hidden">
          <PanelHeader
            step={1}
            stepColor="bg-primary/20 text-primary"
            title="Wybierz punkt startowy"
            subtitle="Załaduj gotowy szablon lub napisz własną spec"
          />

          {/* Tabs */}
          <div className="flex px-3 pt-2 pb-0 gap-2 shrink-0">
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-7 text-xs font-medium rounded-md transition-all",
                activeSidebarTab === "templates"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveSidebarTab("templates")}
            >
              <Layers className="w-3 h-3" />
              Szablony
            </button>
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-7 text-xs font-medium rounded-md transition-all",
                activeSidebarTab === "history"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveSidebarTab("history")}
            >
              <HistoryIcon className="w-3 h-3" />
              Historia
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence mode="wait">

              {/* SZABLONY */}
              {activeSidebarTab === "templates" && (
                <motion.div
                  key="templates"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-2"
                >
                  <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
                    Kliknij szablon, żeby załadować gotową specyfikację do edytora.
                  </p>
                  {isLoadingTemplates ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    templatesData?.templates?.map((t) => {
                      const isModule = t.specType === "NativeModule";
                      return (
                        <button
                          key={t.id}
                          onClick={() => loadTemplate(t)}
                          className="w-full text-left p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-accent/5 hover:border-primary/30 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="font-medium text-sm text-foreground/90 group-hover:text-foreground leading-snug">
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
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{t.description}</p>
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-primary/50 group-hover:text-primary/80 transition-colors">
                            <MousePointer className="w-2.5 h-2.5" />
                            <span>Kliknij, aby załadować</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </motion.div>
              )}

              {/* HISTORIA */}
              {activeSidebarTab === "history" && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Poprzednie generacje — kliknij, żeby ponownie załadować.
                    </p>
                    {(historyData?.items?.length ?? 0) > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                        onClick={() => clearHistoryMutation.mutate(undefined, { onSuccess: () => refetchHistory() })}
                        title="Wyczyść historię"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : historyData?.items?.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-border rounded-xl">
                      <HistoryIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">Brak historii — wygeneruj pierwszy kod!</p>
                    </div>
                  ) : (
                    historyData?.items?.map((h) => {
                      const isExpanded = expandedHistoryId === h.id;
                      return (
                        <div key={h.id} className="rounded-xl border border-border/50 bg-background/50 overflow-hidden">
                          <button
                            className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-accent/5 transition-colors"
                            onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-semibold text-primary/90 truncate">{h.moduleName}</span>
                                <span className="text-[10px] text-muted-foreground ml-2">{format(new Date(h.generatedAt), "HH:mm")}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                                <span className={cn("px-1.5 py-0.5 rounded-full font-medium", h.specType === "NativeModule" ? "bg-primary/10 text-primary" : "bg-green-400/10 text-green-400")}>
                                  {h.specType === "NativeModule" ? "Module" : "Component"}
                                </span>
                                <div className="flex items-center gap-1">
                                  {h.platform === "android" && <Smartphone className="w-3 h-3" />}
                                  {h.platform === "ios" && <Apple className="w-3 h-3" />}
                                  {(h.platform === "both" || h.platform === "shared") && <MonitorSmartphone className="w-3 h-3" />}
                                  <span className="capitalize">{h.platform}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <FileCode2 className="w-3 h-3" />
                                  <span>{h.fileCount} plików</span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1 transition-transform", isExpanded && "rotate-90")} />
                          </button>
                          {isExpanded && (
                            <div className="px-3 pb-3 border-t border-border/50 pt-2.5">
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs gap-1.5 rounded-lg"
                                onClick={() => loadHistoryItem(h as Parameters<typeof loadHistoryItem>[0])}
                              >
                                <RotateCcw className="w-3 h-3" />
                                Załaduj z powrotem
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

        {/* ── PANEL 2: EDYTOR SPECYFIKACJI ─────────────── */}
        <main className="flex-1 flex flex-col min-w-0 border-r border-border relative z-0">
          <PanelHeader
            step={2}
            stepColor="bg-yellow-400/20 text-yellow-400"
            title="Skonfiguruj i edytuj specyfikację"
            subtitle="Nazwij moduł, wybierz typ i platformę, potem edytuj TypeScript spec poniżej"
          />

          {/* ── Config Bar ── */}
          <div className="border-b border-border bg-background/50 px-4 py-3 shrink-0 space-y-3">

            {/* Module Name */}
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                  Nazwa modułu
                </label>
                <input
                  type="text"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="w-full bg-transparent border-none text-sm font-mono text-foreground focus:outline-none p-0 placeholder:text-muted-foreground/30"
                  placeholder="np. CameraModule"
                />
              </div>

              {/* Platform */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                  Platforma
                </label>
                <div className="flex bg-secondary rounded-md p-0.5 border border-border/50">
                  {([
                    { value: "android", icon: <Smartphone className="w-3.5 h-3.5" />, label: "Android", activeClass: "text-green-400" },
                    { value: "ios", icon: <Apple className="w-3.5 h-3.5" />, label: "iOS", activeClass: "text-blue-400" },
                    { value: "both", icon: <MonitorSmartphone className="w-3.5 h-3.5" />, label: "Obie", activeClass: "text-primary" },
                  ] as const).map((p) => (
                    <button
                      key={p.value}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-xs transition-all",
                        platform === p.value ? `bg-background ${p.activeClass} shadow-sm font-medium` : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setPlatform(p.value)}
                    >
                      {p.icon}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Spec Type */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Typ modułu
                </label>
                <button
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  onClick={() => setShowSpecInfo((v) => !v)}
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-2">
                {(["NativeModule", "NativeComponent"] as const).map((type) => {
                  const t = SPEC_TYPE_INFO[type];
                  const isActive = specType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSpecType(type)}
                      className={cn(
                        "flex-1 flex items-start gap-2.5 p-2.5 rounded-lg border transition-all text-left",
                        isActive
                          ? cn("border", t.border, t.bg)
                          : "border-border/40 bg-secondary/20 hover:border-border hover:bg-secondary/40"
                      )}
                    >
                      <div className={cn("mt-0.5 flex-shrink-0", isActive ? t.color : "text-muted-foreground")}>
                        {t.icon}
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-xs font-semibold leading-none", isActive ? t.color : "text-foreground/70")}>
                          {t.short}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                          {t.example}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Spec type info box */}
              <AnimatePresence>
                {showSpecInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-2">
                      {(["NativeModule", "NativeComponent"] as const).map((type) => {
                        const t = SPEC_TYPE_INFO[type];
                        return (
                          <div key={type} className={cn("flex items-start gap-2.5 p-2.5 rounded-lg border", t.border, t.bg)}>
                            <div className={cn("flex-shrink-0 mt-0.5", t.color)}>{t.icon}</div>
                            <div>
                              <p className={cn("text-xs font-semibold", t.color)}>{t.label}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 relative bg-[#1E1E1E]" onClick={() => setShowSpecInfo(false)}>
            <Editor
              height="100%"
              language="typescript"
              theme="vs-dark"
              value={spec}
              onChange={(val) => setSpec(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 22,
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                contextmenu: false,
                renderLineHighlight: "all",
              }}
            />
          </div>

          {/* Footer — Generate button */}
          <div className="border-t border-border bg-background/80 backdrop-blur flex items-center justify-between px-5 py-3 shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md font-medium text-[11px]", info.bg, info.color)}>
                {info.icon}
                {info.short}
              </span>
              <span className="text-muted-foreground/60">· {platform === "both" ? "Android + iOS" : platform}</span>
            </div>
            <div className="flex items-center gap-3">
              {generateMutation.isError && (
                <span className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {generateMutation.error?.error || "Błąd generowania"}
                </span>
              )}
              {hasGenerated && !generateMutation.isPending && (
                <span className="flex items-center gap-2 text-green-500 text-xs bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {generatedFiles.length} plików wygenerowanych
                </span>
              )}
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !spec.trim()}
                className="gap-2 px-6 rounded-full shadow-primary/20"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" fill="currentColor" />
                )}
                <span className="font-semibold">
                  {generateMutation.isPending ? "Generuję..." : "Generuj kod"}
                </span>
              </Button>
            </div>
          </div>
        </main>

        {/* ── PANEL 3: WYNIKI ───────────────────────────── */}
        <section className="w-[45%] flex flex-col bg-background min-w-0 overflow-hidden">
          <PanelHeader
            step={3}
            stepColor="bg-green-400/20 text-green-400"
            title="Wygenerowany kod natywny"
            subtitle={
              hasGenerated
                ? `${generatedFiles.length} plików · przeglądaj drzewo i kopiuj do projektu`
                : 'Tu pojawią się pliki po kliknięciu "Generuj kod"'
            }
            action={
              hasGenerated ? (
                <span className="flex items-center gap-1 text-[10px] text-green-400/80 bg-green-400/10 px-2 py-1 rounded-full font-medium flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  Gotowe
                </span>
              ) : undefined
            }
          />

          {!hasGenerated ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-secondary/40 border border-border/40 flex items-center justify-center mb-5">
                <Zap className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Czekam na generację</h3>
              <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed mb-8">
                Wykonaj kroki 1 i 2 po lewej, następnie kliknij{" "}
                <span className="text-primary font-medium">Generuj kod</span> — tu pojawi się gotowy kod natywny.
              </p>

              {/* Visual flow */}
              <div className="w-full max-w-[280px] space-y-1.5">
                {[
                  { step: 1, label: "Wybierz szablon z lewej kolumny", color: "bg-primary/20 text-primary", icon: <Layers className="w-3 h-3" /> },
                  { step: 2, label: "Wpisz nazwę, wybierz typ i platformę", color: "bg-yellow-400/20 text-yellow-400", icon: <Info className="w-3 h-3" /> },
                  { step: 3, label: 'Kliknij przycisk "Generuj kod" na dole', color: "bg-yellow-400/20 text-yellow-400", icon: <Play className="w-3 h-3" /> },
                  { step: 4, label: "Przeglądaj i pobierz pliki tutaj", color: "bg-green-400/20 text-green-400", icon: <Download className="w-3 h-3" /> },
                ].map((item, i, arr) => (
                  <div key={i}>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-secondary/20 border border-border/30">
                      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0", item.color)}>
                        {item.icon}
                      </div>
                      <p className="text-xs text-foreground/70 text-left">{item.label}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <ArrowRight className="w-3 h-3 text-border/60 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <FilesViewer
              files={generatedFiles}
              moduleName={generatedMeta.moduleName}
              specType={generatedMeta.specType}
              platform={generatedMeta.platform}
              fillHeight
            />
          )}
        </section>
      </div>
    </div>
  );
}
