import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  createBrowserHistory,
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
  type RouterHistory,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { parseSearch, stringifySearch } from "@/shared/lib/searchParams";

// Deliver query updates as microtasks so they settle inside React's act().
notifyManager.setScheduler(queueMicrotask);

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
}

/** Router context for components rendered outside the app route tree. */
export function createTestRouter(history: RouterHistory) {
  return createRouter({
    routeTree: createRootRoute(),
    history,
    parseSearch,
    stringifySearch,
  });
}

export function TestProviders({
  children,
  queryClient,
  router,
}: Readonly<{
  children: ReactNode;
  queryClient: QueryClient;
  router: ReturnType<typeof createTestRouter>;
}>) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterContextProvider router={router}>{children}</RouterContextProvider>
    </QueryClientProvider>
  );
}

export function createTestContext(path?: string) {
  return {
    queryClient: createTestQueryClient(),
    router: createTestRouter(
      path
        ? createMemoryHistory({ initialEntries: [path] })
        : createBrowserHistory(),
    ),
  };
}
