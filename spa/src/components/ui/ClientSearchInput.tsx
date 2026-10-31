import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "./input";

export function ClientSearchInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex w-full max-w-[30rem] min-w-0 items-center gap-[0.5rem]">
      <Search
        className="size-[1.25rem] shrink-0 text-muted"
        aria-hidden="true"
      />
      <Input
        className="min-w-0"
        id={id}
        type="search"
        aria-label={t("searchClient")}
        maxLength={50}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("clientSearchPlaceholder")}
      />
    </div>
  );
}
