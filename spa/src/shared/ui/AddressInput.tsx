import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ADDRESS_SEARCH_DEBOUNCE_MS,
  type AddressSuggestion,
  buildAddressSearchUrl,
  searchAddresses,
} from "@/shared/lib/addressSearch";
import { cn } from "@/shared/lib/cn";
import { Input } from "./Input";

export function formatAddressSuggestion(
  suggestion: AddressSuggestion,
  multiline: boolean,
) {
  if (!multiline) return suggestion.label;
  const locality = [suggestion.postcode, suggestion.city]
    .filter(Boolean)
    .join(" ");
  return [suggestion.name, locality].filter(Boolean).join("\n");
}

export function AddressInput({
  id,
  value,
  onChange,
  multiline = false,
  className,
  maxLength,
  required,
  disabled,
}: Readonly<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  className?: string;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
}>) {
  const { t } = useTranslation();
  const listboxId = useId();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  // Only search after user typing, never for the initial or a selected value.
  const typedRef = useRef(false);

  useEffect(() => {
    if (!typedRef.current || !buildAddressSearchUrl(value)) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      searchAddresses(value, controller.signal)
        .then((results) => {
          setSuggestions(results);
          setActiveIndex(-1);
          setOpen(results.length > 0);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        });
    }, ADDRESS_SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  const change = (nextValue: string) => {
    typedRef.current = true;
    onChange(nextValue);
  };

  const select = (suggestion: AddressSuggestion) => {
    typedRef.current = false;
    setOpen(false);
    setSuggestions([]);
    onChange(formatAddressSuggestion(suggestion, multiline));
  };

  const expanded = open && suggestions.length > 0;

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (!expanded) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(
        (current) => (current + step + suggestions.length) % suggestions.length,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const suggestion = suggestions[activeIndex];
      if (suggestion) select(suggestion);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  const comboboxProps = {
    id,
    value,
    maxLength,
    required,
    disabled,
    role: "combobox",
    autoComplete: "off",
    "aria-autocomplete": "list" as const,
    "aria-expanded": expanded,
    "aria-controls": listboxId,
    "aria-activedescendant":
      expanded && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined,
    onKeyDown: handleKeyDown,
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  };

  return (
    <div className="relative min-w-0 font-normal">
      {multiline ? (
        <textarea
          {...comboboxProps}
          className={cn(
            "oz-input min-h-20 w-full px-3 py-2.5 text-foreground",
            className,
          )}
          onChange={(event) => change(event.target.value)}
        />
      ) : (
        <Input
          {...comboboxProps}
          className={className}
          onChange={(event) => change(event.target.value)}
        />
      )}
      {expanded && (
        <div
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-surface p-1 shadow-lg"
          id={listboxId}
          role="listbox"
          aria-label={t("addressSuggestions")}
        >
          {suggestions.map((suggestion, index) => (
            <div
              className={cn(
                "cursor-pointer rounded px-3 py-2 text-sm text-foreground",
                index === activeIndex && "bg-primary/10",
              )}
              id={`${listboxId}-${index}`}
              key={suggestion.id}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(suggestion)}
              tabIndex={-1}
              onKeyDown={() => {}}
            >
              {suggestion.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
