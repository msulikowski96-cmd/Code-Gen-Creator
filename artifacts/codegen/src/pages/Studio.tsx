import { useState, useEffect } from "react";
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
  FileJson,
  Loader2,
  ChevronRight,
  Code2
} from "lucide-react";
import { 
  useGenerateCode, 
  useListTemplates, 
  useListHistory, 
  useClearHistory,
  type GenerateCodeRequestPlatform,
  type GenerateCodeRequestSpecType,
  type GeneratedFile
} from "@workspace/api-client-react";

import { Button } from "@/components/Button";
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

export default function Studio() {
  // Queries & Mutations
  const { data: templatesData, isLoading: isLoadingTemplates } = useListTemplates();
  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useListHistory();
  const generateMutation = useGenerateCode();
  const clearHistoryMutation = useClearHistory();

  // Editor State
  const [spec, setSpec] = useState(DEFAULT_SPEC);
  const [moduleName, setModuleName] = useState("CalculatorModule");
  const [specType, setSpecType] = useState<GenerateCodeRequestSpecType>("NativeModule");
  const [platform, setPlatform] = useState<GenerateCodeRequestPlatform>("both");
  
  // Output State
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [activeFileTab, setActiveFileTab] = useState<string | null>(null);
  
  // Sidebar State
  const [activeSidebarTab, setActiveSidebarTab] = useState<"templates" | "history">("templates");

  const handleGenerate = async () => {
    try {
      const response = await generateMutation.mutateAsync({
        data: {
          spec,
          moduleName,
          specType,
          platform
        }
      });
      
      setGeneratedFiles(response.files);
      if (response.files.length > 0) {
        setActiveFileTab(response.files[0].filename);
      }
      refetchHistory();
    } catch (err) {
      console.error("Failed to generate code:", err);
    }
  };

  const activeFileContent = generatedFiles.find(f => f.filename === activeFileTab)?.content || "";
  const activeFileLanguage = generatedFiles.find(f => f.filename === activeFileTab)?.language || "typescript";

  // Map backend language strings to monaco language ids
  const getMonacoLanguage = (lang: string) => {
    const map: Record<string, string> = {
      'java': 'java',
      'kotlin': 'kotlin',
      'cpp': 'cpp',
      'objc': 'objective-c',
      'swift': 'swift',
      'typescript': 'typescript'
    };
    return map[lang] || 'plaintext';
  };

  return (
    <div className="flex flex-1 w-full bg-background text-foreground overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-72 border-r border-border flex flex-col bg-sidebar">
          {/* Sidebar Tabs */}
          <div className="flex p-3 gap-2 border-b border-border/50">
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

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <AnimatePresence mode="wait">
              {activeSidebarTab === "templates" && (
                <motion.div 
                  key="templates"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  {isLoadingTemplates ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : templatesData?.templates?.length === 0 ? (
                    <div className="text-center p-4 text-xs text-muted-foreground">
                      No templates available
                    </div>
                  ) : (
                    templatesData?.templates?.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSpec(t.spec);
                          setModuleName(t.moduleName);
                          setSpecType(t.specType);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-accent/5 hover:border-accent/30 transition-all group flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-foreground/90 group-hover:text-accent transition-colors">{t.name}</span>
                          {t.specType === "NativeModule" ? (
                            <Box className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent/70" />
                          ) : (
                            <Component className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent/70" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.description}</p>
                      </button>
                    ))
                  )}
                </motion.div>
              )}

              {activeSidebarTab === "history" && (
                <motion.div 
                  key="history"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Runs</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => clearHistoryMutation.mutate(undefined, { onSuccess: () => refetchHistory() })}
                      title="Clear History"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {isLoadingHistory ? (
                      <div className="flex items-center justify-center p-8 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : historyData?.items?.length === 0 ? (
                      <div className="text-center p-8 border border-dashed border-border rounded-xl">
                        <HistoryIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">No generation history yet</p>
                      </div>
                    ) : (
                      historyData?.items?.map(h => (
                        <div key={h.id} className="p-3 rounded-xl border border-border/50 bg-background/50 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-primary/90">{h.moduleName}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(h.generatedAt), 'HH:mm:ss')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              {h.platform === 'android' && <Smartphone className="w-3.5 h-3.5" />}
                              {h.platform === 'ios' && <Apple className="w-3.5 h-3.5" />}
                              {h.platform === 'both' && <MonitorSmartphone className="w-3.5 h-3.5" />}
                              <span className="capitalize text-[10px]">{h.platform}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileCode2 className="w-3.5 h-3.5" />
                              <span>{h.fileCount} files</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* MAIN EDITOR AREA */}
        <main className="flex-1 flex flex-col min-w-0 border-r border-border relative z-0">
          
          {/* Config Bar */}
          <div className="h-16 border-b border-border bg-background/50 flex items-center px-4 gap-4 shrink-0">
            <div className="flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Module Name</label>
              <input 
                type="text" 
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full bg-transparent border-none text-sm font-mono text-foreground focus:outline-none focus:ring-0 p-0 placeholder:text-muted-foreground/30"
                placeholder="e.g. MyNativeModule"
              />
            </div>
            
            <div className="h-8 w-px bg-border/50"></div>
            
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Spec Type</label>
              <div className="flex bg-secondary rounded-md p-0.5 border border-border/50">
                <button
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded transition-all",
                    specType === "NativeModule" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setSpecType("NativeModule")}
                >
                  Module
                </button>
                <button
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded transition-all",
                    specType === "NativeComponent" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setSpecType("NativeComponent")}
                >
                  Component
                </button>
              </div>
            </div>

            <div className="h-8 w-px bg-border/50"></div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Platform</label>
              <div className="flex bg-secondary rounded-md p-0.5 border border-border/50">
                <button
                  className={cn(
                    "p-1.5 rounded transition-all",
                    platform === "android" ? "bg-background text-green-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setPlatform("android")}
                  title="Android"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  className={cn(
                    "p-1.5 rounded transition-all",
                    platform === "ios" ? "bg-background text-blue-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setPlatform("ios")}
                  title="iOS"
                >
                  <Apple className="w-4 h-4" />
                </button>
                <button
                  className={cn(
                    "p-1.5 rounded transition-all",
                    platform === "both" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setPlatform("both")}
                  title="Both"
                >
                  <MonitorSmartphone className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 relative bg-[#1E1E1E]">
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

          {/* Footer Bar */}
          <div className="h-16 border-t border-border bg-background/80 backdrop-blur flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileJson className="w-4 h-4" />
              <span>TypeScript Spec</span>
            </div>
            
            <div className="flex items-center gap-3">
              {generateMutation.isError && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/20">
                  <AlertCircle className="w-4 h-4" />
                  <span>{generateMutation.error?.error || "Generation failed"}</span>
                </div>
              )}
              {generateMutation.isSuccess && (
                <div className="flex items-center gap-2 text-green-500 text-sm bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Success</span>
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
                <span className="font-semibold">{generateMutation.isPending ? "Generating..." : "Generate Code"}</span>
              </Button>
            </div>
          </div>
        </main>

        {/* OUTPUT AREA */}
        <section className="w-[45%] flex flex-col bg-background z-0">
          {generatedFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4 border border-border/50 shadow-inner">
                <Code2 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No output generated</h3>
              <p className="text-sm max-w-[250px] leading-relaxed">
                Configure your spec on the left and click Generate to see the resulting C++, Java, and Objective-C code.
              </p>
            </div>
          ) : (
            <>
              {/* Output Tabs */}
              <div className="flex overflow-x-auto border-b border-border bg-card/50 hide-scrollbar pt-2 px-2 gap-1 shrink-0">
                {generatedFiles.map((file) => {
                  const isActive = activeFileTab === file.filename;
                  return (
                    <button
                      key={file.filename}
                      onClick={() => setActiveFileTab(file.filename)}
                      className={cn(
                        "px-4 py-2 text-xs font-mono rounded-t-lg transition-all relative flex items-center gap-2 border border-transparent border-b-0",
                        isActive 
                          ? "text-foreground bg-[#1E1E1E] border-border/50" 
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        file.platform === 'android' ? "bg-green-500" :
                        file.platform === 'ios' ? "bg-blue-500" : "bg-primary"
                      )} />
                      {file.filename}
                      {isActive && (
                        <motion.div 
                          layoutId="activeTabIndicator"
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Read-only Output Editor */}
              <div className="flex-1 relative bg-[#1E1E1E]">
                <Editor
                  key={activeFileTab} // Force remount to ensure language updates properly if needed
                  height="100%"
                  language={getMonacoLanguage(activeFileLanguage)}
                  theme="vs-dark"
                  value={activeFileContent}
                  options={{
                    readOnly: true,
                    minimap: { enabled: true, scale: 0.75 },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    lineHeight: 22,
                    padding: { top: 16, bottom: 16 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    renderLineHighlight: "none",
                  }}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
