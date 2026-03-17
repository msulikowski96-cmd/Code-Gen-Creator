import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Studio from "@/pages/Studio";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Studio} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Use the exact match to remove a trailing slash safely for standard environments.
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
