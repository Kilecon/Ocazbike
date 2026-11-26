import { X } from "lucide-react";

interface TagProps {
  readonly label: string;
  readonly removeLabel: string;
  readonly onRemove: () => void;
}

export function Tag({ label, removeLabel, onRemove }: TagProps) {
  return (
    <button
      className="oz-tag inline-flex min-h-8 max-w-full items-center overflow-hidden rounded-full border border-control-border bg-surface-muted p-0 text-left text-base font-normal text-foreground transition-colors hover:bg-surface oz-focus-ring"
      type="button"
      aria-label={removeLabel}
      onClick={onRemove}
    >
      <span className="truncate px-2.5 py-1">{label}</span>
      <span className="grid h-7 w-7 shrink-0 place-items-center border-l border-control-border">
        <X className="size-4" aria-hidden="true" />
      </span>
    </button>
  );
}
