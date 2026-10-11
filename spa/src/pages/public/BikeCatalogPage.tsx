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
        className="relative flex min-h-[285px] items-center overflow-hidden border-b-4 border-primary"
        aria-labelledby="catalog-title"
      >
        <img
          className="absolute inset-0 size-full object-cover [object-position:center_54%]"
          src="https://s3.mizury.fr/ocazbike/Ocazbike_devanture.webp"
          alt={t("publicHeroImageAlt")}
        />
        <div className="oz-catalog-overlay absolute inset-0" />
        <div className="relative z-[1] mx-auto w-[min(1200px,calc(100%-48px))] py-[52px] max-[767px]:w-[min(100%-32px,600px)] max-[767px]:py-[42px] max-[480px]:w-[min(100%-28px,440px)]">
          <p className="mt-0 mb-3.5 text-[13px] font-bold tracking-[0.04em] text-primary uppercase">
            {t("publicCatalogEyebrow")}
          </p>
          <h1
            className="m-0 text-[50px] leading-[1.1] font-bold text-foreground max-[767px]:text-[41px]"
            id="catalog-title"
          >
            {t("publicCatalogTitle")}
          </h1>
        </div>
      </section>

      <section
        className="mx-auto w-[min(1200px,calc(100%-48px))] py-[30px] pb-[72px] max-[767px]:w-[min(100%-32px,600px)] max-[767px]:py-[23px] max-[767px]:pb-[55px] max-[480px]:w-[min(100%-28px,440px)]"
        aria-label={t("publicCatalogTitle")}
      >
        <nav
          className="mb-[23px] flex flex-wrap justify-start gap-[9px] max-[767px]:flex-nowrap max-[767px]:overflow-x-auto max-[767px]:px-[3px] max-[767px]:pt-[3px] max-[767px]:pb-[9px] max-[767px]:[scrollbar-width:thin]"
          aria-label={t("publicCategoryNavigation")}
        >
          {categories.map((category) => (
            <a
              className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border px-4 py-2 text-[13px] font-semibold no-underline transition-colors ${filters.category === category.value ? "border-primary bg-primary text-[var(--oz-on-dark)] dark:text-[#0d1715]" : "border-border bg-surface text-foreground hover:border-primary hover:bg-primary hover:text-[var(--oz-on-dark)] dark:hover:text-[#0d1715]"}`}
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
          className="grid grid-cols-[minmax(200px,1.4fr)_minmax(155px,0.9fr)_minmax(190px,1fr)_minmax(210px,1.15fr)_auto] items-end gap-4 rounded-lg border border-border bg-surface-muted p-5 max-[1060px]:grid-cols-2 max-[1060px]:[&>.oz-filter-search]:col-span-full max-[1060px]:[&>.oz-filter-note]:col-span-full max-[767px]:grid-cols-1 max-[767px]:p-4 max-[767px]:[&>.oz-filter-search]:col-auto"
          aria-label={t("publicCatalogFilters")}
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="oz-filter-search grid min-w-0 gap-1.5 max-[1060px]:col-span-full max-[767px]:col-auto [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-[43px] [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-sm [&_input]:text-foreground">
            <label htmlFor="bike-search">{t("catalogSearch")}</label>
            <input
              id="bike-search"
              type="search"
              value={filters.query}
              onChange={(event) => update({ query: event.target.value })}
              placeholder={t("catalogSearchPlaceholder")}
            />
          </div>
          <div className="oz-field grid min-w-0 gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_select]:min-h-[80px] [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-control-border [&_select]:bg-surface [&_select]:p-[5px] [&_select]:text-sm [&_select]:text-foreground [&_small]:text-[11px] [&_small]:text-muted">
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
            <legend className="mb-1.5 text-[13px] font-semibold text-foreground">
              {t("catalogPriceRange")}
            </legend>
            <div className="grid grid-cols-2 gap-2.5 max-[480px]:grid-cols-1">
              <div className="oz-field grid min-w-0 gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-[43px] [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-sm [&_input]:text-foreground">
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
              <div className="oz-field grid min-w-0 gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-[43px] [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-sm [&_input]:text-foreground">
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
          <div className="grid grid-cols-2 gap-2.5 max-[480px]:grid-cols-1">
            <div className="oz-field grid min-w-0 gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_select]:min-h-[43px] [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-control-border [&_select]:bg-surface [&_select]:px-[11px] [&_select]:py-[9px] [&_select]:text-sm [&_select]:text-foreground">
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
            <div className="oz-field grid min-w-0 gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_select]:min-h-[43px] [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-control-border [&_select]:bg-surface [&_select]:px-[11px] [&_select]:py-[9px] [&_select]:text-sm [&_select]:text-foreground">
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
            className="oz-filter-note col-span-full m-0 text-xs text-muted max-[767px]:col-auto"
            role="note"
          >
            {t("catalogApiNote")}
          </p>
        </form>

        <div className="mt-[35px]" aria-live="polite">
          <div className="mb-[17px]">
            <h2 className="m-0 text-[23px] text-foreground">
              {t("catalogResultsTitle")}
            </h2>
          </div>
          <div
            className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-border bg-surface-muted p-8 text-center forced-colors:border-[CanvasText]"
            role="status"
          >
            <Bike
              className="mb-[15px] size-[38px] text-primary"
              aria-hidden="true"
            />
            <h3 className="m-0 text-[19px] font-bold text-foreground">
              {t("catalogEmptyTitle")}
            </h3>
            <p className="mt-[9px] mb-0 max-w-[540px] text-sm text-muted">
              {t("catalogEmptyText")}
            </p>
          </div>
          <nav
            className="mt-6 flex items-center justify-center gap-[18px] [&>span]:text-sm [&>span]:tabular-nums [&>span]:text-muted [&_button:disabled]:border-border [&_button:disabled]:bg-surface-muted [&_button:disabled]:text-muted [&_button:disabled]:opacity-100"
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
