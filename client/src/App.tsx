import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { Route, Switch } from 'wouter';
import { trpc } from './lib/trpc';
import Chat from './pages/Chat';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profiel';
import History from './pages/Geschiedenis';
import Actions from './pages/Actions';

function NotFound() {
  return <div style={{padding:'2rem',textAlign:'center'}}><h1>404 - Pagina niet gevonden</h1></div>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Onboarding} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/chat" component={Chat} />
      <Route path="/chat/:conversationId" component={Chat} />
      <Route path="/history" component={History} />
      <Route path="/actions" component={Actions} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        retry: 1,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background text-foreground">
          <AppRoutes />
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
