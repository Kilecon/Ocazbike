import { Plus, X } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../../components/admin/AdminToast";
import { Button } from "../../../components/ui/button";
import { getClientsPage } from "../../../services/clients.api";
import { createRepair, getActiveRepairs } from "../../../services/repairs.api";
import type { ClientListItemDTO, RepairDTO } from "../../../services/types";
import { AdminPageShell } from "../common/AdminPageShell";
import { ActiveRepairsList } from "./ActiveRepairsList";
import { CreateRepairForm, type RepairFormValues } from "./CreateRepairForm";

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function RepairsPage() {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const [repairs, setRepairs] = useState<RepairDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<ClientListItemDTO[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [form, setForm] = useState<RepairFormValues>({
    date: today(),
    status: "created",
    comment: "",
    description: "",
    unitPrice: "",
    vatRate: "20",
  });
  const total = useMemo(() => {
    const amount = Number(form.unitPrice);
    const vat = Number(form.vatRate);
    if (!Number.isFinite(amount) || !Number.isFinite(vat)) return "";
    return (amount * (1 + vat / 100)).toFixed(2);
  }, [form.unitPrice, form.vatRate]);

  const loadRepairs = useCallback(async () => {
    setLoading(true);
    try {
      setRepairs(await getActiveRepairs());
    } catch (loadError) {
      showErrorToast(loadError, t("repairsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [showErrorToast, t]);

  useEffect(() => {
    void loadRepairs();
  }, [loadRepairs]);

  useEffect(() => {
    if (!showForm || clientSearch.trim().length < 3) {
      setClientResults([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      void getClientsPage({
        page: 1,
        limit: 20,
        search: clientSearch.trim(),
      })
        .then((result) => {
          if (active) setClientResults(result.clients);
        })
        .catch((searchError: unknown) => {
          if (active) showErrorToast(searchError, t("repairsLoadError"));
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [clientSearch, showErrorToast, showForm, t]);

  const submitRepair = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClientId || !total) return;
    setSaving(true);
    try {
      await createRepair({
        clientId: selectedClientId,
        ...form,
        quantity: "1",
        unitPrice: Number(form.unitPrice).toFixed(2),
        vatRate: Number(form.vatRate).toFixed(2),
        total,
      });
      setShowForm(false);
      setSelectedClientId(null);
      setClientSearch("");
      setForm({
        date: today(),
        status: "created",
        comment: "",
        description: "",
        unitPrice: "",
        vatRate: "20",
      });
      showToast("success", t("toastSuccess"), t("repairCreated"));
      await loadRepairs();
    } catch (saveError) {
      showErrorToast(saveError, t("repairCreateError"));
    } finally {
      setSaving(false);
    }
  };

  const updateForm = <K extends keyof RepairFormValues>(
    field: K,
    value: RepairFormValues[K],
  ) => setForm((current) => ({ ...current, [field]: value }));

  const selectClient = (client: ClientListItemDTO) => {
    setSelectedClientId(client.id);
    setClientSearch(`${client.firstname} ${client.lastname}`);
  };

  return (
    <AdminPageShell labelledBy="repairs-title">
      <header className="mx-auto mb-6 flex max-w-[77.5rem] items-start justify-between gap-6 max-[35rem]:grid max-[35rem]:gap-4 [&_h1]:mt-1 [&_h1]:mb-[0.375rem] [&_h1]:font-[var(--font-display)] [&_h1]:text-2xl [&_h1]:leading-[1.2] [&_h1]:font-bold [&_h1]:text-foreground max-[35rem]:[&_h1]:text-[1.6rem] [&_p]:m-0 [&_p]:max-w-[38.75rem] [&_p]:leading-6 [&_p]:text-muted">
        <div>
          <span className="text-[0.72rem] font-bold text-muted">
            {t("adminRepairs")}
          </span>
          <h1 id="repairs-title">{t("repairsTitle")}</h1>
          <p>{t("repairsIntro")}</p>
        </div>
        <Button
          type="button"
          onClick={() => setShowForm((visible) => !visible)}
        >
          {showForm ? (
            <X size={17} aria-hidden="true" />
          ) : (
            <Plus size={17} aria-hidden="true" />
          )}
          {showForm ? t("cancel") : t("newRepair")}
        </Button>
      </header>

      {showForm && (
        <CreateRepairForm
          clientSearch={clientSearch}
          clientResults={clientResults}
          selectedClientId={selectedClientId}
          form={form}
          total={total}
          saving={saving}
          onClientSearchChange={(search) => {
            setClientSearch(search);
            setSelectedClientId(null);
          }}
          onClientSelect={selectClient}
          onChange={updateForm}
          onSubmit={(event) => void submitRepair(event)}
        />
      )}

      <ActiveRepairsList repairs={repairs} loading={loading} />
    </AdminPageShell>
  );
}
