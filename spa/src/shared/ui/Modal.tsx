import { X } from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Button } from "./Button";

const modalWidths = {
  md: "w-[min(48rem,calc(100vw-2rem))]",
  lg: "w-[min(72.8125rem,calc(100vw-2rem))]",
  xl: "w-[min(106.1875rem,calc(100vw-2rem))]",
} as const;

/** Native modal `<dialog>`, opened as soon as it is mounted. */
export function Modal({
  ref,
  size = "md",
  scrollable = true,
  className,
  children,
  ...props
}: Readonly<
  Omit<ComponentProps<"dialog">, "ref" | "open"> & {
    ref?: Ref<HTMLDialogElement>;
    size?: keyof typeof modalWidths;
    /** Scroll the whole dialog; disable when a child manages its own scroll. */
    scrollable?: boolean;
  }
>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The handle is created after mount, once the dialog element exists.
  useImperativeHandle(ref, () => dialogRef.current as HTMLDialogElement, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "oz-card fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] max-w-none p-0 text-foreground shadow-xl backdrop:bg-black/50",
        modalWidths[size],
        scrollable ? "overflow-y-auto" : "overflow-hidden",
        className,
      )}
      {...props}
    >
      {children}
    </dialog>
  );
}

export function ModalHeader({
  titleId,
  title,
  subtitle,
  onClose,
  closeDisabled,
  className,
}: Readonly<{
  titleId: string;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  className?: string;
}>) {
  const { t } = useTranslation();
  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="oz-card-title m-0 text-foreground" id={titleId}>
          {title}
        </h2>
        {subtitle && <p className="mt-1 mb-0 text-sm text-muted">{subtitle}</p>}
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={t("modalClose")}
        disabled={closeDisabled}
        className="shrink-0"
        onClick={onClose}
      >
        <X size="1.125rem" aria-hidden="true" />
      </Button>
    </header>
  );
}
