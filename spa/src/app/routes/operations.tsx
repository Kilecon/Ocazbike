import {
  getRouteApi,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { OperationDocumentPage } from "@/features/operations/OperationDocumentPage";
import {
  type OperationFilterState,
  operationFiltersFromSearch,
  operationFiltersToSearch,
} from "@/features/operations/OperationFilters";
import { OperationsPage } from "@/features/operations/OperationsPage";
import { OPERATION_SECTIONS } from "@/features/operations/sections";

const operationsRoute = getRouteApi("/admin/workspace/$section");
const operationDetailRoute = getRouteApi(
  "/admin/workspace/$section/$operationId",
);
const operationDocumentRoute = getRouteApi(
  "/admin/$section/$operationId/documents/$kind",
);

declare module "@tanstack/react-router" {
  interface HistoryState {
    fromOperationsList?: boolean;
  }
}

export function OperationsRoute() {
  const { section } = operationsRoute.useParams();
  const { status, tab, search } = operationsRoute.useSearch();
  const detail = operationDetailRoute.useMatch({ shouldThrow: false });
  const navigate = useNavigate();
  const router = useRouter();
  const filters = useMemo(
    () => operationFiltersFromSearch({ status, tab, search }),
    [status, tab, search],
  );
  const changeFilters = useCallback(
    (next: OperationFilterState) =>
      void navigate({
        to: ".",
        search: (previous) => ({
          ...previous,
          ...operationFiltersToSearch(next),
        }),
        replace: true,
        resetScroll: false,
      }),
    [navigate],
  );
  // A dialog opened from the list closes with a real "back" so the history
  // has no duplicate list entry and the list keeps its scroll position.
  const openedFromList = useRouterState({
    select: (state) => state.location.state.fromOperationsList === true,
  });
  const selectOperation = (operationId: number | null) => {
    if (operationId !== null) {
      void navigate({
        to: "/admin/$section/$operationId",
        params: { section, operationId },
        search: (previous) => previous,
        state: { fromOperationsList: true },
        resetScroll: false,
      });
    } else if (openedFromList) {
      router.history.back();
    } else {
      void navigate({
        to: "/admin/$section",
        params: { section },
        search: (previous) => previous,
        replace: true,
        resetScroll: false,
      });
    }
  };

  return (
    <OperationsPage
      key={section}
      type={OPERATION_SECTIONS[section]}
      filters={filters}
      onFiltersChange={changeFilters}
      selectedOperationId={detail?.params.operationId ?? null}
      onSelectOperation={selectOperation}
    />
  );
}

export function OperationDocumentRoute() {
  const { operationId, kind } = operationDocumentRoute.useParams();
  return (
    <OperationDocumentPage
      key={`${operationId}-${kind}`}
      operationId={operationId}
      kind={kind}
    />
  );
}
