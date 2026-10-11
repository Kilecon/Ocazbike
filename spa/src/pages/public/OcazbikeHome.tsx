import {
  ArrowRight,
  Bike,
  Clock3,
  ExternalLink,
  MapPin,
  Phone,
  Repeat2,
  Settings2,
  Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";

const services = [
  {
    icon: Wrench,
    title: "publicServiceRepair",
    description: "publicServiceRepairText",
    details: [
      "publicRepairDetail1",
      "publicRepairDetail2",
      "publicRepairDetail3",
      "publicRepairDetail4",
    ],
    image: "https://s3.mizury.fr/ocazbike/reparation.webp",
  },
  {
    icon: Bike,
    title: "publicServiceSales",
    description: "publicServiceSalesText",
    details: [
      "publicSalesDetail1",
      "publicSalesDetail2",
      "publicSalesDetail3",
      "publicSalesDetail4",
    ],
  },
  {
    icon: Bike,
    title: "publicServiceRental",
    description: "publicServiceRentalText",
    details: [
      "publicRentalDetail1",
      "publicRentalDetail2",
      "publicRentalDetail3",
      "publicRentalDetail4",
    ],
  },
  {
    icon: Repeat2,
    title: "publicServiceBuyback",
    description: "publicServiceBuybackText",
    details: [
      "publicBuybackDetail1",
      "publicBuybackDetail2",
      "publicBuybackDetail3",
      "publicBuybackDetail4",
    ],
  },
  {
    icon: Repeat2,
    title: "publicServiceTradeIn",
    description: "publicServiceTradeInText",
    details: [
      "publicTradeInDetail1",
      "publicTradeInDetail2",
      "publicTradeInDetail3",
      "publicTradeInDetail4",
    ],
  },
  {
    icon: Settings2,
    title: "publicServiceMaintenance",
    description: "publicServiceMaintenanceText",
    details: [
      "publicMaintenanceDetail1",
      "publicMaintenanceDetail2",
      "publicMaintenanceDetail3",
      "publicMaintenanceDetail4",
    ],
  },
] as const;

const categories = [
  { label: "publicCategoryAll", value: "" },
  { label: "publicCategoryMountain", value: "VTT" },
  { label: "publicCategoryElectric", value: "Électrique" },
  { label: "publicCategoryRoad", value: "Route" },
  { label: "publicCategoryCity", value: "Urbain" },
  { label: "publicCategoryBmx", value: "BMX" },
  { label: "publicCategoryGravel", value: "Gravel" },
] as const;

export function OcazbikeHome() {
  const { t } = useTranslation();

  return (
    <>
      <section
        className="relative flex min-h-[min(780px,calc(100svh-68px))] items-center overflow-hidden bg-[var(--oz-page-surface)] max-[767px]:min-h-[760px] max-[767px]:items-end max-[480px]:min-h-[790px]"
        id="Presentation"
        aria-labelledby="home-title"
      >
        <div className="absolute inset-0 [&_img]:absolute [&_img]:inset-0 [&_img]:size-full [&_img]:object-cover [&_img]:[object-position:center_53%] max-[767px]:[&_img]:[object-position:60%_center]">
          <img
            src="https://s3.mizury.fr/ocazbike/Ocazbike_devanture.webp"
            alt={t("publicHeroImageAlt")}
          />
          <div className="oz-hero-overlay absolute inset-0" />
        </div>
        <div className="relative z-[1] mx-auto w-[min(1200px,calc(100%-48px))] py-[76px] pb-12 max-[767px]:w-[min(100%-32px,600px)] max-[767px]:py-0 max-[767px]:pb-8 max-[480px]:w-[min(100%-28px,440px)]">
          <div className="max-w-[690px]">
            <p className="mt-0 mb-3.5 text-[13px] font-bold tracking-[0.04em] text-primary uppercase">
              {t("publicHeroEyebrow")}
            </p>
            <h1
              className="m-0 text-[58px] leading-[1.08] font-bold text-foreground max-[767px]:text-[45px] max-[480px]:text-[39px]"
              id="home-title"
            >
              {t("publicHeroTitlePrefix")}
              <br />
              <span className="text-primary">{t("publicHeroTitleBike")}</span>{" "}
              <span className="text-primary italic">
                {t("publicHeroTitleCity")}
              </span>
            </h1>
            <p className="mt-[22px] max-w-[620px] text-[19px] leading-[1.65] text-muted max-[767px]:text-base">
              {t("publicHeroText")}
            </p>
            <div className="mt-[27px] flex flex-wrap gap-3.5 max-[767px]:mx-auto max-[767px]:max-w-[330px] max-[767px]:flex-col max-[767px]:items-stretch">
              <Button
                asChild
                className="min-h-[50px] gap-[9px] rounded-md border border-primary bg-primary px-[21px] text-[15px] text-[var(--oz-on-dark)] hover:bg-primary-hover hover:text-[var(--oz-on-dark)] dark:text-[#0d1715] max-[480px]:w-full"
              >
                <a href="#services">
                  {t("publicServicesCta")}
                  <ArrowRight aria-hidden="true" size={18} />
                </a>
              </Button>
              <Button
                asChild
                className="min-h-[50px] gap-[9px] rounded-md border border-primary bg-surface px-[21px] text-[15px] text-primary hover:bg-[var(--oz-outline-hover)] max-[480px]:w-full"
                variant="outline"
              >
                <a href="/velo">{t("publicBikesCta")}</a>
              </Button>
            </div>
          </div>
          <section
            className="mt-12 grid max-w-[820px] grid-cols-3 gap-3 max-[767px]:mt-[25px] max-[767px]:grid-cols-1 max-[767px]:gap-2"
            aria-labelledby="quick-info-title"
          >
            <h2 className="sr-only" id="quick-info-title">
              {t("publicQuickInfoLabel")}
            </h2>
            <div className="grid min-h-[91px] grid-cols-[24px_minmax(0,1fr)] content-center gap-x-3 rounded-lg border border-border bg-surface p-[15px] shadow-[0_4px_15px_var(--oz-card-shadow)] max-[767px]:min-h-[67px] max-[767px]:p-[10px_13px] [&_svg]:row-span-2 [&_svg]:mt-0.5 [&_svg]:size-[21px] [&_svg]:text-primary [&_span]:text-sm [&_span]:font-bold [&_small]:text-xs [&_small]:text-muted">
              <MapPin aria-hidden="true" />
              <span>{t("publicAddressValue")}</span>
              <small>{t("publicAddressPending")}</small>
            </div>
            <div className="grid min-h-[91px] grid-cols-[24px_minmax(0,1fr)] content-center gap-x-3 rounded-lg border border-border bg-surface p-[15px] shadow-[0_4px_15px_var(--oz-card-shadow)] max-[767px]:min-h-[67px] max-[767px]:p-[10px_13px] [&_svg]:row-span-2 [&_svg]:mt-0.5 [&_svg]:size-[21px] [&_svg]:text-primary [&_span]:text-sm [&_span]:font-bold [&_small]:text-xs [&_small]:text-muted">
              <Phone aria-hidden="true" />
              <span>{t("publicPhonePending")}</span>
              <small>{t("publicPhoneCaption")}</small>
            </div>
            <div className="grid min-h-[91px] grid-cols-[24px_minmax(0,1fr)] content-center gap-x-3 rounded-lg border border-border bg-surface p-[15px] shadow-[0_4px_15px_var(--oz-card-shadow)] max-[767px]:min-h-[67px] max-[767px]:p-[10px_13px] [&_svg]:row-span-2 [&_svg]:mt-0.5 [&_svg]:size-[21px] [&_svg]:text-primary [&_span]:text-sm [&_span]:font-bold [&_small]:text-xs [&_small]:text-muted">
              <Clock3 aria-hidden="true" />
              <span>{t("publicHoursPending")}</span>
              <small>{t("publicHoursCaption")}</small>
            </div>
          </section>
        </div>
      </section>

      <section
        className="bg-[linear-gradient(180deg,var(--oz-page-bg)_0%,var(--oz-soft)_100%)] px-0 py-[82px] max-[767px]:py-16"
        id="services"
        aria-labelledby="services-title"
      >
        <div className="mx-auto w-[min(1200px,calc(100%-48px))] max-[767px]:w-[min(100%-32px,600px)] max-[480px]:w-[min(100%-28px,440px)]">
          <header className="mx-auto mb-[43px] max-w-[790px] text-center max-[767px]:mb-[31px] [&>h2]:m-0 [&>h2]:text-[38px] [&>h2]:leading-[1.2] [&>h2]:font-bold [&>h2]:text-foreground max-[767px]:[&>h2]:text-[31px] [&>p]:mt-[14px] [&>p]:mb-0 [&>p]:text-base [&>p]:leading-[1.65] [&>p]:text-muted max-[767px]:[&>p]:text-[15px]">
            <h2 id="services-title">{t("publicServicesTitle")}</h2>
            <p>{t("publicServicesIntro")}</p>
          </header>
          <div className="grid grid-cols-3 gap-6 max-[767px]:grid-cols-2 max-[767px]:gap-[15px] max-[480px]:grid-cols-1">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article
                  className="flex min-w-0 flex-col rounded-lg border border-border bg-surface p-[25px] shadow-[0_4px_18px_var(--oz-card-shadow)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(21,128,61,0.45)] hover:shadow-[0_9px_25px_rgba(31,41,55,0.11)] max-[767px]:p-[18px] forced-colors:border-[CanvasText]"
                  key={service.title}
                >
                  <div
                    className="mx-auto mb-4 grid size-[62px] place-items-center rounded-full bg-surface-muted text-primary [&_svg]:size-[29px]"
                    aria-hidden="true"
                  >
                    <Icon />
                  </div>
                  <h3 className="m-0 text-center text-[21px] font-bold text-foreground max-[767px]:text-lg">
                    {t(service.title)}
                  </h3>
                  <p className="mt-2 mb-4 min-h-12 text-center text-sm text-muted max-[767px]:min-h-16 max-[767px]:text-[13px] max-[480px]:min-h-0">
                    {t(service.description)}
                  </p>
                  {"image" in service && (
                    <img
                      className="mb-[17px] h-[148px] w-full rounded-md bg-surface-muted object-cover"
                      src={service.image}
                      alt={t("publicRepairImageAlt")}
                      loading="lazy"
                    />
                  )}
                  <ul className="mb-[23px] mt-0 grid list-none gap-[9px] p-0 [&>li]:flex [&>li]:items-start [&>li]:gap-2.5 [&>li]:text-[13px] [&>li]:leading-[1.45] [&>li]:text-muted max-[767px]:[&>li]:text-xs [&_li>span]:mt-[5px] [&_li>span]:size-2 [&_li>span]:shrink-0 [&_li>span]:rounded-full [&_li>span]:bg-[var(--oz-primary)]">
                    {service.details.map((detail) => (
                      <li key={detail}>
                        <span aria-hidden="true" />
                        {t(detail)}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="mt-auto min-h-11 w-full rounded-md border border-primary bg-surface text-primary hover:bg-[var(--oz-outline-hover)]"
                    size="sm"
                    variant="outline"
                  >
                    <a
                      href="#contact"
                      aria-label={t("publicLearnMore", {
                        service: t(service.title),
                      })}
                    >
                      {t("publicLearnMoreText")}
                    </a>
                  </Button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="bg-[var(--oz-page-bg)] px-0 py-[82px] max-[767px]:py-16"
        id="bikes"
        aria-labelledby="bikes-title"
      >
        <div className="mx-auto w-[min(1200px,calc(100%-48px))] max-[767px]:w-[min(100%-32px,600px)] max-[480px]:w-[min(100%-28px,440px)]">
          <header className="mx-auto mb-[43px] max-w-[790px] text-center max-[767px]:mb-[31px] [&>h2]:m-0 [&>h2]:text-[38px] [&>h2]:leading-[1.2] [&>h2]:font-bold [&>h2]:text-foreground max-[767px]:[&>h2]:text-[31px] [&>p]:mt-[14px] [&>p]:mb-0 [&>p]:text-base [&>p]:leading-[1.65] [&>p]:text-muted max-[767px]:[&>p]:text-[15px]">
            <h2 id="bikes-title">{t("publicBikesTitle")}</h2>
            <p>{t("publicBikesIntro")}</p>
          </header>
          <nav
            className="mx-auto mb-[29px] flex flex-wrap justify-center gap-[9px]"
            aria-label={t("publicCategoryNavigation")}
          >
            {categories.map((category) => (
              <a
                className={`inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-[13px] font-semibold no-underline transition-colors ${category.value === "" ? "border-primary bg-primary text-[var(--oz-on-dark)] dark:text-[#0d1715]" : "border-border bg-surface text-foreground hover:border-primary hover:bg-primary hover:text-[var(--oz-on-dark)] dark:hover:text-[#0d1715]"}`}
                href={
                  category.value
                    ? `/velo?category=${encodeURIComponent(category.value)}`
                    : "/velo"
                }
                key={category.value || "all"}
              >
                {t(category.label)}
              </a>
            ))}
          </nav>
          <div
            className="flex min-h-[230px] flex-col items-center justify-center rounded-lg border border-border bg-surface-muted p-8 text-center forced-colors:border-[CanvasText]"
            role="status"
            aria-live="polite"
          >
            <Bike
              className="mb-[15px] size-[38px] text-primary"
              aria-hidden="true"
            />
            <h3 className="m-0 text-[19px] font-bold text-foreground">
              {t("publicBikesEmptyTitle")}
            </h3>
            <p className="mt-[9px] mb-0 max-w-[540px] text-sm text-muted">
              {t("publicBikesEmptyText")}
            </p>
          </div>
          <div className="mt-[30px] text-center">
            <Button
              asChild
              className="min-h-11 rounded-md border border-primary bg-surface text-primary hover:bg-[var(--oz-outline-hover)]"
              variant="outline"
            >
              <a href="/velo">{t("publicAllBikesCta")}</a>
            </Button>
          </div>
        </div>
      </section>

      <section
        className="bg-[linear-gradient(180deg,var(--oz-panel-soft)_0%,var(--oz-page-bg)_100%)] px-0 py-[82px] max-[767px]:py-16"
        id="reviews"
        aria-labelledby="reviews-title"
      >
        <div className="mx-auto w-[min(1200px,calc(100%-48px))] max-[767px]:w-[min(100%-32px,600px)] max-[480px]:w-[min(100%-28px,440px)]">
          <header className="mx-auto mb-[43px] max-w-[790px] text-center max-[767px]:mb-[31px] [&>h2]:m-0 [&>h2]:text-[38px] [&>h2]:leading-[1.2] [&>h2]:font-bold [&>h2]:text-foreground max-[767px]:[&>h2]:text-[31px] [&>p]:mt-[14px] [&>p]:mb-0 [&>p]:text-base [&>p]:leading-[1.65] [&>p]:text-muted max-[767px]:[&>p]:text-[15px]">
            <h2 id="reviews-title">{t("publicReviewsTitle")}</h2>
            <p>{t("publicReviewsIntro")}</p>
          </header>
          <div
            className="mx-auto max-w-[800px] rounded-lg border border-border bg-surface px-8 py-[27px] text-center text-muted shadow-[0_4px_18px_var(--oz-card-shadow)] forced-colors:border-[CanvasText]"
            role="status"
            aria-live="polite"
          >
            <p className="m-0">{t("publicReviewsEmpty")}</p>
          </div>
        </div>
      </section>

      <section
        className="bg-[var(--oz-soft)] px-0 py-[82px] max-[767px]:py-16"
        id="contact"
        aria-labelledby="contact-title"
      >
        <div className="mx-auto w-[min(1200px,calc(100%-48px))] max-[767px]:w-[min(100%-32px,600px)] max-[480px]:w-[min(100%-28px,440px)]">
          <header className="mx-auto mb-[43px] max-w-[790px] text-center max-[767px]:mb-[31px] [&>h2]:m-0 [&>h2]:text-[38px] [&>h2]:leading-[1.2] [&>h2]:font-bold [&>h2]:text-foreground max-[767px]:[&>h2]:text-[31px] [&>p]:mt-[14px] [&>p]:mb-0 [&>p]:text-base [&>p]:leading-[1.65] [&>p]:text-muted max-[767px]:[&>p]:text-[15px]">
            <h2 id="contact-title">{t("publicContactTitle")}</h2>
            <p>{t("publicContactIntro")}</p>
          </header>
          <div className="grid grid-cols-2 items-start gap-8 max-[767px]:grid-cols-1 max-[767px]:gap-[26px]">
            <div>
              <h3 className="mt-0 mb-[19px] text-[23px] font-bold text-foreground">
                {t("publicContactPanelLabel")}
              </h3>
              <div className="grid grid-cols-2 gap-[13px] max-[480px]:grid-cols-1">
                <div className="flex min-h-[105px] items-start gap-3 rounded-lg border border-border bg-surface p-4 forced-colors:border-[CanvasText]">
                  <MapPin
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <h4 className="mt-0 mb-1 text-sm text-foreground">
                      {t("contactAddressLabel")}
                    </h4>
                    <p className="m-0 text-[13px] text-muted">
                      {t("publicAddressValue")}
                    </p>
                    <small className="mt-[3px] block text-[11px] text-muted">
                      {t("publicAddressPending")}
                    </small>
                  </div>
                </div>
                <div className="flex min-h-[105px] items-start gap-3 rounded-lg border border-border bg-surface p-4 forced-colors:border-[CanvasText]">
                  <Phone
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <h4 className="mt-0 mb-1 text-sm text-foreground">
                      {t("contactPhoneLabel")}
                    </h4>
                    <p className="m-0 text-[13px] text-muted">
                      {t("publicPhonePending")}
                    </p>
                    <small className="mt-[3px] block text-[11px] text-muted">
                      {t("publicPhoneCaption")}
                    </small>
                  </div>
                </div>
                <div className="flex min-h-[105px] items-start gap-3 rounded-lg border border-border bg-surface p-4 forced-colors:border-[CanvasText]">
                  <Clock3
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <h4 className="mt-0 mb-1 text-sm text-foreground">
                      {t("contactHoursLabel")}
                    </h4>
                    <p className="m-0 text-[13px] text-muted">
                      {t("publicHoursPending")}
                    </p>
                    <small className="mt-[3px] block text-[11px] text-muted">
                      {t("publicHoursCaption")}
                    </small>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <iframe
                  className="block min-h-[205px] w-full rounded-lg border border-[#c8d5cd] bg-[#e8f1ed] [aspect-ratio:16/9]"
                  src="https://www.google.com/maps?q=44.8835997,-0.6496945&z=17&output=embed"
                  title={t("publicMapFrameTitle")}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <Button
                  asChild
                  className="min-h-10 justify-self-start gap-2"
                  size="sm"
                  variant="outline"
                >
                  <a
                    href="https://www.google.com/maps/place/Ocazbike/@44.8835997,-0.6496945,17z/data=!3m1!4b1!4m6!3m5!1s0xd54d755ddaf5e95:0x73075ef68c26d72e!8m2!3d44.8835997!4d-0.6496945!16s%2Fg%2F11s31_9y35?entry=ttu&g_ep=EgoyMDI2MDkyMy4wIKXMDSoASAFQAw%3D%3D"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {t("publicMapOpenLink")}
                    <ExternalLink aria-hidden="true" size={15} />
                  </a>
                </Button>
              </div>
            </div>

            <section
              className="rounded-lg border border-border bg-surface p-[25px] shadow-[0_4px_20px_var(--oz-card-shadow)] forced-colors:border-[CanvasText] max-[480px]:p-[19px]"
              aria-labelledby="contact-form-title"
            >
              <h3
                className="mt-0 mb-[5px] text-[23px] font-bold text-foreground"
                id="contact-form-title"
              >
                {t("publicContactFormTitle")}
              </h3>
              <p className="mt-0 mb-5 text-sm text-muted">
                {t("publicContactFormIntro")}
              </p>
              <form
                className="grid gap-[15px]"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="grid grid-cols-2 gap-[13px] max-[480px]:grid-cols-1">
                  <div className="grid min-w-0 gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-[43px] [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-sm [&_input]:text-foreground [&_label>span]:text-[#9b1c1c]">
                    <label htmlFor="contact-first-name">
                      {t("contactFirstName")} <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="contact-first-name"
                      name="firstName"
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className="grid min-w-0 gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-[43px] [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-sm [&_input]:text-foreground [&_label>span]:text-[#9b1c1c]">
                    <label htmlFor="contact-last-name">
                      {t("contactLastName")} <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="contact-last-name"
                      name="lastName"
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
                <div className="grid min-w-0 gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-[43px] [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-sm [&_input]:text-foreground [&_label>span]:text-[#9b1c1c]">
                  <label htmlFor="contact-email">
                    {t("contactEmail")} <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="grid min-w-0 gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-[43px] [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-sm [&_input]:text-foreground [&_label>span]:text-[#9b1c1c]">
                  <label htmlFor="contact-phone">{t("contactPhone")}</label>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                  />
                </div>
                <div className="grid min-w-0 gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-[43px] [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-sm [&_input]:text-foreground [&_label>span]:text-[#9b1c1c]">
                  <label htmlFor="contact-subject">
                    {t("contactSubject")} <span aria-hidden="true">*</span>
                  </label>
                  <input id="contact-subject" name="subject" required />
                </div>
                <div className="grid min-w-0 gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-foreground [&_textarea]:min-h-[118px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-md [&_textarea]:border [&_textarea]:border-control-border [&_textarea]:bg-surface [&_textarea]:px-[11px] [&_textarea]:py-[9px] [&_textarea]:text-sm [&_textarea]:text-foreground [&_label>span]:text-[#9b1c1c]">
                  <label htmlFor="contact-message">
                    {t("contactMessage")} <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    required
                  />
                </div>
                <p className="m-0 text-xs leading-[1.55] text-muted">
                  {t("publicPrivacyCopy")}
                </p>
                <Button
                  className="min-h-11 w-full rounded-md border border-primary bg-primary text-[var(--oz-on-dark)] hover:bg-primary-hover dark:text-[#0d1715] disabled:cursor-not-allowed disabled:border-[#4b5563] disabled:bg-[#4b5563] disabled:text-white disabled:opacity-100"
                  type="submit"
                  disabled
                  aria-describedby="contact-submit-note"
                >
                  {t("publicContactSubmit")}
                </Button>
                <p
                  className="m-0 text-xs leading-[1.55] text-muted"
                  id="contact-submit-note"
                  role="status"
                >
                  {t("publicContactPendingSubmit")}
                </p>
              </form>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
