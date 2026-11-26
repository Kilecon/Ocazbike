/**
 * Entry point of the React app, included by `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/shared/styles/tailwind.generated.css";
import "@/shared/i18n/i18n";
import { removeLegacyStoredTokens } from "@/shared/api/http";
import { installNativeFormValidationMessages } from "@/shared/lib/nativeFormValidation";
import { App } from "./App";
import { createQueryClient } from "./queryClient";
import { createAppRouter } from "./router";

const elem = document.getElementById("root");
if (!elem) throw new Error("Missing application root element");
installNativeFormValidationMessages();
removeLegacyStoredTokens();

const router = createAppRouter();
const queryClient = createQueryClient();

const root = createRoot(elem);
root.render(
  <StrictMode>
    <App router={router} queryClient={queryClient} />
  </StrictMode>,
);
