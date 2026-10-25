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
import type { TranslationKey } from "../../i18n";
import { ApiError } from "../../services/api-client";

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
};

const ToastContext = createContext<ToastContextValue | null>(null);
const toastDuration = 8000;

const toastStyles: Record<
  ToastType,
  { icon: typeof CheckCircle2; color: string }
> = {
  success: {
    icon: CheckCircle2,
    color:
      "border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
  },
  info: {
    icon: Info,
    color:
      "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  },
  warning: {
    icon: AlertTriangle,
    color:
      "border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  },
  error: {
    icon: CircleX,
    color:
      "border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
  },
};

export function AdminToastProvider({ children }: { children: ReactNode }) {
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
      </section>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
  dismissLabel,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
  dismissLabel: string;
}) {
  const style = toastStyles[toast.type];
  const Icon = style.icon;

  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), toastDuration);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.id]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-md border-l-4 p-4 shadow-lg ${style.color}`}
      role={
        toast.type === "error" || toast.type === "warning" ? "alert" : "status"
      }
      aria-live={
        toast.type === "error" || toast.type === "warning"
          ? "assertive"
          : "polite"
      }
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="m-0 font-semibold">{toast.title}</p>
        <p className="mt-1 mb-0 break-words text-sm">{toast.message}</p>
      </div>
      <button
        className="grid size-7 shrink-0 place-items-center rounded hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
        type="button"
        aria-label={dismissLabel}
        onClick={() => onDismiss(toast.id)}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
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
