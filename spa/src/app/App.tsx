import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { followSystemTheme } from "@/shared/theme/theme";
import { AdminToastProvider } from "@/shared/ui/AdminToast";
import type { createAppRouter } from "./router";

export function App({
  router,
  queryClient,
}: Readonly<{
  router: ReturnType<typeof createAppRouter>;
  queryClient: QueryClient;
}>) {
  useEffect(() => followSystemTheme(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <AdminToastProvider>
        <RouterProvider router={router} />
      </AdminToastProvider>
    </QueryClientProvider>
  );
}
