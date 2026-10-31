import { createClientIntegrationFixture } from "../../../clients/test/integration/helpers";

export function createBillingIntegrationFixture(name: string) {
  const fixture = createClientIntegrationFixture(name);
  return Object.assign(fixture, { repository: fixture.billingDocuments });
}
