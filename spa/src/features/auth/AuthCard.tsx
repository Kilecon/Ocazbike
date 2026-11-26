import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import logoUrl from "../../../public/assets/ocazbike-logo.png";

/** Centered card with the brand, used by the sign-in screens. */
export function AuthCard({
  titleId,
  kicker,
  title,
  intro,
  headerAction,
  children,
}: Readonly<{
  titleId: string;
  kicker?: ReactNode;
  title: ReactNode;
  intro: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
}>) {
  const { t } = useTranslation();
  return (
    <main className="oz-admin-layout grid min-h-screen place-items-center p-6">
      <section
        className="oz-card w-full max-w-[27.5rem] p-[clamp(1.5rem,5vw,2.5rem)] oz-focus-scope"
        aria-labelledby={titleId}
      >
        <div
          className={
            headerAction
              ? "mb-3 flex items-center justify-between gap-4"
              : "mb-5"
          }
        >
          <div className="flex w-fit items-center gap-2.5 font-[var(--font-display)] text-[1.05rem] font-bold text-foreground">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white">
              <img
                className="size-8 object-contain"
                src={logoUrl}
                alt=""
                aria-hidden="true"
              />
            </span>
            <span>{t("adminBrand").toUpperCase()}</span>
          </div>
          {headerAction}
        </div>
        {kicker && (
          <span className="text-[0.72rem] font-bold text-muted">{kicker}</span>
        )}
        <h1
          className="my-2 font-[var(--font-display)] text-[1.75rem] leading-[1.2] text-foreground"
          id={titleId}
        >
          {title}
        </h1>
        <p className="m-0 text-muted">{intro}</p>
        {children}
      </section>
    </main>
  );
}
