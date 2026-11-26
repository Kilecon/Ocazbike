import { getRouteApi } from "@tanstack/react-router";
import { Client360Page } from "@/features/clients/Client360Page";
import { ClientDetailPage } from "@/features/clients/ClientDetailPage";

const clientDetailRoute = getRouteApi("/admin/workspace/clients/$clientId");

export function NewClientRoute() {
  return <Client360Page openCreate />;
}

export function ClientDetailRoute() {
  const { clientId } = clientDetailRoute.useParams();
  return <ClientDetailPage key={clientId} clientId={clientId} />;
}
