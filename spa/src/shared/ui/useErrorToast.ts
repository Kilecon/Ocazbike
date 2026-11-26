import { useEffect } from "react";
import { useAdminToast } from "./AdminToast";

/** Shows one error toast per failed request reported by a query. */
export function useErrorToast(error: unknown, fallbackMessage: string) {
  const { showErrorToast } = useAdminToast();
  useEffect(() => {
    if (error) showErrorToast(error, fallbackMessage);
  }, [error, fallbackMessage, showErrorToast]);
}
