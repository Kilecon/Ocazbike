import { AlertTriangle, CheckCircle2, CircleX, Info, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/api/http";
import type { TranslationKey } from "@/shared/i18n/i18n";

type ToastType = "success" | "info" | "warning" | "error";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message: string) => void;
}

const apiErrorTranslationKeys: Record<string, TranslationKey> = {
  InvalidCreds: "InvalidCreds",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_AUTH_TOKEN: "INVALID_AUTH_TOKEN",
  BAD_REQUEST: "BAD_REQUEST",
  FORBIDDEN_APP: "FORBIDDEN_APP",
  FORBIDDEN: "FORBIDDEN",
  PASSWORD_CHANGE_REQUIRED: "PASSWORD_CHANGE_REQUIRED",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_ALREADY_ACTIVATED: "USER_ALREADY_ACTIVATED",
  USER_ALREADY_DEACTIVATED: "USER_ALREADY_DEACTIVATED",
  INVALID_CURRENT_PASSWORD: "INVALID_CURRENT_PASSWORD",
  INVALID_PASSWORD: "INVALID_PASSWORD",
  INVALID_EMAIL: "INVALID_EMAIL",
  INVALID_USER_DATA: "INVALID_USER_DATA",
  INVALID_ROLE: "INVALID_ROLE",
  TOO_MANY_ATTEMPTS: "TOO_MANY_ATTEMPTS",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  INVALID_UTF8: "INVALID_UTF8",
  INVALID_JSON: "INVALID_JSON",
  EMAIL_ALREADY_SENT_TODAY: "emailErrorAlreadySentToday",
  CLIENT_EMAIL_MISSING: "emailErrorClientEmailMissing",
  EMAIL_NOT_CONFIGURED: "emailErrorNotConfigured",
  EMAIL_DELIVERY_FAILED: "emailErrorDeliveryFailed",
  DOCUMENT_NOT_FOUND: "emailErrorDocumentNotFound",
};

const ToastContext = createContext<ToastContextValue | null>(null);
const toastDuration = 8000;

const toastStyles: Record<
  ToastType,
  { icon: typeof CheckCircle2; color: string }
> = {
  success: { icon: CheckCircle2, color: "oz-toast-success" },
  info: { icon: Info, color: "oz-toast-info" },
  warning: { icon: AlertTriangle, color: "oz-toast-warning" },
  error: { icon: CircleX, color: "oz-toast-error" },
};

export function AdminToastProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback(
    (type: ToastType, title: string, message: string) => {
      const id = nextId.current + 1;
      nextId.current = id;
      setToasts((current) => [...current, { id, type, title, message }]);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(26.25rem,calc(100vw-2rem))] flex-col gap-3"
        aria-label={t("toastNotifications")}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            dismissLabel={t("toastDismiss")}
          />
        ))}
        {process.env.NODE_ENV !== "production" &&
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("toastPreview") ===
            "1" && <ToastPreview dismissLabel={t("toastDismiss")} />}
      </section>
    </ToastContext.Provider>
  );
}

const previewTypes: ToastType[] = ["success", "info", "warning", "error"];

function ToastPreview({ dismissLabel }: Readonly<{ dismissLabel: string }>) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % previewTypes.length);
      setVisible(true);
    }, toastDuration + 250);
    return () => window.clearInterval(timer);
  }, []);

  const type = previewTypes[index];
  if (!visible || !type) return null;
  const titles: Record<ToastType, TranslationKey> = {
    success: "toastSuccess",
    info: "toastInfo",
    warning: "toastWarning",
    error: "toastError",
  };
  return (
    <ToastItem
      key={index}
      toast={{
        id: index,
        type,
        title: t(titles[type]),
        message: t("toastPreviewMessage"),
      }}
      onDismiss={() => setVisible(false)}
      dismissLabel={dismissLabel}
    />
  );
}

export function ToastItem({
  toast,
  onDismiss,
  dismissLabel,
}: Readonly<{
  toast: Toast;
  onDismiss: (id: number) => void;
  dismissLabel: string;
}>) {
  const style = toastStyles[toast.type];
  const Icon = style.icon;

  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), toastDuration);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.id]);

  return (
    <output
      className={`pointer-events-auto flex items-start gap-3 rounded-md border-l-4 p-4 shadow-lg ${style.color}`}
      role={
        toast.type === "error" || toast.type === "warning" ? "alert" : undefined
      }
      aria-live={
        toast.type === "error" || toast.type === "warning"
          ? "assertive"
          : "polite"
      }
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{toast.title}</span>
        <span className="mt-1 block break-words text-sm">{toast.message}</span>
      </span>
      <button
        className="grid size-7 shrink-0 place-items-center rounded hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
        type="button"
        aria-label={dismissLabel}
        onClick={() => onDismiss(toast.id)}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </output>
  );
}

export function useAdminToast() {
  const context = useContext(ToastContext);
  const { t } = useTranslation();
  if (!context) {
    throw new Error("useAdminToast must be used within AdminToastProvider");
  }

  const showErrorToast = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const translationKey =
        error instanceof ApiError && error.code
          ? apiErrorTranslationKeys[error.code]
          : undefined;
      context.showToast(
        "error",
        t("toastError"),
        translationKey ? t(translationKey) : fallbackMessage,
      );
    },
    [context, t],
  );

  return { ...context, showErrorToast };
}
