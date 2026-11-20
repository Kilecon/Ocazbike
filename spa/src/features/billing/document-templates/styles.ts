export const documentStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; color: #1f1f1f; background: #fff; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm; background: #fff; }
  .topline, .totals { display: flex; justify-content: space-between; gap: 24px; }
  .columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
  .pro-document-columns { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(145px, .75fr); gap: 12px; }
  .pro-document-columns > div:nth-child(3) { padding-left: 8px; }
  .pro-document-columns .nowrap, .pro-document-columns .contact-detail { font-size: 10px; white-space: nowrap; }
  .topline { align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid #7bd850; }
  .brand-block { display: flex; align-items: center; gap: 12px; }
  /* Scaled visually so the enlarged logo does not change the header layout; shifted so its leftmost paint starts at the rule's left edge without being clipped by the print margin. */
  .logo { display: block; width: 70px; height: auto; transform: translateX(-10px) scale(1.2); transform-origin: left center; }
  .brand { margin: 0; color: #1f1f1f; font-size: 16px; font-weight: 700; letter-spacing: .04em; }
  .eyebrow { margin: 3px 0 0; color: #6b6b6b; font-size: 11px; }
  h1 { margin: 0; color: #1f1f1f; font-size: 27px; }
  h2 { margin: 24px 0 10px; color: #3a7a1e; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
  p { margin: 4px 0; }
  .number { margin-top: 5px; color: #6b6b6b; }
  .nowrap { white-space: nowrap; }
  .status { white-space: nowrap; }
  /* Centres the badge on the first eyebrow line: brand line (24px) + eyebrow margin (3px) + half a line (8.25px) - half the badge (15.25px). */
  .status { margin-top: 20px; padding: 7px 12px; color: #1f1f1f; background: #e9f8e2; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .columns { padding: 12px 0 8px; }
  .columns > div { min-width: 0; overflow-wrap: anywhere; }
  .settled-date { font-size: 11px; }
  .muted { color: #6b6b6b; }
  table { width: 100%; margin-top: 24px; border-collapse: separate; border-spacing: 0; text-align: left; }
  th { padding: 10px 8px; color: #1f1f1f; background: #e9f8e2; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  td { padding: 12px 8px; border-bottom: 1px solid #e6e6e6; }
  .numeric { text-align: right; white-space: nowrap; }
  .document-summary { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-top: 18px; }
  .payment-info { align-self: flex-end; color: #6b6b6b; font-size: 11px; }
  .payment-info p { margin: 3px 0; }
  .payment-method.settled { display: inline-block; padding: 2px 6px; border: 1px solid #3a7a1e; border-radius: 4px; color: #3a7a1e; }
  .totals { justify-content: flex-end; padding-top: 0; }
  .total-list { width: 230px; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
  .grand-total { margin-top: 7px; padding-top: 11px; border-top: 2px solid #7bd850; color: #1f1f1f; font-size: 17px; font-weight: 700; }
  .notice { margin-top: 28px; padding: 12px 14px; color: #4d4d4d; background: #f3fbef; border-left: 3px solid #7bd850; font-size: 11px; }
  .notice:empty { display: none; }
  footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e6e6e6; color: #6b6b6b; font-size: 10px; text-align: center; }
  @media (max-width: 600px) { .columns { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; } }
  @media (max-width: 420px) { .columns { grid-template-columns: minmax(0, 1fr); } }
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
    tbody td { border-bottom: 1px solid #e6e6e6 !important; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    .document-summary { flex-grow: 1; }
    footer { margin-top: auto; }
  }
`;
