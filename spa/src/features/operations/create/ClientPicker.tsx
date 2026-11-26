import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { clientsQuery } from "@/features/clients/queries";
import type { ClientListItemDTO } from "@/features/clients/types";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";
import { Input } from "@/shared/ui/Input";
import { useErrorToast } from "@/shared/ui/useErrorToast";

/** Searches clients once three characters are typed and lists five matches. */
export function ClientPicker({
  search,
  selected,
  onSearchChange,
  onSelect,
}: Readonly<{
  search: string;
  selected: ClientListItemDTO | null;
  onSearchChange: (search: string) => void;
  onSelect: (client: ClientListItemDTO) => void;
}>) {
  const { t } = useTranslation();
  const term = search.trim();
  const debouncedTerm = useDebouncedValue(term, 350);
  const enabled =
    !selected && debouncedTerm.length >= 3 && debouncedTerm === term;
  const matches = useQuery({
    ...clientsQuery({ page: 1, limit: 5, search: debouncedTerm }),
    enabled,
    placeholderData: undefined,
  });
  useErrorToast(matches.error, t("operationsLoadError"));
  const clientResults = enabled
    ? (matches.data?.clients.slice(0, 5) ?? [])
    : [];

  return (
    <>
      <label htmlFor="operation-client">
        {t("client")}*
        <Input
          id="operation-client"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("clientSearchPlaceholder")}
          maxLength={50}
          autoComplete="off"
          required
        />
      </label>
      {clientResults.length > 0 && !selected && (
        <div
          className="grid max-h-52 overflow-auto rounded border border-border"
          role="listbox"
          aria-label={t("clientSearchResults")}
        >
          {clientResults.map((client) => (
            <button
              className="border-0 border-b border-border bg-surface px-3 py-2 text-left text-foreground hover:bg-surface-muted"
              key={client.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => onSelect(client)}
            >
              {client.firstname} {client.lastname} · {client.email}
            </button>
          ))}
        </div>
      )}
      {selected && (
        <output className="m-0 block text-sm text-primary">
          {t("selectedClient")}
        </output>
      )}
    </>
  );
}
