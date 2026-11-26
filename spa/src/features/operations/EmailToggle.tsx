import { useTranslation } from "react-i18next";

export function EmailToggle({
  id,
  label,
  checked,
  disabled,
  missingEmail,
  onChange,
  variant = "checkbox",
}: Readonly<{
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  missingEmail: boolean;
  onChange: (checked: boolean) => void;
  variant?: "checkbox" | "switch";
}>) {
  const { t } = useTranslation();
  const hintId = `${id}-hint`;
  return (
    <div className="grid gap-1">
      <label
        className={
          variant === "switch"
            ? "flex items-center gap-4 text-base font-normal text-foreground"
            : "flex items-center gap-2 text-sm font-semibold text-foreground"
        }
        htmlFor={id}
      >
        <input
          id={id}
          type="checkbox"
          className={
            variant === "switch" ? "oz-quote-switch" : "size-4 accent-primary"
          }
          role={variant === "switch" ? "switch" : undefined}
          aria-checked={variant === "switch" ? checked : undefined}
          checked={checked}
          disabled={disabled || missingEmail}
          aria-describedby={missingEmail ? hintId : undefined}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </label>
      {missingEmail && (
        <p id={hintId} className="m-0 text-xs text-muted">
          {t("clientEmailMissingHint")}
        </p>
      )}
    </div>
  );
}
