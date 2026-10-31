import { useEffect } from "react";
import { AdminToastProvider } from "./components/admin/AdminToast";
import { AdminRoute } from "./pages/admin/AdminRoute";
import { NotFoundPage } from "./pages/NotFoundPage";
import { applyTheme, getSystemTheme } from "./theme";

export function App() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      const storedTheme = window.localStorage.getItem("theme");
      if (storedTheme === "light" || storedTheme === "dark") {
        applyTheme(storedTheme);
        return;
      }
      applyTheme(getSystemTheme());
    };

    syncTheme();
    mediaQuery.addEventListener("change", syncTheme);
    return () => mediaQuery.removeEventListener("change", syncTheme);
  }, []);

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

  if (pathname.startsWith("/admin")) {
    return (
      <AdminToastProvider>
        <AdminRoute />
      </AdminToastProvider>
    );
  }
  return <NotFoundPage />;
}

export default App;
