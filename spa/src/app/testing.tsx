import { createDom } from "@/shared/test/dom";
import { App } from "./App";
import { createAppRouter } from "./router";

/** Renders the whole application, router included, at `path`. */
export async function renderApp(path: string) {
  const view = await createDom(path);
  await view.render(
    <App router={createAppRouter()} queryClient={view.queryClient} />,
  );
  return view;
}
