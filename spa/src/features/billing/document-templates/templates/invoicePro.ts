import { createDocumentHtml } from "./layout";

export const invoiceProTemplate = createDocumentHtml(
  `
    <header class="topline">
      <div>
        <p class="brand">{{company_name}}</p>
        <p class="eyebrow">RÉPARATION, VENTE-RACHAT<br>&amp; LOCATION DE VÉLOS - Eysines</p>
      </div>
      <div>
        <h1>{{document_title}}</h1>
        <p class="number">N° {{document_number}}</p>
      </div>
      <span class="status">{{document_status}}</span>
    </header>
    <section class="columns pro-document-columns">
      <div>
        <h2>{{company_role}}</h2>
        <p><strong>{{company_name}}</strong></p>
        <p class="muted">{{company_address}}</p>
        <p class="muted">{{company_phone}}</p>
        <p class="muted contact-detail">{{company_email}}</p>
        <p class="muted contact-detail">{{company_legal_details}}</p>
        <p class="muted contact-detail">{{company_vat_details}}</p>
      </div>
      <div>
        <h2>{{client_role}}</h2>
        <p><strong>{{client_company}}</strong></p>
        <p class="muted">{{client_address}}</p>
        <p class="muted">{{client_phone}}</p>
        <p class="muted contact-detail">{{client_email}}</p>
        <p class="muted contact-detail">SIRET : {{client_siret}}</p>
        <p class="muted contact-detail">N° TVA intracom : {{client_vat_number}}</p>
      </div>
      <div>
        <h2>Facturation</h2>
        <p>Date : {{document_date}}</p>
        {{settled_details}}
      </div>
    </section>
    <table>
      <thead><tr><th>Désignation</th><th class="numeric">Qté</th><th class="numeric">PU HT</th><th class="numeric">PU TTC</th><th class="numeric">TOTAL</th></tr></thead>
      <tbody>{{line_items}}</tbody>
    </table>
    <section class="document-summary">
      <div class="payment-info">
        <p><strong>{{payment_label}}</strong> {{payment_details}}</p>
        {{bank_details}}
      </div>
      <section class="totals">
        <div class="total-list">
          <div class="total-row"><span>Total HT</span><span>{{subtotal}}</span></div>
          <div class="total-row"><span>TVA</span><span>{{tax_total}}</span></div>
          <div class="total-row grand-total"><span>{{total_label}}</span><span>{{total}}</span></div>
        </div>
      </section>
    </section>
    <footer>{{company_invoice_footer}}</footer>`,
);
