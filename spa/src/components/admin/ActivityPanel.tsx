import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function ActivityPanel() {
  const { t } = useTranslation();

  return (
    <Card asChild className="min-h-[11.875rem]">
      <article>
        <CardHeader className="min-h-[4.25rem] flex-row items-center justify-between px-5 pt-5 pb-3">
          <CardTitle>{t("adminActivity")}</CardTitle>
          <Badge variant="secondary">{t("adminLastSevenDays")}</Badge>
        </CardHeader>
        <CardContent
          className="flex min-h-[6.25rem] items-center gap-3 text-muted"
          role="status"
        >
          <Activity
            className="shrink-0 text-primary"
            size={24}
            aria-hidden="true"
          />
          <p className="m-0 text-[0.9rem]">{t("adminActivityUnavailable")}</p>
        </CardContent>
      </article>
    </Card>
  );
}
