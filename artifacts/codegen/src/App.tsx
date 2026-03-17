import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "@/pages/Home";
import Workspace from "@/pages/Chat";
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
      <Route path="/" component={Home} />
      <Route path="/workspace" component={Workspace} />
      <Route path="/studio" component={Studio} />
      <Route path="/chat">
        <Redirect to="/workspace" />
      </Route>
      <Route component={NotFound} />
    </Switch>
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
