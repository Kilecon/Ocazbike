/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react"; // Dev issue
import { createRoot } from "react-dom/client";
import "./styles/tailwind.generated.css";
import { App } from "./App";
import "./i18n";

const elem = document.getElementById("root");
if (!elem) throw new Error("Missing application root element");
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
let root = import.meta.hot.data.root;
if (!root) {
  root = createRoot(elem);
  import.meta.hot.data.root = root;
}
root.render(app);
