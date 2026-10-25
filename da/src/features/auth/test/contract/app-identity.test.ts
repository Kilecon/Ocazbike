import { describe, it } from "bun:test";
import { createHarness, expectError } from "./helpers";

describe("SPA application identity", () => {
  it("rejects requests without the SPA identity", async () => {
    const { app } = createHarness();
    const response = await app.handle(new Request("http://localhost/auth/me"));
    await expectError(response, 403, "FORBIDDEN_APP", "Forbidden application");
  });
});
