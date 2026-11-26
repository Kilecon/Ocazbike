import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";
import { type SubmitEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/features/auth/CurrentUser";
import { formatLocalDate } from "@/shared/lib/date";
import { useAdminToast } from "@/shared/ui/AdminToast";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalHeader } from "@/shared/ui/Modal";
import { PageShell } from "@/shared/ui/PageShell";
import { useErrorToast } from "@/shared/ui/useErrorToast";
import { createClient, updateClient } from "./api";
import {
  type ClientForm,
  ClientInformationPanel,
} from "./ClientInformationPanel";
import { ClientOperations } from "./ClientOperations";
import {
  formatClientFirstName,
  formatClientLastName,
  formatClientName,
} from "./format";
import { clientQuery, useClientSaved } from "./queries";
import type { ClientDetailDTO, ClientInputDTO } from "./types";

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
  const navigate = useNavigate();
  const clientResult = useQuery({
    ...clientQuery(clientId ?? 0),
    enabled: !createMode && clientId !== undefined,
  });
  useErrorToast(clientResult.error, t("clientLoadError"));
  const client = clientResult.data ?? null;
  const loading = clientResult.isFetching;
  const clientSaved = useClientSaved();
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [editing, setEditing] = useState(createMode);
  const [saving, setSaving] = useState(false);
  const editDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (client) setForm(formFromClient(client));
  }, [client]);

  const hasChanges =
    createMode ||
    (client !== null &&
      JSON.stringify(toClientInput(form)) !==
        JSON.stringify(toClientInput(formFromClient(client))));

  const updateForm = (field: keyof ClientForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createMode && !hasChanges) return;
    setSaving(true);
    try {
      const input = toClientInput(form);
      if (createMode) {
        const saved = await createClient(input);
        void clientSaved(saved);
        showToast("success", t("toastSuccess"), t("clientCreated"));
        if (onCreated) onCreated(saved.id);
        else
          void navigate({
            to: "/admin/clients/$clientId",
            params: { clientId: saved.id },
          });
        return;
      }
      if (clientId === undefined) {
        throw new Error("Client id is required to update a client");
      }
      const saved = await updateClient(clientId, input);
      void clientSaved(saved);
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
      else void navigate({ to: "/admin/clients" });
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

  const renderInformationContent = () => {
    if (loading) {
      return (
        <output className="mx-auto block max-w-[77.5rem] text-sm text-muted">
          {t("loading")}
        </output>
      );
    }
    if (!createMode && !client) {
      return (
        <p className="mx-auto max-w-[77.5rem] text-sm text-muted">
          {t("clientLoadError")}
        </p>
      );
    }
    return (
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
    );
  };

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
          <Link
            className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary no-underline hover:underline"
            to="/admin/clients"
          >
            <ArrowLeft size="1rem" aria-hidden="true" />
            {t("backToClients")}
          </Link>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1
                className="oz-card-title m-0 text-foreground"
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

      {renderInformationContent()}
      {!createMode && client && editing && (
        <Modal
          ref={editDialogRef}
          aria-labelledby="client-edit-title"
          onClose={() => setEditing(false)}
        >
          <ModalHeader
            className="items-center p-5"
            titleId="client-edit-title"
            title={t("clientEditTitle")}
            onClose={cancelEdit}
            closeDisabled={saving}
          />
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
        </Modal>
      )}
      {!loading && client && <ClientOperations clientId={client.id} />}
    </>
  );

  return createMode ? (
    content
  ) : (
    <PageShell labelledBy="client-detail-title">{content}</PageShell>
  );
}
