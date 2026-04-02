import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { InsufficientTokensError } from "@/utils/apiClient";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: {
      onError: (err) => {
        if (err instanceof InsufficientTokensError) {
          toast.error(
            `Not enough tokens (need ${err.required}, have ${err.balance})`,
            {
              action: {
                label: "Buy tokens",
                onClick: () => (window.location.href = "/billing"),
              },
            },
          );
        }
      },
    },
  },
});

function AuthBootstrap({ children }: PropsWithChildren) {
  useEffect(() => {
    void useAuthStore.getState().initialize();
  }, []);
  return children;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#0d0d1a",
              border: "1px solid #1e1e3a",
              color: "#e2e8f0",
            },
          }}
        />
      </AuthBootstrap>
    </QueryClientProvider>
  );
}
