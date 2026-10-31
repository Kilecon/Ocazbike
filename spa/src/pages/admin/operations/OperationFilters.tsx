import { Funnel } from "lucide-react";
import {
  type CSSProperties,
  type Ref,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { BillingDocumentStatus } from "../../../services/types";

export const OPERATION_FILTER_STATUSES: BillingDocumentStatus[] = [
  "pending",
  "in_progress",
  "payment_pending",
  "paid",
  "cancelled",
  "completed",
];
export const DEFAULT_OPERATION_STATUSES: BillingDocumentStatus[] = [
  "pending",
  "in_progress",
  "payment_pending",
];

export function operationMenuPosition(
  bounds: { left: number; bottom: number },
  viewport: { width: number; height: number },
): CSSProperties {
  const margin = 8;
  const width = Math.min(190, Math.max(0, viewport.width - margin * 2));
  const top = Math.max(
    margin,
    Math.min(bounds.bottom + margin, viewport.height - 120),
  );
  return {
    width,
    left: Math.max(
      margin,
      Math.min(bounds.left, viewport.width - width - margin),
    ),
    top,
    maxHeight: Math.max(0, viewport.height - top - margin),
  };
}

export function operationFiltersFromQuery(query: string) {
  const params = new URLSearchParams(query);
  const status = params.get("status");
  return {
    statuses:
      status === null
        ? [...DEFAULT_OPERATION_STATUSES]
        : OPERATION_FILTER_STATUSES.filter((value) =>
            status.split(",").includes(value),
          ),
    search: params.get("search") ?? "",
  };
}

export function OperationFilters({
  statuses,
  onStatusesChange,
}: {
  statuses: BillingDocumentStatus[];
  onStatusesChange: (statuses: BillingDocumentStatus[]) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const bounds = filterRef.current?.getBoundingClientRect();
      if (bounds)
        setPosition(
          operationMenuPosition(bounds, {
            width: window.innerWidth,
            height: window.innerHeight,
          }),
        );
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !filterRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      )
        setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  return (
    <div className="relative flex w-fit items-center gap-2" ref={filterRef}>
      <button
        className={`relative grid size-8 place-items-center rounded-[0.3125rem] text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${open ? "bg-surface-muted" : ""}`}
        type="button"
        aria-label={`${t("usersFilter")}: ${statuses.length ? statuses.map((status) => t(`status_${status}`)).join(", ") : t("usersFilterAll")}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Funnel
          className={`size-4 ${statuses.length ? "fill-current" : ""}`}
          aria-hidden="true"
        />
        {statuses.length > 0 ? (
          <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary ring-2 ring-surface" />
        ) : null}
      </button>
      {open && position
        ? createPortal(
            <OperationStatusMenu
              statuses={statuses}
              onStatusesChange={onStatusesChange}
              position={position}
              menuRef={menuRef}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

export function OperationStatusMenu({
  statuses,
  onStatusesChange,
  position,
  menuRef,
}: {
  statuses: BillingDocumentStatus[];
  onStatusesChange: (statuses: BillingDocumentStatus[]) => void;
  position?: CSSProperties;
  menuRef?: Ref<HTMLDivElement>;
}) {
  const { t } = useTranslation();
  return (
    <div
      ref={menuRef}
      style={position}
      className="fixed z-50 grid overflow-y-auto overscroll-contain gap-1 rounded-md border border-border bg-surface p-1.5 text-foreground shadow-lg"
      role="menu"
      aria-label={t("usersFilter")}
    >
      {[null, ...OPERATION_FILTER_STATUSES].map((status) => {
        const selected =
          status === null ? statuses.length === 0 : statuses.includes(status);
        return (
          <button
            key={status ?? "all"}
            type="button"
            role="menuitemcheckbox"
            aria-checked={selected}
            className="flex min-h-10 items-center gap-2 rounded px-2 text-left text-sm font-normal hover:bg-surface-muted"
            onClick={() =>
              onStatusesChange(
                status === null
                  ? []
                  : selected
                    ? statuses.filter((value) => value !== status)
                    : [...statuses, status],
              )
            }
          >
            {selected ? (
              <Funnel className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <span className="size-4 shrink-0" />
            )}
            {status === null ? t("usersFilterAll") : t(`status_${status}`)}
          </button>
        );
      })}
    </div>
  );
}
