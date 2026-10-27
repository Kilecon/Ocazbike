import { useTranslation } from "react-i18next";
import { formatDateTime } from "../../../lib/date";
import type { ClientOperationDTO } from "../../../services/types";

export function ClientOperations({
  operations,
}: {
  operations: ClientOperationDTO[];
}) {
  const { t, i18n } = useTranslation();

  return (
    <section className="mx-auto mt-5 max-w-[77.5rem] rounded-md border border-border bg-surface">
      <header className="border-b border-border p-4">
        <h2 className="m-0 text-base font-bold text-foreground">
          {t("clientOperations")}
        </h2>
      </header>
      {operations.length ? (
        <ul className="m-0 grid list-none gap-3 p-4">
          {operations.map((operation) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              key={operation.id}
            >
              <span className="font-semibold text-foreground">
                {t(
                  operation.type === "repair"
                    ? "repairs"
                    : operation.type === "purchase"
                      ? "purchases"
                      : "sales",
                )}
              </span>
              <span className="text-sm text-muted">
                {t(`status_${operation.status}`, {
                  defaultValue: operation.status,
                })}
              </span>
              <time
                className="text-sm text-muted"
                dateTime={new Date(operation.date).toISOString()}
              >
                {formatDateTime(operation.date, i18n.language)}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-muted">
          {t("noClientOperations")}
        </p>
      )}
    </section>
  );
}
