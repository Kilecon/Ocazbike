import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { AdminLayout } from "../../layouts/AdminLayout";
import { createSupportRequest } from "../../services/support.api";
import type {
  SupportRequestDTO,
  SupportRequestType,
} from "../../services/types";

export function SupportPage() {
  const { t } = useTranslation();
  const [type, setType] = useState<SupportRequestType>("SR");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<SupportRequestDTO | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setCreated(null);
    try {
      setCreated(await createSupportRequest({ type, title, description }));
      setTitle("");
      setDescription("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("supportCreateError"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <main
        className="min-h-screen min-w-0 flex-1 p-[clamp(24px,4vw,56px)] max-[720px]:min-h-0 max-[720px]:px-4 max-[720px]:pt-6 max-[720px]:pb-10 [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-offset-[3px] [&_*:focus-visible]:outline-[var(--oz-focus)]"
        aria-labelledby="support-title"
      >
        <header className="mx-auto mb-6 flex max-w-[1240px] items-start justify-between gap-6 max-[560px]:grid max-[560px]:gap-4">
          <div>
            <span className="text-[0.72rem] font-bold text-muted">
              {t("adminSupport")}
            </span>
            <h1
              className="mt-1 mb-0 font-[var(--font-display)] text-2xl leading-[1.2] font-bold text-foreground max-[560px]:text-[1.6rem]"
              id="support-title"
            >
              {t("supportTitle")}
            </h1>
            <p className="mt-0 max-w-[620px] mb-0 leading-6 text-muted">
              {t("supportIntro")}
            </p>
          </div>
        </header>

        {error && (
          <p
            className="mx-auto mb-4 max-w-[1240px] rounded-[5px] border border-destructive bg-surface px-4 py-3 text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        {created && (
          <section
            className="mx-auto mb-4 max-w-[1240px] rounded-[5px] border border-border bg-surface px-4 py-3"
            role="status"
          >
            <div className="flex items-center gap-2.5 text-foreground">
              <Badge variant="secondary">{created.reference}</Badge>
              <strong>{t("supportCreated")}</strong>
            </div>
            <p className="mt-2 mb-0 text-sm text-muted">
              {created.discordNotification === "sent"
                ? t("supportDiscordSent")
                : t("supportDiscordFailed")}
            </p>
          </section>
        )}

        <form
          className="mx-auto mb-[18px] grid max-w-[850px] gap-3.5 rounded-md border border-border bg-surface p-5 [&>label]:grid [&>label]:gap-1.5 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-foreground"
          onSubmit={submit}
        >
          <h2 className="m-0 text-[1.05rem] text-foreground">
            {t("supportNewRequest")}
          </h2>
          <fieldset className="grid grid-cols-3 gap-2.5 m-0 p-0 border-0 max-[560px]:grid-cols-1">
            <legend className="mb-2 text-sm font-semibold text-foreground">
              {t("supportType")}
            </legend>
            {(["SR", "INC", "BUG"] as const).map((requestType) => (
              <label
                key={requestType}
                className="flex min-h-[74px] cursor-pointer items-center gap-2.5 rounded-[5px] border border-border bg-surface-muted p-3"
              >
                <input
                  className="accent-primary"
                  type="radio"
                  name="support-type"
                  value={requestType}
                  checked={type === requestType}
                  onChange={() => setType(requestType)}
                />
                <span className="grid gap-1 text-foreground">
                  <strong>{t(`supportType_${requestType}`)}</strong>
                  <small className="text-muted">{requestType}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <label htmlFor="support-title-input">
            {t("supportRequestTitle")}
            <Input
              id="support-title-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label htmlFor="support-description">
            {t("supportDescription")}
            <textarea
              id="support-description"
              className="min-h-[150px] w-full resize-y rounded-[5px] border border-control-border bg-surface px-3 py-2.5 text-foreground"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={7}
              maxLength={5000}
              required
            />
          </label>
          <div className="mt-1 flex items-center justify-end gap-3 max-[560px]:items-stretch max-[560px]:flex-col [&_[data-slot=button]]:max-[560px]:w-full">
            <Button type="submit" disabled={saving}>
              {saving ? t("saving") : t("supportSubmit")}
            </Button>
          </div>
        </form>
      </main>
    </AdminLayout>
  );
}
