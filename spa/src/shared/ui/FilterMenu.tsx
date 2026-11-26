import { Funnel } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/cn";

const MENU_WIDTH_REM = 11.875;

/** Places the menu under its trigger while keeping it inside the viewport. */
export function filterMenuPosition(
  bounds: { left: number; bottom: number },
  viewport: { width: number; height: number },
  rootFontSize = 16,
): CSSProperties {
  const margin = 0.5;
  const viewportWidth = viewport.width / rootFontSize;
  const viewportHeight = viewport.height / rootFontSize;
  const width = Math.min(
    MENU_WIDTH_REM,
    Math.max(0, viewportWidth - margin * 2),
  );
  const top = Math.max(
    margin,
    Math.min(bounds.bottom / rootFontSize + margin, viewportHeight - 7.5),
  );
  return {
    width: `${width}rem`,
    left: `${Math.max(
      margin,
      Math.min(bounds.left / rootFontSize, viewportWidth - width - margin),
    )}rem`,
    top: `${top}rem`,
    maxHeight: `${Math.max(0, viewportHeight - top - margin)}rem`,
  };
}

function useMenuPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const updatePosition = () => {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (bounds)
        setPosition(
          filterMenuPosition(
            bounds,
            { width: window.innerWidth, height: window.innerHeight },
            Number.parseFloat(
              window.getComputedStyle(document.documentElement).fontSize,
            ),
          ),
        );
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, triggerRef]);
  return position;
}

function useDismiss(
  open: boolean,
  close: () => void,
  triggerRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        close();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, close, triggerRef, menuRef]);
}

/** Funnel button opening a floating menu, as used in grid column headers. */
export function FilterMenu({
  label,
  menuLabel = label,
  active,
  children,
}: Readonly<{
  /** Accessible name of the trigger, describing the current filter. */
  label: string;
  menuLabel?: string;
  active: boolean;
  children: (close: () => void) => ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const position = useMenuPosition(open, triggerRef);
  useDismiss(open, close, triggerRef, menuRef);

  return (
    <div className="relative flex w-fit items-center gap-2" ref={triggerRef}>
      <button
        className={cn(
          "relative grid size-8 place-items-center rounded-[0.3125rem] text-foreground transition-colors hover:bg-surface-muted oz-focus-ring",
          open && "bg-surface-muted",
        )}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Funnel
          className={cn("size-4", active && "fill-current")}
          aria-hidden="true"
        />
        {active && (
          <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary ring-2 ring-surface" />
        )}
      </button>
      {open &&
        position &&
        createPortal(
          <FilterMenuList ref={menuRef} label={menuLabel} position={position}>
            {children(close)}
          </FilterMenuList>,
          document.body,
        )}
    </div>
  );
}

export function FilterMenuList({
  ref,
  label,
  position,
  children,
}: Readonly<{
  ref?: Ref<HTMLDivElement>;
  label: string;
  position?: CSSProperties;
  children: ReactNode;
}>) {
  return (
    <div
      ref={ref}
      style={position}
      className="fixed z-50 grid overflow-y-auto overscroll-contain gap-1 rounded-md border border-border bg-surface p-1.5 text-foreground shadow-lg"
      role="menu"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function FilterMenuItem({
  checked,
  multiple = false,
  onSelect,
  children,
}: Readonly<{
  checked: boolean;
  /** Checkbox items toggle independently; radio items pick a single value. */
  multiple?: boolean;
  onSelect: () => void;
  children: ReactNode;
}>) {
  const className =
    "flex min-h-10 items-center gap-2 rounded px-2 text-left text-sm font-normal hover:bg-surface-muted";
  const content = (
    <>
      {checked ? (
        <Funnel className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <span className="size-4 shrink-0" />
      )}
      {children}
    </>
  );
  return multiple ? (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      className={className}
      onClick={onSelect}
    >
      {content}
    </button>
  ) : (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      className={className}
      onClick={onSelect}
    >
      {content}
    </button>
  );
}
