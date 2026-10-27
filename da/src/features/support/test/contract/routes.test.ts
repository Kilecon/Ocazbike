import { describe, expect, it } from "bun:test";
import { createHarness, json } from "./helpers";

describe("support HTTP contract", () => {
  it("creates support requests and returns only the public response shape", async () => {
    const { request, authorization, notifications } = createHarness();
    const response = await request("/support", {
      method: "POST",
      headers: { Authorization: authorization() },
      ...json({
        type: "BUG",
        title: "Checkout fails",
        description: "The checkout page fails after submitting.",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      type: "BUG",
      title: "Checkout fails",
      description: "The checkout page fails after submitting.",
      status: "pending",
      discordNotificationStatus: "sent",
      discordNotification: "sent",
    });
    expect(body.reference).toMatch(/^BUG-\d{4}-\d{2}-\d{2}-001$/);
    expect(body).not.toHaveProperty("createdByUserId");
    expect(notifications).toHaveLength(1);
  });

  it("validates request fields and allowed request types", async () => {
    const { request, authorization } = createHarness();
    const invalidRequests = [
      { type: "TASK", title: "Task", description: "Invalid type" },
      { type: "BUG", title: "", description: "Missing title" },
      { type: "SR", title: "Title", description: "" },
      { type: "INC", title: "x".repeat(201), description: "Long title" },
      { type: "BUG", title: "Title", description: "x".repeat(5001) },
    ];

    for (const body of invalidRequests) {
      const response = await request("/support", {
        method: "POST",
        headers: { Authorization: authorization() },
        ...json(body),
      });
      expect(response.status).toBe(422);
    }
  });

  it("requires an authenticated Admin for list, create, and resend routes", async () => {
    const { request, authorization } = createHarness();
    expect((await request("/support")).status).toBe(401);
    expect(
      (
        await request("/support", {
          headers: { Authorization: "Bearer invalid" },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await request("/support", {
          headers: { Authorization: authorization(2) },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/support", {
          headers: { Authorization: authorization(3) },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await request("/support/1/notification", {
          method: "POST",
          headers: { Authorization: authorization(2) },
        })
      ).status,
    ).toBe(403);
  });

  it("paginates requests and filters by type and business status", async () => {
    const { request, authorization, supportRequests } = createHarness();
    const adminId = 1;
    const first = await supportRequests.create({
      type: "SR",
      title: "First request",
      description: "First description",
      createdByUserId: adminId,
    });
    const second = await supportRequests.create({
      type: "BUG",
      title: "Second request",
      description: "Second description",
      createdByUserId: adminId,
    });
    await supportRequests.completeNotification(second.id, "sent", new Date());
    await supportRequests.create({
      type: "BUG",
      title: "Third request",
      description: "Third description",
      createdByUserId: adminId,
    });

    const page = await request("/support?page=1&limit=2", {
      headers: { Authorization: authorization() },
    });
    expect(await page.json()).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      requests: [{ id: 3 }, { id: 2 }],
    });

    const filtered = await request(
      "/support?page=1&limit=10&type=BUG&status=pending",
      { headers: { Authorization: authorization() } },
    );
    expect(await filtered.json()).toMatchObject({
      total: 1,
      requests: [{ id: second.id, type: "BUG", status: "pending" }],
    });

    const created = await request(
      "/support?page=1&limit=10&type=SR&status=created",
      { headers: { Authorization: authorization() } },
    );
    expect(await created.json()).toMatchObject({
      total: 1,
      requests: [{ id: first.id, type: "SR", status: "created" }],
    });
  });

  it("reports notification failures, allows retry, and enforces the cooldown", async () => {
    const { request, authorization, setNotificationFailure } = createHarness();
    setNotificationFailure(true);
    const failed = await request("/support", {
      method: "POST",
      headers: { Authorization: authorization() },
      ...json({ type: "INC", title: "Failure", description: "Retry me." }),
    });
    const failedBody = await failed.json();
    expect(failedBody).toMatchObject({
      status: "created",
      discordNotificationStatus: "failed",
      discordNotification: "failed",
    });

    setNotificationFailure(false);
    const retried = await request(`/support/${failedBody.id}/notification`, {
      method: "POST",
      headers: { Authorization: authorization() },
    });
    expect(await retried.json()).toMatchObject({
      status: "pending",
      discordNotificationStatus: "sent",
      discordNotification: "sent",
    });

    const cooldown = await request(`/support/${failedBody.id}/notification`, {
      method: "POST",
      headers: { Authorization: authorization() },
    });
    expect(cooldown.status).toBe(429);
  });

  it("permanently blocks notification resend for closed requests", async () => {
    const {
      request,
      authorization,
      supportRequests,
      notifications,
      setNotificationFailure,
    } = createHarness();
    const created = await supportRequests.create({
      type: "INC",
      title: "Closed request",
      description: "No further notification should be sent.",
      createdByUserId: 1,
    });
    created.status = "closed";
    setNotificationFailure(false);

    const response = await request(`/support/${created.id}/notification`, {
      method: "POST",
      headers: { Authorization: authorization() },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "SUPPORT_REQUEST_CLOSED",
    });
    expect(notifications).toHaveLength(0);
  });

  it("rejects invalid filters and pagination", async () => {
    const { request, authorization } = createHarness();
    for (const query of [
      "page=0",
      "page=1.5",
      "limit=0",
      "limit=51",
      "type=TASK",
      "status=unknown",
    ]) {
      const response = await request(`/support?${query}`, {
        headers: { Authorization: authorization() },
      });
      expect(response.status).toBe(422);
    }
  });
});
