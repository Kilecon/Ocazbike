import { type KeyboardEvent, useRef } from "react";

export function StatusTabs<T extends string>({
  id,
  panelId,
  label,
  selected,
  onSelect,
  tabs,
  title,
}: Readonly<{
  id: string;
  panelId: string;
  label: string;
  selected: T;
  onSelect: (tab: T) => void;
  tabs: readonly { value: T; label: string; count?: number | null }[];
  title?: string;
}>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const next = tabs[nextIndex];
    if (next) {
      onSelect(next.value);
      refs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      className="mb-5 flex min-h-12 overflow-x-auto rounded-full border border-border bg-surface p-1"
      role="tablist"
      aria-label={label}
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.value}
          ref={(element) => {
            refs.current[index] = element;
          }}
          id={`${id}-${tab.value}`}
          role="tab"
          type="button"
          aria-selected={selected === tab.value}
          aria-controls={panelId}
          tabIndex={selected === tab.value ? 0 : -1}
          title={title}
          className={`min-h-10 min-w-fit flex-1 rounded-full px-4 text-sm text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-0.125rem] focus-visible:outline-focus ${selected === tab.value ? "oz-operation-tab-active font-bold" : "hover:bg-surface-muted"}`}
          onClick={() => onSelect(tab.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {tab.label}
          {tab.count !== undefined ? ` (${tab.count ?? "—"})` : null}
        </button>
      ))}
    </div>
  );
}
