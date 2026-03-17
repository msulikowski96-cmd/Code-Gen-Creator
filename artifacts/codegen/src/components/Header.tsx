import { Braces, Code2, Moon, Sun } from "lucide-react";

export function Header() {
  return (
    <header className="h-14 border-b border-border bg-background/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/20">
          <Code2 className="w-4 h-4 text-white" />
        </div>
        <h1 className="font-semibold text-sm tracking-wide text-foreground flex items-center gap-2">
          RN Codegen <span className="text-muted-foreground font-normal">Studio</span>
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
          <Braces className="w-3.5 h-3.5" />
          <span>v0.1.0</span>
        </div>
      </div>
    </header>
  );
}
