import { documentStyles } from "../styles";

export function createDocumentHtml(content: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Modèle de document {{company_name}}</title>
  <style>${documentStyles}</style>
</head>
<body>
  <main class="sheet">
${content}
  </main>
</body>
</html>`;
}
