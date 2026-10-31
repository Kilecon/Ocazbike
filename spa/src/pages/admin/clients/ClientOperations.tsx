import { OperationsPage } from "../operations/OperationsPage";

export function ClientOperations({ clientId }: { clientId: number }) {
  return (
    <div className="mx-auto mt-5 grid min-w-0 max-w-[77.5rem] gap-5">
      {(["repair", "sale", "purchase", "rental"] as const).map((type) => (
        <OperationsPage
          key={`${clientId}-${type}`}
          type={type}
          clientId={clientId}
        />
      ))}
    </div>
  );
}
