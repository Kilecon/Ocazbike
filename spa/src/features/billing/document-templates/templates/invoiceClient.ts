import { createDocumentHtml } from "./layout";

export const invoiceClientTemplate = createDocumentHtml(`
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
    <section class="columns">
      <div>
        <h2>{{company_role}}</h2>
        <p><strong>{{company_name}}</strong></p>
        <p class="muted">{{company_address}}</p>
        <p class="muted">{{company_phone}}</p>
        <p class="muted">{{company_email}}</p>
      </div>
      <div>
        <h2>{{client_role}}</h2>
        <p><strong>{{client_name}}</strong></p>
        <p class="muted">{{client_address}}</p>
        <p class="muted">{{client_phone}}</p>
        <p class="muted">{{client_email}}</p>
      </div>
      <div>
        <h2>Détails</h2>
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
          <div class="total-row"><span>Sous-total HT</span><span>{{subtotal}}</span></div>
          <div class="total-row"><span>TVA</span><span>{{tax_total}}</span></div>
          <div class="total-row grand-total"><span>{{total_label}}</span><span>{{total}}</span></div>
        </div>
      </section>
    </section>
    <p class="notice">{{legal_notices}}</p>
    <footer>{{company_consumer_footer}}</footer>`);
