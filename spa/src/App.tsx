import { useEffect } from "react";
import "./styles/ocazbike.css";
import { PublicLayout } from "./layouts/PublicLayout";
import { AdminRoute } from "./pages/admin/AdminRoute";
import { BikeCatalogPage } from "./pages/public/BikeCatalogPage";
import { OcazbikeHome } from "./pages/public/OcazbikeHome";
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
    return <AdminRoute />;
  }

  return (
    <PublicLayout>
      {pathname === "/velo" ? <BikeCatalogPage /> : <OcazbikeHome />}
    </PublicLayout>
  );
}

export default App;
