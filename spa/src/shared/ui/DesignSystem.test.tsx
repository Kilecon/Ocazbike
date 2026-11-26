import { describe, expect, it } from "bun:test";
import { createInstance } from "i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import fr from "@/shared/i18n/translations/fr.json";
import { ToastItem } from "./AdminToast";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Input } from "./Input";
import { StatusBadge } from "./StatusBadge";
import { Tag } from "./Tag";

const i18n = createInstance();
await i18n.init({ lng: "fr", resources: { fr: { translation: fr } } });

describe("Figma component variants", () => {
  it("renders badges using the soft color variants", () => {
    const markup = renderToStaticMarkup(<Badge color="warning">Pending</Badge>);

    expect(markup).toContain('data-color="warning"');
    expect(markup).toContain("oz-badge-warning");
  });

  it.each([
    ["created", "draft"],
    ["pending", "warning"],
    ["in_progress", "info"],
    ["closed", "success"],
    ["cancelled", "error"],
  ])("uses the soft %s status badge", (status, color) => {
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <StatusBadge status={status} />
      </I18nextProvider>,
    );
    expect(markup).toContain(`data-color="${color}"`);
    expect(markup).not.toContain('data-type="bold"');
  });

  it("preserves semantic aliases for existing buttons", () => {
    const markup = renderToStaticMarkup(
      <>
        <Button variant="default">Create</Button>
        <Button variant="outline" negative>
          Remove
        </Button>
        <Button variant="destructive">Deactivate</Button>
      </>,
    );

    expect(markup).toContain("oz-button-primary");
    expect(markup).toContain("oz-button-secondary");
    expect(markup.match(/oz-button-negative/g)).toHaveLength(2);
  });

  it("renders a removable, labelled tag", () => {
    const markup = renderToStaticMarkup(
      <Tag
        label="Active"
        removeLabel="Remove active filter"
        onRemove={() => {}}
      />,
    );

    expect(markup).toContain('aria-label="Remove active filter"');
    expect(markup).toContain("Active");
  });

  it("associates an input error with its message and Figma error icon", () => {
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <Input aria-label="Password" error="Incorrect password" />
      </I18nextProvider>,
    );
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toMatch(/aria-describedby="([^"]+)"/);
    expect(markup).toContain("Incorrect password");
    expect(markup).toContain("input-error-light.svg");
    expect(markup).toContain("input-error-dark.svg");
  });

  it.each([
    ["success", "output"],
    ["info", "output"],
    ["warning", "alert"],
    ["error", "alert"],
  ] as const)("renders a %s notification with its own style", (type, role) => {
    const markup = renderToStaticMarkup(
      <ToastItem
        toast={{ id: 1, type, title: "Title", message: "Message" }}
        onDismiss={() => {}}
        dismissLabel="Dismiss"
      />,
    );
    expect(markup).toContain(`oz-toast-${type}`);
    expect(markup).toContain(role === "output" ? "<output " : `role="${role}"`);
  });
});
