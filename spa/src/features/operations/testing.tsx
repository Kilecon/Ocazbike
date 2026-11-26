import { useState } from "react";
import { OperationsPage } from "./OperationsPage";
import type { BillingOperationDTO } from "./types";

export function createBillingOperation(
  overrides: Partial<BillingOperationDTO> = {},
): BillingOperationDTO {
  return {
    id: 42,
    clientId: 1,
    type: "rental",
    date: Date.UTC(2026, 9, 1, 12),
    serviceStartAt: Date.UTC(2026, 9, 2, 12),
    serviceEndAt: Date.UTC(2026, 9, 8, 12),
    comment: "Location prévue",
    status: "in_progress",
    paymentMethod: null,
    paidAt: null,
    lines: [
      {
        id: 1,
        billingDocumentId: 42,
        description: "Vélo",
        quantity: "1",
        unitPrice: "10",
        vatRate: "0",
        discount: "0",
        total: "10",
      },
    ],
    client: {
      id: 1,
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.test",
      phonenumber: "",
      address: null,
      addressComplement: null,
      isProfessional: false,
      companyName: null,
      siret: null,
    },
    snapshots: [
      {
        kind: "quote",
        status: "accepted",
        createdAt: Date.UTC(2026, 9, 1, 12),
        updatedAt: Date.UTC(2026, 9, 1, 13),
        payload: {},
      },
    ],
    ...overrides,
  };
}

/** Repairs list whose detail dialog selection lives in local state. */
export function RepairsPage({
  initialSelection = null,
}: Readonly<{ initialSelection?: number | null }>) {
  const [selected, setSelected] = useState(initialSelection);
  return (
    <OperationsPage
      type="repair"
      selectedOperationId={selected}
      onSelectOperation={setSelected}
    />
  );
}
