import { useTranslation } from "react-i18next";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import { Badge } from "../../../components/ui/badge";
import type { RepairDTO } from "../../../services/types";

export function ActiveRepairsList({
  repairs,
  loading,
}: {
  repairs: RepairDTO[];
  loading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <section
      className="mx-auto mb-[1.125rem] max-w-[77.5rem] rounded-md border border-border bg-surface p-5 max-[35rem]:p-[0.9375rem]"
      aria-labelledby="active-repairs-title"
    >
      <div className="mb-[0.875rem] flex items-center justify-between gap-3">
        <div>
          <h2
            className="m-0 text-[1.05rem] text-foreground"
            id="active-repairs-title"
          >
            {t("activeRepairs")}
          </h2>
          <p className="mt-1 mb-0 text-[0.82rem] text-muted">
            {t("activeRepairsDescription")}
          </p>
        </div>
        <Badge variant="secondary">{repairs.length}</Badge>
      </div>
      {loading ? (
        <p className="text-[0.8rem] text-muted" role="status">
          {t("loading")}
        </p>
      ) : repairs.length === 0 ? (
        <p className="text-[0.8rem] text-muted">{t("noActiveRepairs")}</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-[0.6875rem] [&_th]:text-[0.72rem] [&_th]:font-bold [&_th]:text-muted [&_td]:min-w-[8.125rem] [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-[0.8125rem] [&_td]:align-top [&_td]:text-[0.85rem] [&_td]:text-foreground [&_td:first-child]:min-w-[13.125rem] [&_td:first-child_strong]:block [&_td:first-child_span]:mt-1 [&_td:first-child_span]:block [&_td:first-child_span]:text-[0.76rem] [&_td:first-child_span]:text-muted [&_tbody_tr:last-child_td]:border-b-0 [&_td_strong]:block [&_td_strong]:font-semibold [&_td_span]:mt-1 [&_td_span]:block [&_td_span]:text-[0.76rem] [&_td_span]:text-muted">
            <thead>
              <tr>
                <th>{t("client")}</th>
                <th>{t("repairDescription")}</th>
                <th>{t("date")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((repair) => (
                <tr key={repair.id}>
                  <td>
                    <strong>
                      {repair.clientFirstname} {repair.clientLastname}
                    </strong>
                    <span>{repair.clientEmail}</span>
                    <span>{repair.clientPhoneNumber}</span>
                  </td>
                  <td>
                    <strong>{repair.description || t("notSpecified")}</strong>
                    {repair.comment && <span>{repair.comment}</span>}
                  </td>
                  <td>{repair.date}</td>
                  <td>
                    <StatusBadge status={repair.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
