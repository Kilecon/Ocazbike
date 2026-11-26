import { format, isValid, parse, parseISO } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  type ChevronProps,
  DayPicker,
  type DropdownProps,
} from "react-day-picker";
import { enUS } from "react-day-picker/locale/en-US";
import { fr } from "react-day-picker/locale/fr";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { Input } from "./Input";

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

type DateInputProps = Readonly<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  showCalendar?: boolean;
  onFocus?: () => void;
}>;

function CalendarDropdown({
  options,
  className: _className,
  ...props
}: DropdownProps) {
  return (
    <span className="relative inline-flex min-w-0 items-center">
      <select {...props} className="oz-calendar-select">
        {options?.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-1 size-5"
        aria-hidden="true"
      />
    </span>
  );
}

function CalendarChevron({ orientation }: ChevronProps) {
  const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
  return <Icon className="size-5" aria-hidden="true" />;
}

export function DatePicker({
  value,
  onChange,
  autoFocus = false,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}>) {
  const { i18n } = useTranslation();
  const [month, setMonth] = useState(() => isoToDate(value) ?? new Date());
  const currentYear = new Date().getFullYear();
  const selectedYear = isoToDate(value)?.getFullYear() ?? currentYear;
  useEffect(() => {
    const selected = isoToDate(value);
    if (selected) setMonth(selected);
  }, [value]);

  return (
    <DayPicker
      className="oz-date-picker"
      mode="single"
      required
      locale={localeFor(i18n.language)}
      weekStartsOn={1}
      formatters={{
        formatWeekdayName: (date) =>
          format(date, "EEE", { locale: localeFor(i18n.language) }).replace(
            /\.$/,
            "",
          ),
      }}
      captionLayout="dropdown"
      navLayout="after"
      startMonth={new Date(Math.min(currentYear - 100, selectedYear), 0)}
      endMonth={new Date(Math.max(currentYear + 100, selectedYear), 11)}
      month={month}
      onMonthChange={setMonth}
      selected={isoToDate(value)}
      autoFocus={autoFocus}
      components={{ Dropdown: CalendarDropdown, Chevron: CalendarChevron }}
      onSelect={(date) => {
        if (date) onChange(format(date, "yyyy-MM-dd"));
      }}
    />
  );
}

/** Date field localized with the browser language, unlike native date inputs. */
export function DateInput({
  id,
  value,
  onChange,
  required,
  error,
  showCalendar = true,
  onFocus,
}: DateInputProps) {
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
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        inputRef.current?.focus();
      } else if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close, true);
    };
  }, [open]);

  const placeholder = format(new Date(2006, 10, 22), "P", { locale })
    .replace("2006", t("datePlaceholderYear"))
    .replace("11", t("datePlaceholderMonth"))
    .replace("22", t("datePlaceholderDay"));
  const validateText = (field: HTMLInputElement) => {
    const parsed = parseDateInput(field.value, language);
    field.setCustomValidity(
      field.value.trim() && !parsed
        ? t("invalidDate", { format: placeholder })
        : "",
    );
    return parsed;
  };

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
        onFocus={onFocus}
        onChange={(event) => {
          const next = event.target.value;
          const parsed = validateText(event.currentTarget);
          setText(next);
          if (!next.trim()) onChange("");
          else if (parsed) onChange(parsed);
        }}
        onBlur={(event) => {
          const parsed = validateText(event.currentTarget);
          if (parsed) setText(formatDateInput(parsed, language));
        }}
        required={required}
        error={error}
        className={showCalendar ? "pr-12" : undefined}
        containerClassName={showCalendar ? "[&_img]:right-12" : undefined}
      />
      {showCalendar && (
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
      )}
      {showCalendar && open && (
        <dialog
          open
          id={calendarId}
          aria-label={t("openCalendar")}
          className="absolute left-0 z-50 m-0 mt-1 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-surface p-0 text-foreground shadow-lg"
        >
          <DatePicker
            value={value}
            autoFocus
            onChange={(next) => {
              inputRef.current?.setCustomValidity("");
              onChange(next);
              setText(formatDateInput(next, language));
              setOpen(false);
              inputRef.current?.focus();
            }}
          />
        </dialog>
      )}
    </div>
  );
}
