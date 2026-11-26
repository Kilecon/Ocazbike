import { AlertTriangle, Info } from "lucide-react";

type TooltipType = "info" | "warn";

interface TooltipProps {
  readonly type: TooltipType;
  readonly message: string;
}

const tooltipStyles: Record<
  TooltipType,
  { icon: typeof Info; className: string }
> = {
  info: {
    icon: Info,
    className: "oz-badge-info",
  },
  warn: {
    icon: AlertTriangle,
    className: "oz-badge-warning",
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
