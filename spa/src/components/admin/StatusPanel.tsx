import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getOpeningStatus } from "../../services/opening-hours.api";
import type { OpeningStatusDTO } from "../../services/types";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function StatusPanel() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<OpeningStatusDTO | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void getOpeningStatus()
      .then(setStatus)
      .catch(() => setFailed(true));
  }, []);

  return (
    <Card asChild className="min-h-[190px]">
      <article>
        <CardHeader className="min-h-[68px] flex-row items-center justify-between px-5 pt-5 pb-3">
          <CardTitle>{t("adminTodayStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pt-0 pb-5">
          <div
            className="flex min-h-12 items-center gap-3 text-primary"
            role="status"
            aria-live="polite"
          >
            <Clock3 size={24} aria-hidden="true" />
            <Badge
              variant={
                status?.isOpen ? "default" : status ? "secondary" : "outline"
              }
            >
              {status
                ? status.isOpen
                  ? t("adminOpen")
                  : t("adminClosed")
                : failed
                  ? t("adminStatusUnavailable")
                  : t("loading")}
            </Badge>
          </div>
          <p className="mt-3 mb-0 text-sm text-muted">
            {status?.nextClosing
              ? `${t("adminClosesAt")} ${new Date(status.nextClosing).toLocaleTimeString()}`
              : status?.nextOpening
                ? `${t("adminOpensAt")} ${new Date(status.nextOpening).toLocaleTimeString()}`
                : status
                  ? t("adminStatusNote")
                  : ""}
          </p>
        </CardContent>
      </article>
    </Card>
  );
}
