import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PageLoader({
  label = "loading",
}: Readonly<{ label?: "loading" | "checkingSession" }>) {
  const { t } = useTranslation();
  return (
    <div
      aria-live="polite"
      className="grid min-h-screen place-items-center text-muted"
      role="status"
    >
      <span className="inline-flex items-center gap-2">
        <LoaderCircle
          aria-hidden="true"
          className="animate-spin"
          size="1.25rem"
        />
        {t(label)}
      </span>
    </div>
  );
}
