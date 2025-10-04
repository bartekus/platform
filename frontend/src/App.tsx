import { LogtoProvider } from "@logto/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { Toaster } from "~/components/ui/toaster";
import { Toaster as Sonner } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";

import { router } from "~/router";
import { config } from "~/config/logto";

const queryClient = new QueryClient();

function InnerApp() {
  // const session = loadSession();
  return <RouterProvider router={router} /*context={{ session }}*/ />;
}

const App = () => (
  <LogtoProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InnerApp />
      </TooltipProvider>
    </QueryClientProvider>
  </LogtoProvider>
);

export default App;
