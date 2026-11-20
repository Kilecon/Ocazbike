import { AlertTriangle, Info } from "lucide-react";

type TooltipType = "info" | "warn";

interface TooltipProps {
  type: TooltipType;
  message: string;
}

const tooltipStyles: Record<
  TooltipType,
  { icon: typeof Info; className: string }
> = {
  info: {
    icon: Info,
    className:
      "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  },
  warn: {
    icon: AlertTriangle,
    className:
      "border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  },
};

export function Tooltip({ type, message }: TooltipProps) {
  const { icon: Icon, className } = tooltipStyles[type];

  return (
    <aside
      className={`flex items-start gap-2 rounded-md border p-3 text-left text-xs leading-5 ${className}`}
      role="note"
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </aside>
  );
}
