import { useState } from "react";
import { OperationsPage } from "@/features/operations/OperationsPage";
import type { BillingDocumentType } from "@/features/operations/types";

function ClientOperationsOfType({
  clientId,
  type,
}: Readonly<{ clientId: number; type: BillingDocumentType }>) {
  const [selectedOperationId, setSelectedOperationId] = useState<number | null>(
    null,
  );
  return (
    <OperationsPage
      type={type}
      clientId={clientId}
      selectedOperationId={selectedOperationId}
      onSelectOperation={setSelectedOperationId}
    />
  );
}

export function ClientOperations({ clientId }: Readonly<{ clientId: number }>) {
  return (
    <div className="mx-auto mt-5 grid min-w-0 max-w-[77.5rem] gap-5">
      {(["repair", "sale", "purchase", "rental"] as const).map((type) => (
        <ClientOperationsOfType
          key={`${clientId}-${type}`}
          type={type}
          clientId={clientId}
        />
      ))}
    </div>
  );
}
