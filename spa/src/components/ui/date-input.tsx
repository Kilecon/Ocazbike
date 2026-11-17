import { format, isValid, parse, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { enUS } from "react-day-picker/locale/en-US";
import { fr } from "react-day-picker/locale/fr";
import "react-day-picker/style.css";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { Input } from "./input";

const locales = { fr, en: enUS };

function localeFor(language: string) {
  return language.toLowerCase().startsWith("fr") ? locales.fr : locales.en;
}

function isoToDate(value: string): Date | undefined {
  const date = parseISO(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(date) ? date : undefined;
}

export function formatDateInput(value: string, language: string): string {
  const date = isoToDate(value);
  return date ? format(date, "P", { locale: localeFor(language) }) : "";
}

/** Parses a date typed in the language's short format (P) into YYYY-MM-DD. */
export function parseDateInput(text: string, language: string): string | null {
  const date = parse(text.trim(), "P", new Date(), {
    locale: localeFor(language),
  });
  return isValid(date) && date.getFullYear() >= 1000
    ? format(date, "yyyy-MM-dd")
    : null;
}

type DateInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

/** Date field localized with the browser language, unlike native date inputs. */
export function DateInput({ id, value, onChange, required }: DateInputProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const locale = localeFor(language);
  const calendarId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => formatDateInput(value, language));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setText((current) =>
      value && parseDateInput(current, language) === value
        ? current
        : formatDateInput(value, language),
    );
  }, [value, language]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        setOpen(false);
        inputRef.current?.focus();
      } else if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const placeholder = format(new Date(2006, 10, 22), "P", { locale })
    .replace("2006", t("datePlaceholderYear"))
    .replace("11", t("datePlaceholderMonth"))
    .replace("22", t("datePlaceholderDay"));

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          const parsed = parseDateInput(next, language);
          setText(next);
          event.target.setCustomValidity(
            next.trim() && !parsed
              ? t("invalidDate", { format: placeholder })
              : "",
          );
          if (!next.trim()) onChange("");
          else if (parsed) onChange(parsed);
        }}
        onBlur={() => {
          if (parseDateInput(text, language))
            setText(formatDateInput(value, language));
        }}
        required={required}
        className="pr-12"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0"
        aria-label={t("openCalendar")}
        aria-expanded={open}
        aria-controls={calendarId}
        onClick={() => setOpen(!open)}
      >
        <CalendarDays aria-hidden="true" className="size-4" />
      </Button>
      {open && (
        <div
          id={calendarId}
          role="dialog"
          aria-label={t("openCalendar")}
          className="date-input-calendar absolute left-0 z-50 mt-1 rounded-md border border-border bg-surface p-2 text-foreground shadow-lg"
        >
          <DayPicker
            mode="single"
            locale={locale}
            selected={isoToDate(value)}
            defaultMonth={isoToDate(value)}
            autoFocus
            onSelect={(date) => {
              if (!date) return;
              inputRef.current?.setCustomValidity("");
              onChange(format(date, "yyyy-MM-dd"));
              setText(formatDateInput(format(date, "yyyy-MM-dd"), language));
              setOpen(false);
              inputRef.current?.focus();
            }}
          />
        </div>
      )}
    </div>
  );
}
