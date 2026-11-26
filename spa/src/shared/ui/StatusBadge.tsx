import { useTranslation } from "react-i18next";
import { Badge } from "./Badge";

const statusColors: Record<
  string,
  "draft" | "info" | "warning" | "error" | "success"
> = {
  pending: "warning",
  cancelled: "error",
  rejected: "error",
  accepted: "success",
  in_progress: "info",
  completed: "success",
  closed: "success",
  payment_pending: "warning",
  paid: "success",
};

export function StatusBadge({ status }: Readonly<{ status: string }>) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="secondary"
      color={statusColors[status] ?? "draft"}
      className="whitespace-nowrap"
    >
      {t(`status_${status}`, { defaultValue: status })}
    </Badge>
  );
}
