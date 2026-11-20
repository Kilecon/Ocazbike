import type {
  SupportNotifier,
  SupportRequestRecord,
  SupportRequestType,
} from "../ISupportRequestRepository";

const requestTypePresentation: Record<
  SupportRequestType,
  { label: string; emoji: string; color: number }
> = {
  SR: { label: "Demande de service", emoji: "🎫", color: 0x3498db },
  INC: { label: "Incident", emoji: "🚨", color: 0xe67e22 },
  BUG: { label: "Bug", emoji: "🐛", color: 0xe74c3c },
};

export class DiscordSupportNotifier implements SupportNotifier {
  constructor(
    private readonly webhookUrl = process.env.DISCORD_WEBHOOK_URL,
    private readonly fetchRequest: (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response> = fetch,
  ) {}

  async notify(request: SupportRequestRecord): Promise<void> {
    if (!this.webhookUrl) {
      throw new Error("DISCORD_WEBHOOK_URL is not configured");
    }

    const presentation = requestTypePresentation[request.type];

    const response = await this.fetchRequest(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        content: `${presentation.emoji} **Nouvelle demande de support**`,
        embeds: [
          {
            color: presentation.color,
            title: request.title,
            description: request.description.slice(0, 1500),
            fields: [
              {
                name: "Référence",
                value: `\`${request.reference}\``,
                inline: true,
              },
              { name: "Type", value: presentation.label, inline: true },
              {
                name: "Créée par",
                value:
                  request.createdByUserId === null
                    ? "Utilisateur inconnu"
                    : `Utilisateur #${request.createdByUserId}`,
                inline: true,
              },
            ],
            footer: { text: "Ocazbike · Équipe support" },
            timestamp: request.createdAt,
          },
        ],
        allowed_mentions: { parse: [] },
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook returned HTTP ${response.status}`);
    }
  }
}
