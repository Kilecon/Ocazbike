export interface HtmlToPdfRenderer {
  render(html: string): Promise<Uint8Array>;
}

export class PdfRenderingError extends Error {
  readonly code = "PDF_RENDERING_FAILED";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PdfRenderingError";
  }
}

export class GotenbergPdfRenderer implements HtmlToPdfRenderer {
  constructor(private readonly url = process.env.GOTENBERG_URL) {}

  async render(html: string): Promise<Uint8Array> {
    if (!this.url) {
      throw new PdfRenderingError("GOTENBERG_URL is not configured");
    }
    const form = new FormData();
    form.append("files", new Blob([html], { type: "text/html" }), "index.html");
    form.append("preferCssPageSize", "true");
    form.append("printBackground", "true");
    form.append("emulatedMediaType", "print");
    form.append("failOnResourceLoadingFailed", "true");
    form.append("failOnResourceHttpStatusCodes", "[499,599]");
    let response: Response;
    let baseUrl = this.url;
    while (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }
    try {
      response = await fetch(
        new URL("forms/chromium/convert/html", `${baseUrl}/`),
        {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(35_000),
        },
      );
    } catch (cause) {
      throw new PdfRenderingError("PDF renderer request failed", { cause });
    }
    if (!response.ok) {
      throw new PdfRenderingError(
        `PDF renderer returned HTTP ${response.status}`,
      );
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (
      response.headers.get("Content-Type")?.split(";")[0] !==
        "application/pdf" ||
      new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-"
    ) {
      throw new PdfRenderingError("PDF renderer returned an invalid PDF");
    }
    return bytes;
  }
}
