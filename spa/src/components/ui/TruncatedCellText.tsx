import { Info } from "lucide-react";

export function TruncatedCellText({
  text,
  maxLength,
  displayLength = maxLength - 1,
  ellipsis = "…",
  tooltipLabel,
}: {
  text: string;
  maxLength: number;
  displayLength?: number;
  ellipsis?: string;
  tooltipLabel: string;
}) {
  const displaySource = text.normalize("NFC").replace(/\s+/g, " ").trim();
  const characters = Array.from(displaySource);
  const isTruncated = characters.length > maxLength;
  const displayText = isTruncated
    ? `${characters.slice(0, displayLength).join("")}${ellipsis}`
    : displaySource;

  return (
    <span className="grid justify-items-start gap-1">
      <span>{displayText}</span>
      {isTruncated && (
        <span
          className="inline-flex items-center gap-1 text-xs font-normal text-muted underline decoration-dotted underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          role="note"
          aria-label={`${tooltipLabel}: ${displaySource}`}
          title={displaySource}
        >
          <Info className="size-3.5" aria-hidden="true" />
          {tooltipLabel}
        </span>
      )}
    </span>
  );
}
