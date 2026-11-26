import { Info } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function TruncatedCellText({
  text,
  maxLength,
  displayLength = maxLength - 1,
  ellipsis = "…",
  tooltipLabel,
  className,
}: Readonly<{
  text: string;
  maxLength: number;
  displayLength?: number;
  ellipsis?: string;
  tooltipLabel: string;
  className?: string;
}>) {
  const displaySource = text.normalize("NFC").replace(/\s+/g, " ").trim();
  const characters = Array.from(displaySource);
  const isTruncated = characters.length > maxLength;
  const displayText = isTruncated
    ? `${characters.slice(0, displayLength).join("")}${ellipsis}`
    : displaySource;

  return (
    <span
      className={cn("grid justify-items-start gap-1", className)}
      title={displaySource}
    >
      <span>{displayText}</span>
      {isTruncated && (
        <span
          className="inline-flex items-center gap-1 text-xs font-normal text-muted underline decoration-dotted underline-offset-2 hover:text-foreground oz-focus-ring"
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
