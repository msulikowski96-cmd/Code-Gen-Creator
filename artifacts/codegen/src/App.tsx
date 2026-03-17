import { Switch, Route, Router as WouterRouter, Link, useRoute } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Studio from "@/pages/Studio";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";
import { Code2, MessageSquare, Braces } from "lucide-react";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function NavTab({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const [isActive] = useRoute(to === "/" ? "/" : `${to}*`);
  return (
    <Link
      href={to}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        isActive
          ? "bg-primary/15 text-primary border border-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

function AppHeader() {
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

      <nav className="flex items-center gap-1">
        <NavTab to="/" icon={Code2} label="Studio" />
        <NavTab to="/chat" icon={MessageSquare} label="AI Chat" />
      </nav>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
          <Braces className="w-3.5 h-3.5" />
          <span>v0.2.0</span>
        </div>
      </div>
    </header>
  );
}

function Router() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <Switch>
        <Route path="/" component={Studio} />
        <Route path="/chat" component={Chat} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={baseUrl}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
