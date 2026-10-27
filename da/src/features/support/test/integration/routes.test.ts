import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import type { SupportIntegrationFixture } from "./helpers";
import { createSupportIntegrationFixture } from "./helpers";

let fixture: SupportIntegrationFixture;

beforeAll(() => {
  fixture = createSupportIntegrationFixture("support-http-integration");
});

beforeEach(() => fixture.reset());

afterAll(() => fixture?.cleanup());

describe("support HTTP integration with SQLite", () => {
  it("persists created support requests and successful notification status", async () => {
    const login = await fixture.login();
    const { accessToken } = await login.json();
    const response = await fixture.request("/support", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        type: "SR",
        title: "Checkout fails",
        description: "The issue persists after restarting checkout.",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      reference: expect.stringMatching(/^SR-\d{4}-\d{2}-\d{2}-001$/),
      status: "pending",
      discordNotificationStatus: "sent",
      discordNotification: "sent",
    });
    expect(body).not.toHaveProperty("createdByUserId");
    expect(fixture.notifications).toHaveLength(1);

    const stored = await fixture.supportRequests.listPage({
      page: 1,
      limit: 10,
    });
    expect(stored.requests).toMatchObject([
      { title: "Checkout fails", status: "pending" },
    ]);
  });

  it("persists notification failures and retries them without losing the request", async () => {
    const login = await fixture.login();
    const { accessToken } = await login.json();
    fixture.setNotificationFailure(true);
    const created = await fixture.request("/support", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        type: "BUG",
        title: "Broken filter",
        description: "The filter cannot be applied.",
      }),
    });
    const failed = await created.json();
    expect(created.status).toBe(201);
    expect(failed).toMatchObject({
      status: "created",
      discordNotificationStatus: "failed",
      discordNotification: "failed",
    });

    fixture.setNotificationFailure(false);
    const retried = await fixture.request(
      `/support/${failed.id}/notification`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    expect(retried.status).toBe(200);
    expect(await retried.json()).toMatchObject({
      status: "pending",
      discordNotificationStatus: "sent",
      discordNotification: "sent",
    });

    const cooldown = await fixture.request(
      `/support/${failed.id}/notification`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    expect(cooldown.status).toBe(429);
  });

  it("permanently blocks notification resend for closed requests", async () => {
    const login = await fixture.login();
    const { accessToken } = await login.json();
    const created = await fixture.supportRequests.create({
      type: "INC",
      title: "Closed request",
      description: "No further notification should be sent.",
      createdByUserId: fixture.admin.id,
    });
    fixture.database.sqlite
      .prepare("UPDATE support_requests SET status = 'closed' WHERE id = ?")
      .run(created.id);
    const notificationCount = fixture.notifications.length;

    const response = await fixture.request(
      `/support/${created.id}/notification`,
      {
        method: "POST",
        headers: { Authorization: ["Bearer", accessToken].join(" ") },
      },
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "SUPPORT_REQUEST_CLOSED",
    });
    expect(fixture.notifications).toHaveLength(notificationCount);
  });

  it("paginates and filters persisted requests while excluding creator IDs", async () => {
    const createdRequest = await fixture.supportRequests.create({
      type: "SR",
      title: "Created request",
      description: "Still needs notification.",
      createdByUserId: fixture.admin.id,
    });
    const pendingRequest = await fixture.supportRequests.create({
      type: "BUG",
      title: "Pending request",
      description: "Notification has been sent.",
      createdByUserId: fixture.admin.id,
    });
    const closedRequest = await fixture.supportRequests.create({
      type: "INC",
      title: "Closed request",
      description: "This request is closed.",
      createdByUserId: fixture.admin.id,
    });
    await fixture.supportRequests.completeNotification(
      pendingRequest.id,
      "sent",
      new Date(),
    );
    fixture.database.sqlite
      .prepare("UPDATE support_requests SET status = 'closed' WHERE id = ?")
      .run(closedRequest.id);

    const login = await fixture.login();
    const { accessToken } = await login.json();
    const response = await fixture.request(
      "/support?page=1&limit=1&type=BUG&status=pending",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      page: 1,
      limit: 1,
      total: 1,
      requests: [{ id: pendingRequest.id, status: "pending" }],
    });
    expect(body.requests[0]).not.toHaveProperty("createdByUserId");

    const closed = await fixture.request(
      "/support?page=1&limit=10&status=closed",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(closed.status).toBe(200);
    expect(await closed.json()).toMatchObject({
      total: 1,
      requests: [{ id: closedRequest.id, status: "closed" }],
    });

    const created = await fixture.supportRequests.listPage({
      page: 1,
      limit: 10,
      status: "created",
    });
    expect(created.requests).toMatchObject([{ id: createdRequest.id }]);
  });
});
