import { Bike } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";

const categories = [
  { label: "publicCategoryAll", value: "" },
  { label: "publicCategoryMountain", value: "VTT" },
  { label: "publicCategoryElectric", value: "Électrique" },
  { label: "publicCategoryRoad", value: "Route" },
  { label: "publicCategoryCity", value: "Urbain" },
  { label: "publicCategoryBmx", value: "BMX" },
  { label: "publicCategoryGravel", value: "Gravel" },
] as const;

type Filters = {
  query: string;
  minPrice: string;
  maxPrice: string;
  dateSort: string;
  priceSort: string;
  category: string;
};

const emptyFilters: Filters = {
  query: "",
  minPrice: "",
  maxPrice: "",
  dateSort: "",
  priceSort: "",
  category: "",
};

export function BikeCatalogPage() {
  const { t } = useTranslation();
  const initialCategory =
    new URLSearchParams(window.location.search).get("category") ?? "";
  const [filters, setFilters] = useState({
    ...emptyFilters,
    category: initialCategory,
  });

  const update = (patch: Partial<Filters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  const resetFilters = () => {
    setFilters(emptyFilters);
    window.history.replaceState(null, "", "/velo");
  };

  return (
    <>
      <section
        className="relative flex min-h-[17.8125rem] items-center overflow-hidden border-b-4 border-primary"
        aria-labelledby="catalog-title"
      >
        <img
          className="absolute inset-0 size-full object-cover [object-position:center_54%]"
          src="https://s3.mizury.fr/ocazbike/Ocazbike_devanture.webp"
          alt={t("publicHeroImageAlt")}
        />
        <div className="oz-catalog-overlay absolute inset-0" />
        <div className="relative z-[1] mx-auto w-[min(75rem,calc(100%-3rem))] py-[3.25rem] max-[47.9375rem]:w-[min(100%-2rem,37.5rem)] max-[47.9375rem]:py-[2.625rem] max-[3rem]:w-[min(100%-1.75rem,27.5rem)]">
          <p className="mt-0 mb-3.5 text-[0.8125rem] font-bold tracking-[0.04em] text-primary uppercase">
            {t("publicCatalogEyebrow")}
          </p>
          <h1
            className="m-0 text-[3.125rem] leading-[1.1] font-bold text-foreground max-[47.9375rem]:text-[2.5625rem]"
            id="catalog-title"
          >
            {t("publicCatalogTitle")}
          </h1>
        </div>
      </section>

      <section
        className="mx-auto w-[min(75rem,calc(100%-3rem))] py-[1.875rem] pb-[4.5rem] max-[47.9375rem]:w-[min(100%-2rem,37.5rem)] max-[47.9375rem]:py-[1.4375rem] max-[47.9375rem]:pb-[3.4375rem] max-[3rem]:w-[min(100%-1.75rem,27.5rem)]"
        aria-label={t("publicCatalogTitle")}
      >
        <nav
          className="mb-[1.4375rem] flex flex-wrap justify-start gap-[0.5625rem] max-[47.9375rem]:flex-nowrap max-[47.9375rem]:overflow-x-auto max-[47.9375rem]:px-[0.1875rem] max-[47.9375rem]:pt-[0.1875rem] max-[47.9375rem]:pb-[0.5625rem] max-[47.9375rem]:[scrollbar-width:thin]"
          aria-label={t("publicCategoryNavigation")}
        >
          {categories.map((category) => (
            <a
              className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border px-4 py-2 text-[0.8125rem] font-semibold no-underline transition-colors ${filters.category === category.value ? "border-primary bg-primary text-[var(--oz-on-dark)] dark:text-[#0d1715]" : "border-border bg-surface text-foreground hover:border-primary hover:bg-primary hover:text-[var(--oz-on-dark)] dark:hover:text-[#0d1715]"}`}
              href={
                category.value
                  ? `/velo?category=${encodeURIComponent(category.value)}`
                  : "/velo"
              }
              key={category.value || "all"}
              aria-current={
                filters.category === category.value ? "page" : undefined
              }
            >
              {t(category.label)}
            </a>
          ))}
        </nav>

        <form
          className="grid grid-cols-[minmax(12.5rem,1.4fr)_minmax(9.6875rem,0.9fr)_minmax(11.875rem,1fr)_minmax(13.125rem,1.15fr)_auto] items-end gap-4 rounded-lg border border-border bg-surface-muted p-5 max-[66.25rem]:grid-cols-2 max-[66.25rem]:[&>.oz-filter-search]:col-span-full max-[66.25rem]:[&>.oz-filter-note]:col-span-full max-[47.9375rem]:grid-cols-1 max-[47.9375rem]:p-4 max-[47.9375rem]:[&>.oz-filter-search]:col-auto"
          aria-label={t("publicCatalogFilters")}
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="oz-filter-search grid min-w-0 gap-1.5 max-[66.25rem]:col-span-full max-[47.9375rem]:col-auto [&>label]:text-[0.8125rem] [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-[2.6875rem] [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[0.6875rem] [&_input]:py-[0.5625rem] [&_input]:text-sm [&_input]:text-foreground">
            <label htmlFor="bike-search">{t("catalogSearch")}</label>
            <input
              id="bike-search"
              type="search"
              value={filters.query}
              onChange={(event) => update({ query: event.target.value })}
              placeholder={t("catalogSearchPlaceholder")}
            />
          </div>
          <div className="oz-field grid min-w-0 gap-1.5 [&>label]:text-[0.8125rem] [&>label]:font-semibold [&>label]:text-foreground [&_select]:min-h-[5rem] [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-control-border [&_select]:bg-surface [&_select]:p-[0.3125rem] [&_select]:text-sm [&_select]:text-foreground [&_small]:text-[0.6875rem] [&_small]:text-muted">
            <label htmlFor="bike-makes">{t("catalogMakes")}</label>
            <select
              id="bike-makes"
              multiple
              size={3}
              aria-describedby="bike-makes-note"
            >
              <option value="" disabled>
                {t("catalogMakesPending")}
              </option>
            </select>
            <small id="bike-makes-note">{t("catalogOptionsPending")}</small>
          </div>
          <fieldset className="min-w-0 border-0 p-0">
            <legend className="mb-1.5 text-[0.8125rem] font-semibold text-foreground">
              {t("catalogPriceRange")}
            </legend>
            <div className="grid grid-cols-2 gap-2.5 max-[3rem]:grid-cols-1">
              <div className="oz-field grid min-w-0 gap-1.5 [&>label]:text-[0.8125rem] [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-[2.6875rem] [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[0.6875rem] [&_input]:py-[0.5625rem] [&_input]:text-sm [&_input]:text-foreground">
                <label htmlFor="bike-price-min">{t("catalogMinPrice")}</label>
                <input
                  id="bike-price-min"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={filters.minPrice}
                  onChange={(event) => update({ minPrice: event.target.value })}
                />
              </div>
              <div className="oz-field grid min-w-0 gap-1.5 [&>label]:text-[0.8125rem] [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-[2.6875rem] [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[0.6875rem] [&_input]:py-[0.5625rem] [&_input]:text-sm [&_input]:text-foreground">
                <label htmlFor="bike-price-max">{t("catalogMaxPrice")}</label>
                <input
                  id="bike-price-max"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={filters.maxPrice}
                  onChange={(event) => update({ maxPrice: event.target.value })}
                />
              </div>
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-2.5 max-[3rem]:grid-cols-1">
            <div className="oz-field grid min-w-0 gap-1.5 [&>label]:text-[0.8125rem] [&>label]:font-semibold [&>label]:text-foreground [&_select]:min-h-[2.6875rem] [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-control-border [&_select]:bg-surface [&_select]:px-[0.6875rem] [&_select]:py-[0.5625rem] [&_select]:text-sm [&_select]:text-foreground">
              <label htmlFor="bike-date-sort">{t("catalogDateSort")}</label>
              <select
                id="bike-date-sort"
                value={filters.dateSort}
                onChange={(event) => update({ dateSort: event.target.value })}
              >
                <option value="">{t("catalogChooseSort")}</option>
                <option value="desc">{t("catalogNewest")}</option>
                <option value="asc">{t("catalogOldest")}</option>
              </select>
            </div>
            <div className="oz-field grid min-w-0 gap-1.5 [&>label]:text-[0.8125rem] [&>label]:font-semibold [&>label]:text-foreground [&_select]:min-h-[2.6875rem] [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-control-border [&_select]:bg-surface [&_select]:px-[0.6875rem] [&_select]:py-[0.5625rem] [&_select]:text-sm [&_select]:text-foreground">
              <label htmlFor="bike-price-sort">{t("catalogPriceSort")}</label>
              <select
                id="bike-price-sort"
                value={filters.priceSort}
                onChange={(event) => update({ priceSort: event.target.value })}
              >
                <option value="">{t("catalogChooseSort")}</option>
                <option value="asc">{t("catalogPriceAscending")}</option>
                <option value="desc">{t("catalogPriceDescending")}</option>
              </select>
            </div>
          </div>
          <div className="self-end">
            <Button
              className="min-h-11 rounded-md border border-primary bg-surface text-primary hover:bg-[var(--oz-outline-hover)] disabled:border-border disabled:bg-surface-muted disabled:text-muted disabled:opacity-100"
              type="button"
              variant="outline"
              onClick={resetFilters}
            >
              {t("catalogReset")}
            </Button>
          </div>
          <p
            className="oz-filter-note col-span-full m-0 text-xs text-muted max-[47.9375rem]:col-auto"
            role="note"
          >
            {t("catalogApiNote")}
          </p>
        </form>

        <div className="mt-[2.1875rem]" aria-live="polite">
          <div className="mb-[1.0625rem]">
            <h2 className="m-0 text-[1.4375rem] text-foreground">
              {t("catalogResultsTitle")}
            </h2>
          </div>
          <div
            className="flex min-h-[18.75rem] flex-col items-center justify-center rounded-lg border border-border bg-surface-muted p-8 text-center forced-colors:border-[CanvasText]"
            role="status"
          >
            <Bike
              className="mb-[0.9375rem] size-[2.375rem] text-primary"
              aria-hidden="true"
            />
            <h3 className="m-0 text-[1.1875rem] font-bold text-foreground">
              {t("catalogEmptyTitle")}
            </h3>
            <p className="mt-[0.5625rem] mb-0 max-w-[33.75rem] text-sm text-muted">
              {t("catalogEmptyText")}
            </p>
          </div>
          <nav
            className="mt-6 flex items-center justify-center gap-[1.125rem] [&>span]:text-sm [&>span]:tabular-nums [&>span]:text-muted [&_button:disabled]:border-border [&_button:disabled]:bg-surface-muted [&_button:disabled]:text-muted [&_button:disabled]:opacity-100"
            aria-label={t("catalogPagination")}
          >
            <Button type="button" variant="outline" disabled>
              {t("catalogPrevious")}
            </Button>
            <span>{t("catalogPage", { page: 1 })}</span>
            <Button type="button" variant="outline" disabled>
              {t("catalogNext")}
            </Button>
          </nav>
        </div>
      </section>
    </>
  );
}
