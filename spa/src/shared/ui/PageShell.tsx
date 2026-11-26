import type { ReactNode } from "react";

export function PageShell({
  labelledBy,
  children,
}: Readonly<{
  labelledBy: string;
  children: ReactNode;
}>) {
  return (
    <main
      className="min-h-screen min-w-0 flex-1 p-[clamp(1.5rem,4vw,3.5rem)] max-[45rem]:min-h-0 max-[45rem]:px-4 max-[45rem]:pt-6 max-[45rem]:pb-10 oz-focus-scope"
      aria-labelledby={labelledBy}
    >
      {children}
    </main>
  );
}

export function PageHeader({
  titleId,
  kicker,
  title,
  intro,
  actions,
}: Readonly<{
  titleId: string;
  kicker: ReactNode;
  title: ReactNode;
  intro: ReactNode;
  actions?: ReactNode;
}>) {
  return (
    <header
      className={
        actions
          ? "mx-auto mb-6 flex flex-wrap items-start justify-between gap-4"
          : "mx-auto mb-6"
      }
    >
      <div>
        <span className="text-[0.72rem] font-bold text-muted">{kicker}</span>
        <h1
          className="mt-1 mb-0 font-[var(--font-display)] text-2xl leading-[1.2] font-bold text-foreground"
          id={titleId}
        >
          {title}
        </h1>
        <p className="mt-1 mb-0 max-w-[38.75rem] leading-6 text-muted">
          {intro}
        </p>
      </div>
      {actions}
    </header>
  );
}
