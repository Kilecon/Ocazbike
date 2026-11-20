import { FileText, FileX } from "lucide-react";
import type {
  BillingDocumentType,
  BillingSnapshotDTO,
} from "../../../services/types";

export function OperationDocuments({
  operationId,
  snapshots,
  labels,
  showLabels = false,
  type = "repair",
}: {
  operationId: number;
  type?: BillingDocumentType;
  showLabels?: boolean;
  snapshots: Pick<BillingSnapshotDTO, "kind">[];
  labels: Record<
    "quote" | "invoice" | "missingQuote" | "missingInvoice",
    string
  >;
}) {
  return (
    <div className="flex items-center gap-3">
      {(["quote", "invoice"] as const).map((kind) => {
        const available = snapshots.some((snapshot) => snapshot.kind === kind);
        const label = available
          ? labels[kind]
          : labels[kind === "quote" ? "missingQuote" : "missingInvoice"];
        return available ? (
          <a
            key={kind}
            href={`/admin/${type === "sale" ? "sales" : type === "purchase" ? "buybacks" : type === "rental" ? "rentals" : "repairs"}/${operationId}/documents/${kind}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className={
              showLabels
                ? "inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-primary hover:bg-surface-muted"
                : "inline-flex size-10 items-center justify-center rounded-md text-primary hover:bg-surface-muted"
            }
          >
            <FileText size={21} aria-hidden="true" />
            {showLabels ? <span>{label}</span> : null}
          </a>
        ) : (
          <span
            key={kind}
            role="img"
            aria-label={label}
            title={label}
            className="inline-flex size-10 items-center justify-center text-muted"
          >
            <FileX size={21} aria-hidden="true" />
          </span>
        );
      })}
    </div>
  );
}
