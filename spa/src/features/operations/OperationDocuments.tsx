import { Link } from "@tanstack/react-router";
import { FileText, FileX } from "lucide-react";
import { SECTION_BY_TYPE } from "./sections";
import type { BillingDocumentType, BillingSnapshotDTO } from "./types";

export function OperationDocuments({
  operationId,
  snapshots,
  labels,
  kinds = ["quote", "invoice"],
  showLabels = false,
  type = "repair",
}: Readonly<{
  operationId: number;
  type?: BillingDocumentType;
  showLabels?: boolean;
  snapshots: Pick<BillingSnapshotDTO, "kind">[];
  kinds?: readonly BillingSnapshotDTO["kind"][];
  labels: Record<
    "quote" | "invoice" | "missingQuote" | "missingInvoice",
    string
  >;
}>) {
  return (
    <div className="flex items-center gap-3">
      {kinds.map((kind) => {
        const available = snapshots.some((snapshot) => snapshot.kind === kind);
        const missingLabels = {
          quote: labels.missingQuote,
          invoice: labels.missingInvoice,
        };
        const label = available ? labels[kind] : missingLabels[kind];
        const icon = available ? (
          <FileText size="1.3125rem" aria-hidden="true" />
        ) : (
          <FileX size="1.3125rem" aria-hidden="true" />
        );
        if (!available) {
          return (
            <span
              key={kind}
              role="img"
              aria-label={label}
              title={label}
              className="inline-flex size-10 items-center justify-center text-muted"
            >
              {icon}
            </span>
          );
        }
        return (
          <Link
            key={kind}
            to="/admin/$section/$operationId/documents/$kind"
            params={{ section: SECTION_BY_TYPE[type], operationId, kind }}
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
            {icon}
            {showLabels && <span>{label}</span>}
          </Link>
        );
      })}
    </div>
  );
}
