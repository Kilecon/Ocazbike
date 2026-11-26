import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TruncatedCellText } from "./TruncatedCellText";

function render(text: string) {
  return renderToStaticMarkup(
    <TruncatedCellText text={text} maxLength={70} tooltipLabel="Full text" />,
  );
}

describe("grid text truncation", () => {
  it("normalizes whitespace and accents without truncating at 70 characters", () => {
    expect(render("  Cafe\u0301\n  du cycle  ")).toContain(
      "<span>Café du cycle</span>",
    );
    expect(render("a".repeat(70))).not.toContain('role="note"');
  });

  it("shows 69 characters and an ellipsis beyond 70, retaining the full text", () => {
    const text = "a".repeat(71);
    const html = render(text);
    expect(html).toContain(`<span>${"a".repeat(69)}…</span>`);
    expect(html).toContain(`title="${text}"`);
    expect(html).toContain(`aria-label="Full text: ${text}"`);
    expect(html).toContain('role="note"');
  });

  it("counts Unicode characters and escapes full text", () => {
    expect(render("🚲".repeat(71))).toContain(
      `<span>${"🚲".repeat(69)}…</span>`,
    );
    expect(render(`${"a".repeat(71)}<script>`)).not.toContain("<script>");
  });
});
