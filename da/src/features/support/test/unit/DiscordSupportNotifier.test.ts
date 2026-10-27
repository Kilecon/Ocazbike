import { describe, expect, it } from "bun:test";
import type { SupportRequestRecord } from "../../ISupportRequestRepository";
import { DiscordSupportNotifier } from "../../infrastructure/DiscordSupportNotifier";

const supportRequest: SupportRequestRecord = {
  id: 1,
  reference: "SR-2026-10-04-001",
  type: "SR",
  title: "Can't complete checkout",
  description: "The checkout page fails after submitting.",
  status: "created",
  createdByUserId: 1,
  createdAt: "2026-10-04T12:00:00.000Z",
  discordNotificationStatus: "pending",
  discordNotifiedAt: null,
  discordNotificationAttemptAt: null,
};

describe("DiscordSupportNotifier", () => {
  it("posts the support request while suppressing Discord mentions", async () => {
    const captured: {
      webhookUrl: string;
      payload: {
        content: string;
        embeds: {
          color: number;
          title: string;
          description: string;
          fields: { name: string; value: string; inline: boolean }[];
          footer: { text: string };
          timestamp: string;
        }[];
        allowed_mentions: { parse: string[] };
      };
    } = {
      webhookUrl: "",
      payload: {
        content: "",
        embeds: [],
        allowed_mentions: { parse: [] },
      },
    };
    const notifier = new DiscordSupportNotifier(
      "https://discord.example/webhook",
      async (input, init) => {
        captured.webhookUrl = String(input);
        captured.payload = JSON.parse(String(init?.body));
        return new Response(null, { status: 204 });
      },
    );

    await notifier.notify(supportRequest);

    expect(captured.webhookUrl).toBe("https://discord.example/webhook");
    expect(captured.payload.content).toContain("Nouvelle demande de support");
    expect(captured.payload.embeds[0]).toMatchObject({
      title: supportRequest.title,
      description: supportRequest.description,
      fields: [
        {
          name: "Référence",
          value: `\`${supportRequest.reference}\``,
          inline: true,
        },
        { name: "Type", value: "Demande de service", inline: true },
        { name: "Créée par", value: "Utilisateur #1", inline: true },
      ],
      footer: { text: "Ocazbike · Équipe support" },
      timestamp: supportRequest.createdAt,
    });
    expect(captured.payload.allowed_mentions).toEqual({ parse: [] });
  });

  it("reports missing configuration and Discord HTTP errors", async () => {
    const missingWebhook = new DiscordSupportNotifier("");
    await expect(missingWebhook.notify(supportRequest)).rejects.toThrow(
      "DISCORD_WEBHOOK_URL is not configured",
    );

    const failedWebhook = new DiscordSupportNotifier(
      "https://discord.example/webhook",
      async () => new Response(null, { status: 503 }),
    );
    await expect(failedWebhook.notify(supportRequest)).rejects.toThrow(
      "Discord webhook returned HTTP 503",
    );
  });
});
