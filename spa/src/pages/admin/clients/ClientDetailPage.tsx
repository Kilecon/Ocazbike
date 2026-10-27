import { ArrowLeft, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../../components/admin/AdminToast";
import { Button } from "../../../components/ui/button";
import { useCurrentUser } from "../../../contexts/CurrentUser";
import {
  formatClientFirstName,
  formatClientLastName,
  formatClientName,
} from "../../../lib/client";
import { formatLocalDate } from "../../../lib/date";
import {
  createClient,
  getClient,
  getClientOperations,
  updateClient,
} from "../../../services/clients.api";
import type {
  ClientDetailDTO,
  ClientInputDTO,
  ClientOperationDTO,
} from "../../../services/types";
import { AdminPageShell } from "../common/AdminPageShell";
import {
  type ClientForm,
  ClientInformationPanel,
} from "./ClientInformationPanel";
import { ClientOperations } from "./ClientOperations";

const emptyForm: ClientForm = {
  firstname: "",
  lastname: "",
  email: "",
  phonenumber: "",
  address: "",
  addressComplement: "",
  identityCardNumber: "",
  privatenote: "",
  isProfessional: false,
  siret: "",
  companyName: "",
};

function formFromClient(client: ClientDetailDTO): ClientForm {
  return {
    firstname: formatClientFirstName(client.firstname),
    lastname: formatClientLastName(client.lastname),
    email: client.email,
    phonenumber: client.phonenumber,
    address: client.address ?? "",
    addressComplement: client.addressComplement ?? "",
    identityCardNumber: client.identityCardNumber ?? "",
    privatenote: client.privatenote ?? "",
    isProfessional: client.isProfessional,
    siret: client.siret ?? "",
    companyName: client.companyName ?? "",
  };
}

function toClientInput(form: ClientForm): ClientInputDTO {
  const fields = {
    firstname: formatClientFirstName(form.firstname),
    lastname: formatClientLastName(form.lastname),
    email: form.email.trim(),
    phonenumber: form.phonenumber.trim(),
    address: form.address.trim() || undefined,
    addressComplement: form.addressComplement.trim() || undefined,
    identityCardNumber: form.identityCardNumber.trim() || null,
    privatenote: form.privatenote.trim() || undefined,
  };
  return form.isProfessional
    ? {
        ...fields,
        isProfessional: true,
        siret: form.siret.trim() || null,
        companyName: form.companyName.trim() || null,
      }
    : { ...fields, isProfessional: false, siret: null, companyName: null };
}

export function ClientDetailPage({
  clientId,
  createMode = false,
  onCancel,
  onCreated,
}: {
  clientId?: number;
  createMode?: boolean;
  onCancel?: () => void;
  onCreated?: (clientId: number) => void;
}) {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const currentUser = useCurrentUser();
  const [client, setClient] = useState<ClientDetailDTO | null>(null);
  const [operations, setOperations] = useState<ClientOperationDTO[]>([]);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [loading, setLoading] = useState(!createMode);
  const [editing, setEditing] = useState(createMode);
  const [saving, setSaving] = useState(false);
  const editDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = editDialogRef.current;
    if (!createMode && editing && dialog && !dialog.open) dialog.showModal();
  }, [createMode, editing]);

  useEffect(() => {
    if (createMode || clientId === undefined) return;
    let active = true;
    setLoading(true);
    void getClient(clientId)
      .then((result) => {
        if (!active) return;
        setClient(result);
        setForm(formFromClient(result));
      })
      .catch((loadError: unknown) => {
        if (active) showErrorToast(loadError, t("clientLoadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    void getClientOperations(clientId)
      .then((clientOperations) => {
        if (active) setOperations(clientOperations);
      })
      .catch((loadError: unknown) => {
        if (active) showErrorToast(loadError, t("clientOperationsLoadError"));
      });
    return () => {
      active = false;
    };
  }, [clientId, createMode, showErrorToast, t]);

  const hasChanges =
    createMode ||
    (client !== null &&
      JSON.stringify(toClientInput(form)) !==
        JSON.stringify(toClientInput(formFromClient(client))));

  const updateForm = (field: keyof ClientForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createMode && !hasChanges) return;
    setSaving(true);
    try {
      const input = toClientInput(form);
      if (createMode) {
        const saved = await createClient(input);
        showToast("success", t("toastSuccess"), t("clientCreated"));
        if (onCreated) onCreated(saved.id);
        else window.location.assign(`/admin/clients/${saved.id}`);
        return;
      }
      if (clientId === undefined) {
        throw new Error("Client id is required to update a client");
      }
      const saved = await updateClient(clientId, input);
      setClient(saved);
      setForm(formFromClient(saved));
      setEditing(false);
      editDialogRef.current?.close();
      showToast("success", t("toastSuccess"), t("clientSaved"));
    } catch (saveError) {
      showErrorToast(saveError, t("clientSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (createMode) {
      if (onCancel) onCancel();
      else window.location.assign("/admin/clients");
      return;
    }
    if (client) setForm(formFromClient(client));
    setEditing(false);
    editDialogRef.current?.close();
  };

  const openEditDialog = () => {
    if (client) setForm(formFromClient(client));
    setEditing(true);
  };

  const canEdit = currentUser?.role === "Admin";
  const pageTitle = createMode
    ? t("clientCreateTitle")
    : t("clientDetailTitle");

  const content = (
    <>
      <header
        className={
          createMode
            ? "flex items-center justify-between gap-4 p-5"
            : "mx-auto mb-6 max-w-[77.5rem]"
        }
      >
        {!createMode && (
          <a
            className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary no-underline hover:underline"
            href="/admin/clients"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {t("backToClients")}
          </a>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1
                className="m-0 font-[var(--font-display)] text-2xl leading-[1.2] font-bold text-foreground"
                id="client-detail-title"
              >
                {client
                  ? formatClientName(client.lastname, client.firstname)
                  : pageTitle}
              </h1>
              {client?.isProfessional && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {t("professionalClient")}
                </span>
              )}
            </div>
            {client &&
              !createMode &&
              client.lastModificationMs !== client.createdAtMs && (
                <p className="m-0 shrink-0 text-sm text-muted">
                  {t("clientModifiedAt")}{" "}
                  <time
                    dateTime={new Date(client.lastModificationMs).toISOString()}
                  >
                    {formatLocalDate(client.lastModificationMs)}
                  </time>
                </p>
              )}
          </div>
        </div>
        {createMode && onCancel && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("modalClose")}
            disabled={saving}
            onClick={onCancel}
          >
            <X className="size-[1.125rem]" aria-hidden="true" />
          </Button>
        )}
      </header>

      {loading ? (
        <p className="mx-auto max-w-[77.5rem] text-sm text-muted" role="status">
          {t("loading")}
        </p>
      ) : !createMode && !client ? (
        <p className="mx-auto max-w-[77.5rem] text-sm text-muted">
          {t("clientLoadError")}
        </p>
      ) : (
        <ClientInformationPanel
          form={form}
          createdAt={client ? formatLocalDate(client.createdAtMs) : null}
          hasChanges={hasChanges}
          showTypeSelector={createMode}
          canEdit={canEdit}
          editing={createMode}
          saving={saving}
          onEdit={openEditDialog}
          onChange={updateForm}
          onCancel={cancelEdit}
          onSubmit={(event) => void submit(event)}
        />
      )}
      {!createMode && client && editing && (
        <dialog
          ref={editDialogRef}
          className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-md border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
          aria-labelledby="client-edit-title"
          onClose={() => setEditing(false)}
        >
          <header className="flex items-center justify-between gap-4 p-5">
            <h2
              className="m-0 font-[var(--font-display)] text-xl leading-[1.2] font-bold text-foreground"
              id="client-edit-title"
            >
              {t("clientEditTitle")}
            </h2>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t("modalClose")}
              disabled={saving}
              onClick={cancelEdit}
            >
              <X className="size-[1.125rem]" aria-hidden="true" />
            </Button>
          </header>
          <ClientInformationPanel
            form={form}
            createdAt={formatLocalDate(client.createdAtMs)}
            hasChanges={hasChanges}
            showTypeSelector
            canEdit={canEdit}
            editing
            saving={saving}
            onEdit={openEditDialog}
            onChange={updateForm}
            onCancel={cancelEdit}
            onSubmit={(event) => void submit(event)}
          />
        </dialog>
      )}
      {!loading && client && <ClientOperations operations={operations} />}
    </>
  );

  return createMode ? (
    content
  ) : (
    <AdminPageShell labelledBy="client-detail-title">{content}</AdminPageShell>
  );
}
