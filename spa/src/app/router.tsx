import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  type RouterHistory,
  redirect,
} from "@tanstack/react-router";
import { SessionGate } from "@/features/auth/SessionGate";
import type { OperationSearch } from "@/features/operations/OperationFilters";
import {
  isOperationSection,
  type OperationSection,
} from "@/features/operations/sections";
import { parseSearch, stringifySearch } from "@/shared/lib/searchParams";
import { PageLoader } from "@/shared/ui/PageLoader";
import { AdminLayout } from "./layout/AdminLayout";
import { NotFoundPage } from "./NotFoundPage";
import { RequireAdmin } from "./RequireAdmin";

// Unknown or invalid admin URLs land on the repairs workspace.
function redirectToDefault(): never {
  throw redirect({
    to: "/admin/$section",
    params: { section: "repairs" },
    replace: true,
  });
}

function parseId(value: string): number {
  return /^\d+$/.test(value) ? Number(value) : Number.NaN;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "admin",
  component: () => (
    <SessionGate>
      <Outlet />
    </SessionGate>
  ),
});

const workspaceRoute = createRoute({
  getParentRoute: () => adminRoute,
  id: "workspace",
  component: AdminLayout,
});

const adminIndexRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/",
  beforeLoad: redirectToDefault,
});

const operationsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "$section",
  params: {
    parse: ({ section }) => ({ section: section as OperationSection }),
    stringify: ({ section }) => ({ section }),
  },
  validateSearch: (search: Record<string, unknown>): OperationSearch => ({
    status: optionalString(search.status),
    tab: optionalString(search.tab),
    search: optionalString(search.search),
  }),
  beforeLoad: ({ params }) => {
    if (!isOperationSection(params.section)) redirectToDefault();
  },
  component: lazyRouteComponent(
    () => import("./routes/operations"),
    "OperationsRoute",
  ),
});

// Opens the operation detail dialog over the operations list.
const operationDetailRoute = createRoute({
  getParentRoute: () => operationsRoute,
  path: "$operationId",
  params: {
    parse: ({ operationId }) => ({ operationId: parseId(operationId) }),
    stringify: ({ operationId }) => ({ operationId: String(operationId) }),
  },
  beforeLoad: ({ params }) => {
    if (Number.isNaN(params.operationId)) redirectToDefault();
  },
});

const clientsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "clients",
  component: lazyRouteComponent(
    () => import("@/features/clients/Client360Page"),
    "Client360Page",
  ),
});

const newClientRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "clients/new",
  component: lazyRouteComponent(
    () => import("./routes/clients"),
    "NewClientRoute",
  ),
});

const clientDetailRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "clients/$clientId",
  params: {
    parse: ({ clientId }) => ({ clientId: parseId(clientId) }),
    stringify: ({ clientId }) => ({ clientId: String(clientId) }),
  },
  beforeLoad: ({ params }) => {
    if (Number.isNaN(params.clientId)) redirectToDefault();
  },
  component: lazyRouteComponent(
    () => import("./routes/clients"),
    "ClientDetailRoute",
  ),
});

const supportRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "support",
  component: lazyRouteComponent(
    () => import("@/features/support/SupportPage"),
    "SupportPage",
  ),
});

const adminOnlyRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  id: "admin-only",
  component: () => (
    <RequireAdmin>
      <Outlet />
    </RequireAdmin>
  ),
});

const usersRoute = createRoute({
  getParentRoute: () => adminOnlyRoute,
  path: "users",
  component: lazyRouteComponent(
    () => import("@/features/users/UsersPage"),
    "UsersPage",
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => adminOnlyRoute,
  path: "settings",
  component: lazyRouteComponent(
    () => import("@/features/settings/SettingsPage"),
    "SettingsPage",
  ),
});

const workspaceFallbackRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "$",
  beforeLoad: redirectToDefault,
});

// Printable documents open in a new tab, outside the workspace layout.
const operationDocumentRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "$section/$operationId/documents/$kind",
  params: {
    parse: ({ section, operationId, kind }) => ({
      section: section as OperationSection,
      operationId: parseId(operationId),
      kind: kind as "quote" | "invoice",
    }),
    stringify: ({ section, operationId, kind }) => ({
      section,
      operationId: String(operationId),
      kind,
    }),
  },
  beforeLoad: ({ params }) => {
    if (
      !isOperationSection(params.section) ||
      Number.isNaN(params.operationId) ||
      (params.kind !== "quote" && params.kind !== "invoice")
    )
      redirectToDefault();
  },
  component: lazyRouteComponent(
    () => import("./routes/operations"),
    "OperationDocumentRoute",
  ),
});

const routeTree = rootRoute.addChildren([
  adminRoute.addChildren([
    workspaceRoute.addChildren([
      adminIndexRoute,
      operationsRoute.addChildren([operationDetailRoute]),
      clientsRoute,
      newClientRoute,
      clientDetailRoute,
      supportRoute,
      adminOnlyRoute.addChildren([usersRoute, settingsRoute]),
      workspaceFallbackRoute,
    ]),
    operationDocumentRoute,
  ]),
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    parseSearch,
    stringifySearch,
    defaultPreload: "intent",
    defaultPendingComponent: PageLoader,
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
