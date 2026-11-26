export const documentStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; color: #1f1f1f; background: #fff; font-family: Arial, sans-serif; font-size: 0.8125rem; line-height: 1.5; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm; background: #fff; }
  .topline, .totals { display: flex; justify-content: space-between; gap: 1.5rem; }
  .columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.5rem; }
  .pro-document-columns { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(9.0625rem, .75fr); gap: 0.75rem; }
  .pro-document-columns > div:nth-child(3) { padding-left: 0.5rem; }
  .pro-document-columns .nowrap, .pro-document-columns .contact-detail { font-size: 0.625rem; white-space: nowrap; }
  .topline { align-items: flex-start; padding-bottom: 1.5rem; border-bottom: 0.1875rem solid #7bd850; }
  .brand-block { display: flex; align-items: center; gap: 0.75rem; }
  /* Scaled visually so the enlarged logo does not change the header layout; shifted so its leftmost paint starts at the rule's left edge without being clipped by the print margin. */
  .logo { display: block; width: 4.375rem; height: auto; transform: translateX(-0.625rem) scale(1.2); transform-origin: left center; }
  .brand { margin: 0; color: #1f1f1f; font-size: 1rem; font-weight: 700; letter-spacing: .04em; }
  .eyebrow { margin: 0.1875rem 0 0; color: #6b6b6b; font-size: 0.6875rem; }
  h1 { margin: 0; color: #1f1f1f; font-size: 1.6875rem; }
  h2 { margin: 1.5rem 0 0.625rem; color: #3a7a1e; font-size: 0.75rem; text-transform: uppercase; letter-spacing: .06em; }
  p { margin: 0.25rem 0; }
  .number { margin-top: 0.3125rem; color: #6b6b6b; }
  .nowrap { white-space: nowrap; }
  .status { white-space: nowrap; }
  /* Centres the badge on the first eyebrow line. */
  .status { margin-top: 1.25rem; padding: 0.4375rem 0.75rem; color: #1f1f1f; background: #e9f8e2; border-radius: 1.25rem; font-size: 0.6875rem; font-weight: 700; }
  .columns { padding: 0.75rem 0 0.5rem; }
  .columns > div { min-width: 0; overflow-wrap: anywhere; }
  .columns .settled-date { font-size: inherit; }
  .muted { color: #6b6b6b; }
  table { width: 100%; margin-top: 1.5rem; border-collapse: separate; border-spacing: 0; text-align: left; }
  th { padding: 0.625rem 0.5rem; color: #1f1f1f; background: #e9f8e2; font-size: 0.625rem; text-transform: uppercase; letter-spacing: .04em; }
  td { padding: 0.75rem 0.5rem; border-bottom: 0.0625rem solid #e6e6e6; }
  .numeric { text-align: right; white-space: nowrap; }
  .document-summary { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; padding-top: 1.125rem; }
  .payment-info { align-self: flex-end; color: #6b6b6b; font-size: 0.6875rem; }
  .payment-info p { margin: 0.1875rem 0; }
  .payment-method.settled { display: inline-block; padding: 0.125rem 0.375rem; border: 0.0625rem solid #3a7a1e; border-radius: 0.25rem; color: #3a7a1e; }
  .totals { justify-content: flex-end; padding-top: 0; }
  .total-list { width: 14.375rem; }
  .total-row { display: flex; justify-content: space-between; padding: 0.3125rem 0; }
  .grand-total { margin-top: 0.4375rem; padding-top: 0.6875rem; border-top: 0.125rem solid #7bd850; color: #1f1f1f; font-size: 1.0625rem; font-weight: 700; }
  .notice { margin-top: 1.75rem; padding: 0.75rem 0.875rem; color: #4d4d4d; background: #f3fbef; border-left: 0.1875rem solid #7bd850; font-size: 0.6875rem; }
  .notice:empty { display: none; }
  footer { margin-top: 1.875rem; padding-top: 0.9375rem; border-top: 0.0625rem solid #e6e6e6; color: #6b6b6b; font-size: 0.625rem; text-align: center; }
  @media (max-width: 37.5rem) { .columns { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; } }
  @media (max-width: 26.25rem) { .columns { grid-template-columns: minmax(0, 1fr); } }
  /* Page margins (not sheet padding) so every printed page, including continuation pages, keeps them. */
  @page { size: A4; margin: 15mm; }
  @media print {
    *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { width: auto; min-height: 0; padding: 0; background: #fff; }
    /* Slightly under the 267mm printable height so rounding never adds a blank page. */
    .sheet { display: flex; flex-direction: column; width: auto; min-height: 266mm; max-width: none; margin: 0; padding: 0; overflow: visible; box-shadow: none; }
    .sheet > * { flex-shrink: 0; }
    .topline, .columns, .document-summary, .notice, footer { break-inside: avoid; }
    table { break-inside: auto; border-collapse: separate; border-spacing: 0; }
    tbody td { border-bottom: 0.0625rem solid #e6e6e6 !important; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    .document-summary { flex-grow: 1; }
    footer { margin-top: auto; }
  }
`;
