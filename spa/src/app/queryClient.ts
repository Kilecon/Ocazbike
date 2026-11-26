import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Failures surface immediately as toasts, as before.
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}
