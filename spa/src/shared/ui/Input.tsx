import { type ComponentProps, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import errorDark from "../../../public/assets/input-error-dark.svg";
import errorLight from "../../../public/assets/input-error-light.svg";

function Input({
  className,
  containerClassName,
  type,
  error,
  onChange,
  onBlur,
  onInvalid,
  "aria-describedby": describedBy,
  ...props
}: ComponentProps<"input"> & { error?: string; containerClassName?: string }) {
  const { t } = useTranslation();
  const errorId = useId();
  const [nativeError, setNativeError] = useState("");
  const message =
    error ||
    (props.required === false && !String(props.value ?? "").trim()
      ? ""
      : nativeError);
  const validationMessage = (field: HTMLInputElement) => {
    if (field.validity.valueMissing) return t("requiredField");
    if (type === "tel" && field.validity.patternMismatch)
      return t("invalidPhone");
    return field.validationMessage;
  };

  return (
    <span className={cn("relative grid min-w-0 w-full", containerClassName)}>
      <input
        data-slot="input"
        type={type}
        className={cn(
          "oz-input flex w-full pl-2 pr-1 py-2 font-normal placeholder:text-muted",
          message && "pr-10",
          className,
        )}
        {...props}
        aria-invalid={message ? true : props["aria-invalid"]}
        aria-describedby={
          [describedBy, message ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onInvalid={(event) => {
          const field = event.currentTarget;
          setNativeError(validationMessage(field));
          if (field.validity.valueMissing) field.setCustomValidity("");
          onInvalid?.(event);
          event.preventDefault();
          if (
            field.form?.querySelector(
              "input:invalid, select:invalid, textarea:invalid",
            ) === field
          )
            field.focus();
        }}
        onChange={(event) => {
          onChange?.(event);
          if (nativeError)
            setNativeError(validationMessage(event.currentTarget));
        }}
        onBlur={(event) => {
          onBlur?.(event);
          if (event.currentTarget.value && !event.currentTarget.validity.valid)
            setNativeError(validationMessage(event.currentTarget));
        }}
      />
      {message && (
        <>
          <img
            src={errorLight}
            className="pointer-events-none absolute top-2.5 right-2.5 size-5 dark:hidden"
            alt=""
          />
          <img
            src={errorDark}
            className="pointer-events-none absolute top-2.5 right-2.5 hidden size-5 dark:block"
            alt=""
          />
          <span
            id={errorId}
            className="mt-1 text-right text-xs text-destructive"
            role="alert"
          >
            {message}
          </span>
        </>
      )}
    </span>
  );
}

export { Input };
