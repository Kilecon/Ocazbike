import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { AdminLayout } from "../../layouts/AdminLayout";
import { ApiError } from "../../services/api-client";
import {
  createClosure,
  deleteClosure,
  getClosures,
} from "../../services/closures.api";
import { getSchedule, saveSchedule } from "../../services/opening-hours.api";
import type { ClosureDTO, ScheduleDTO } from "../../services/types";

const days = [
  { value: 1, key: "monday" },
  { value: 2, key: "tuesday" },
  { value: 3, key: "wednesday" },
  { value: 4, key: "thursday" },
  { value: 5, key: "friday" },
  { value: 6, key: "saturday" },
  { value: 0, key: "sunday" },
] as const;

type SlotForm = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const formatDateTime = (value: string) => new Date(value).toLocaleString();

export function SchedulesPage() {
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState<ScheduleDTO | null>(null);
  const [closures, setClosures] = useState<ClosureDTO[]>([]);
  const [slots, setSlots] = useState<SlotForm[]>([
    {
      id: crypto.randomUUID(),
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "18:00",
    },
  ]);
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [closureForm, setClosureForm] = useState({
    startDateTime: "",
    endDateTime: "",
    reason: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const hasLoadedRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [scheduleResult, closuresResult] = await Promise.allSettled([
        getSchedule(),
        getClosures(),
      ]);

      if (scheduleResult.status === "fulfilled") {
        setSchedule(scheduleResult.value);
        setEffectiveFrom(scheduleResult.value.effectiveFrom);
        setSlots(
          scheduleResult.value.slots.map(
            ({ id, dayOfWeek, startTime, endTime }) => ({
              id: String(id),
              dayOfWeek,
              startTime,
              endTime,
            }),
          ),
        );
      } else if (
        !(
          scheduleResult.reason instanceof ApiError &&
          scheduleResult.reason.status === 404
        )
      ) {
        throw scheduleResult.reason;
      } else {
        setSchedule(null);
      }

      if (closuresResult.status === "fulfilled") {
        setClosures(closuresResult.value.closures);
      } else {
        throw closuresResult.reason;
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("scheduleLoadError"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    void loadData();
  }, [loadData]);

  const updateSlot = (index: number, field: keyof SlotForm, value: string) => {
    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index
          ? { ...slot, [field]: field === "dayOfWeek" ? Number(value) : value }
          : slot,
      ),
    );
  };

  const saveHours = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await saveSchedule({ effectiveFrom, slots }, schedule?.id);
      setSchedule(result);
      setMessage(t("scheduleSaved"));
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t("scheduleSaveError"),
      );
    } finally {
      setSaving(false);
    }
  };

  const addClosure = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await createClosure({
        startDateTime: new Date(closureForm.startDateTime).toISOString(),
        endDateTime: new Date(closureForm.endDateTime).toISOString(),
        reason: closureForm.reason || undefined,
      });
      setClosureForm({ startDateTime: "", endDateTime: "", reason: "" });
      setMessage(t("closureSaved"));
      const result = await getClosures();
      setClosures(result.closures);
    } catch (closureError) {
      setError(
        closureError instanceof Error
          ? closureError.message
          : t("closureSaveError"),
      );
    } finally {
      setSaving(false);
    }
  };

  const removeClosure = async (id: number) => {
    setError("");
    setMessage("");
    try {
      await deleteClosure(id);
      setClosures((current) => current.filter((closure) => closure.id !== id));
      setMessage(t("closureDeleted"));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("closureDeleteError"),
      );
    }
  };

  if (loading)
    return (
      <AdminLayout>
        <main
          className="grid min-h-screen min-w-0 flex-1 place-items-center p-[clamp(24px,4vw,56px)] text-muted max-[720px]:min-h-0 max-[720px]:px-4 max-[720px]:pt-6 max-[720px]:pb-10"
          aria-labelledby="schedule-loading-title"
        >
          <h1 id="schedule-loading-title" className="sr-only">
            {t("scheduleTitle")}
          </h1>
          <p role="status" aria-live="polite">
            {t("loading")}
          </p>
        </main>
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <main
        className="min-h-screen min-w-0 flex-1 p-[clamp(24px,4vw,56px)] max-[720px]:min-h-0 max-[720px]:px-4 max-[720px]:pt-6 max-[720px]:pb-10 [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-offset-[3px] [&_*:focus-visible]:outline-[var(--oz-focus)]"
        aria-labelledby="schedule-title"
      >
        <header className="mx-auto mb-6 flex max-w-[1240px] items-start justify-between gap-6 max-[560px]:grid max-[560px]:gap-4 [&_h1]:mt-1 [&_h1]:mb-[6px] [&_h1]:font-[var(--font-display)] [&_h1]:text-2xl [&_h1]:leading-[1.2] [&_h1]:font-bold [&_h1]:text-foreground max-[560px]:[&_h1]:text-[1.6rem] [&_p]:m-0 [&_p]:max-w-[620px] [&_p]:leading-6 [&_p]:text-muted [&_[data-slot=button]]:whitespace-nowrap">
          <div>
            <span className="text-[0.72rem] font-bold text-muted">
              {t("adminKicker")}
            </span>
            <h1 id="schedule-title">{t("scheduleTitle")}</h1>
            <p>{t("scheduleIntro")}</p>
          </div>
          <Button asChild variant="outline">
            <a href="/admin">
              <ArrowLeft size={17} aria-hidden="true" />
              {t("backToDashboard")}
            </a>
          </Button>
        </header>
        {(error || message) && (
          <div
            className={`mx-auto mb-4 max-w-[1240px] rounded-[5px] border border-primary bg-surface-muted px-4 py-3 text-[0.9rem] text-primary ${error ? "border-destructive bg-destructive-soft text-destructive" : ""}`}
            role={error ? "alert" : "status"}
            aria-live={error ? "assertive" : "polite"}
            aria-atomic="true"
          >
            {error || message}
          </div>
        )}
        <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] items-start gap-4 max-[900px]:grid-cols-1">
          <Card asChild className="min-w-0 p-0">
            <section aria-labelledby="opening-hours-title">
              <CardHeader className="flex-row items-start justify-between gap-4 px-[22px] pt-[22px] pb-3">
                <div>
                  <span className="text-[0.72rem] font-bold text-muted">
                    {t("scheduleSectionLabel")}
                  </span>
                  <CardTitle
                    className="mt-[5px] mb-0 text-xl text-foreground"
                    id="opening-hours-title"
                  >
                    {t("openingHoursTitle")}
                  </CardTitle>
                </div>
                <Badge>{t("scheduleActive")}</Badge>
              </CardHeader>
              <CardContent className="px-[22px] pt-0 pb-[22px]">
                <form
                  onSubmit={saveHours}
                  aria-labelledby="opening-hours-title"
                  aria-busy={saving}
                >
                  <label
                    className="grid gap-1.5 text-sm font-semibold text-foreground"
                    htmlFor="effective-from"
                  >
                    {t("effectiveFrom")}
                    <Input
                      id="effective-from"
                      type="date"
                      value={effectiveFrom}
                      onChange={(event) => setEffectiveFrom(event.target.value)}
                      required
                    />
                  </label>
                  <div className="my-5 grid gap-2.5">
                    {slots.map((slot, index) => (
                      <fieldset
                        className="m-0 grid min-w-0 grid-cols-[minmax(110px,1fr)_110px_auto_110px_44px] items-center gap-2 border-0 p-0 max-[560px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px]"
                        key={slot.id}
                        aria-label={`${t("scheduleSlot")} ${index + 1}`}
                      >
                        <select
                          className="min-h-11 min-w-0 rounded-[5px] border border-control-border bg-surface px-[11px] py-[9px] text-foreground max-[560px]:[grid-column:1/-1]"
                          aria-label={t("day")}
                          value={slot.dayOfWeek}
                          onChange={(event) =>
                            updateSlot(index, "dayOfWeek", event.target.value)
                          }
                        >
                          {days.map((day) => (
                            <option key={day.value} value={day.value}>
                              {t(day.key)}
                            </option>
                          ))}
                        </select>
                        <Input
                          aria-label={t("startTime")}
                          type="time"
                          value={slot.startTime}
                          onChange={(event) =>
                            updateSlot(index, "startTime", event.target.value)
                          }
                          required
                        />
                        <span className="max-[560px]:hidden">—</span>
                        <Input
                          aria-label={t("endTime")}
                          type="time"
                          value={slot.endTime}
                          onChange={(event) =>
                            updateSlot(index, "endTime", event.target.value)
                          }
                          required
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          type="button"
                          aria-label={t("removeSlotLabel", {
                            number: index + 1,
                          })}
                          onClick={() =>
                            setSlots((current) =>
                              current.filter(
                                (_, slotIndex) => slotIndex !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 size={17} aria-hidden="true" />
                        </Button>
                      </fieldset>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-3 max-[560px]:items-stretch max-[560px]:flex-col [&_[data-slot=button]]:max-[560px]:w-full">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() =>
                        setSlots((current) => [
                          ...current,
                          {
                            id: crypto.randomUUID(),
                            dayOfWeek: 1,
                            startTime: "09:00",
                            endTime: "18:00",
                          },
                        ])
                      }
                    >
                      <Plus size={17} aria-hidden="true" />
                      {t("addSlot")}
                    </Button>
                    <Button
                      variant="default"
                      disabled={saving}
                      aria-busy={saving}
                      type="submit"
                    >
                      {saving
                        ? t("saving")
                        : schedule
                          ? t("updateSchedule")
                          : t("saveSchedule")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </section>
          </Card>

          <Card asChild className="min-w-0 p-0">
            <section aria-labelledby="closures-title">
              <CardHeader className="flex-row items-start justify-between gap-4 px-[22px] pt-[22px] pb-3">
                <div>
                  <span className="text-[0.72rem] font-bold text-muted">
                    {t("closureSectionLabel")}
                  </span>
                  <CardTitle
                    className="mt-[5px] mb-0 text-xl text-foreground"
                    id="closures-title"
                  >
                    {t("exceptionalClosuresTitle")}
                  </CardTitle>
                </div>
                <Badge variant="secondary">{closures.length}</Badge>
              </CardHeader>
              <CardContent className="px-[22px] pt-0 pb-[22px]">
                <div
                  className="grid max-h-[280px] gap-2.5 overflow-auto"
                  aria-live="polite"
                >
                  {closures.length === 0 ? (
                    <p className="text-[0.8rem] text-muted" role="status">
                      {t("noClosures")}
                    </p>
                  ) : (
                    closures.map((closure) => (
                      <article
                        className="flex items-center justify-between gap-4 rounded-[4px] border-l-[3px] border-[var(--oz-orange)] bg-surface-muted p-3.5"
                        key={closure.id}
                      >
                        <div className="grid min-w-0 gap-1">
                          <strong className="text-sm text-foreground">
                            <time dateTime={closure.startDateTime}>
                              {formatDateTime(closure.startDateTime)}
                            </time>
                          </strong>
                          <span className="text-[0.8rem] text-muted">
                            {t("until")}{" "}
                            <time dateTime={closure.endDateTime}>
                              {formatDateTime(closure.endDateTime)}
                            </time>
                          </span>
                          <small className="text-[0.8rem] text-muted">
                            {closure.reason || t("noReason")}
                          </small>
                        </div>
                        <Button
                          variant="destructive"
                          type="button"
                          disabled={saving}
                          aria-label={t("deleteClosureLabel", {
                            date: formatDateTime(closure.startDateTime),
                          })}
                          onClick={() => void removeClosure(closure.id)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                          {t("delete")}
                        </Button>
                      </article>
                    ))
                  )}
                </div>
                <form
                  className="mt-6 grid gap-3 border-t border-border pt-5 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foreground"
                  onSubmit={addClosure}
                  aria-labelledby="add-closure-title"
                  aria-busy={saving}
                >
                  <h3
                    className="m-0 text-base text-foreground"
                    id="add-closure-title"
                  >
                    {t("addClosure")}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                    <label htmlFor="closure-starts-at">
                      {t("startsAt")}
                      <Input
                        id="closure-starts-at"
                        type="datetime-local"
                        value={closureForm.startDateTime}
                        onChange={(event) =>
                          setClosureForm({
                            ...closureForm,
                            startDateTime: event.target.value,
                          })
                        }
                        required
                      />
                    </label>
                    <label htmlFor="closure-ends-at">
                      {t("endsAt")}
                      <Input
                        id="closure-ends-at"
                        type="datetime-local"
                        value={closureForm.endDateTime}
                        onChange={(event) =>
                          setClosureForm({
                            ...closureForm,
                            endDateTime: event.target.value,
                          })
                        }
                        required
                      />
                    </label>
                  </div>
                  <label htmlFor="closure-reason">
                    {t("reason")}
                    <Input
                      id="closure-reason"
                      type="text"
                      value={closureForm.reason}
                      onChange={(event) =>
                        setClosureForm({
                          ...closureForm,
                          reason: event.target.value,
                        })
                      }
                      placeholder={t("reasonPlaceholder")}
                    />
                  </label>
                  <Button
                    variant="default"
                    disabled={saving}
                    aria-busy={saving}
                    type="submit"
                  >
                    {saving ? t("saving") : t("addClosure")}
                  </Button>
                </form>
              </CardContent>
            </section>
          </Card>
        </div>
      </main>
    </AdminLayout>
  );
}
