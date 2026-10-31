export const documentStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; color: #23332e; background: #fff; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm; background: #fff; }
  .topline, .totals { display: flex; justify-content: space-between; gap: 24px; }
  .columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
  .pro-document-columns { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(145px, .75fr); gap: 12px; }
  .pro-document-columns > div:nth-child(3) { padding-left: 8px; }
  .pro-document-columns .nowrap, .pro-document-columns .contact-detail { font-size: 10px; white-space: nowrap; }
  .topline { align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #e8eee9; }
  .brand { margin: 0; color: #23614b; font-size: 16px; font-weight: 700; letter-spacing: .04em; }
  .eyebrow { margin: 3px 0 0; color: #78877f; font-size: 11px; }
  h1 { margin: 0; color: #193d30; font-size: 27px; }
  h2 { margin: 24px 0 10px; color: #344b40; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
  p { margin: 4px 0; }
  .number { margin-top: 5px; color: #6b7972; }
  .nowrap { white-space: nowrap; }
  .status { white-space: nowrap; }
  .status { padding: 7px 12px; color: #23614b; background: #e8f4ed; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .columns { padding: 12px 0 8px; }
  .columns > div { min-width: 0; overflow-wrap: anywhere; }
  .settled-date { font-size: 11px; }
  .muted { color: #6b7972; }
  table { width: 100%; margin-top: 24px; border-collapse: separate; border-spacing: 0; text-align: left; }
  th { padding: 10px 8px; color: #65756c; background: #f4f7f4; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  td { padding: 12px 8px; border-bottom: 1px solid #e8eee9; }
  .numeric { text-align: right; white-space: nowrap; }
  .document-summary { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-top: 18px; }
  .payment-info { align-self: flex-end; color: #65756c; font-size: 11px; }
  .payment-info p { margin: 3px 0; }
  .payment-method.settled { display: inline-block; padding: 2px 6px; border: 1px solid #23614b; border-radius: 4px; color: #23614b; }
  .totals { justify-content: flex-end; padding-top: 0; }
  .total-list { width: 230px; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
  .grand-total { margin-top: 7px; padding-top: 11px; border-top: 1px solid #cbd6ce; color: #193d30; font-size: 17px; font-weight: 700; }
  .notice { margin-top: 28px; padding: 12px 14px; color: #65756c; background: #f4f7f4; font-size: 11px; }
  footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e8eee9; color: #78877f; font-size: 10px; text-align: center; }
  @media (max-width: 600px) { .columns { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; } }
  @media (max-width: 420px) { .columns { grid-template-columns: minmax(0, 1fr); } }
  @page { size: A4; margin: 0; }
  @media print {
    *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { width: 210mm; min-height: 0; padding: 0; background: #fff; }
    .sheet { display: flex; flex-direction: column; width: 210mm; min-height: 297mm; max-width: none; margin: 0; padding: 15mm; overflow: visible; box-shadow: none; }
    .sheet > * { flex-shrink: 0; }
    .topline, .columns, .document-summary, .notice, footer { break-inside: avoid; }
    table { break-inside: auto; border-collapse: separate; border-spacing: 0; }
    tbody td { border-bottom: 1px solid #e8eee9 !important; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    .document-summary { flex-grow: 1; }
    footer { margin-top: auto; }
  }
`;
