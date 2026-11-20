import { useTranslation } from "react-i18next";
import { formatLocalDate } from "../../../lib/date";

export function RepairDates({
  createdAt,
  closedAt,
  language,
  servicePeriod = false,
}: {
  createdAt: number;
  closedAt: number | null;
  language: string;
  servicePeriod?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-1 text-sm">
      <span>
        {t(servicePeriod ? "serviceStartDate" : "repairCreatedDate")}:{" "}
        {formatLocalDate(createdAt, language)}
      </span>
      <span>
        {t(servicePeriod ? "serviceEndDate" : "repairClosedDate")}:{" "}
        {closedAt === null ? "—" : formatLocalDate(closedAt, language)}
      </span>
    </div>
  );
}
