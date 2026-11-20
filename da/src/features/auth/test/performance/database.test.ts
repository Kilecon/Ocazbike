import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import sessionsCreate from "./cases/sessions-create";
import sessionsDelete from "./cases/sessions-delete";
import sessionsDeleteExpired from "./cases/sessions-delete-expired";
import sessionsFindById from "./cases/sessions-find-by-id";
import sessionsLimitActive from "./cases/sessions-limit-active";
import sessionsRevoke from "./cases/sessions-revoke";
import sessionsRevokeAll from "./cases/sessions-revoke-all";
import usersCreate from "./cases/users-create";
import usersFindByEmail from "./cases/users-find-by-email";
import usersFindById from "./cases/users-find-by-id";
import usersListActive from "./cases/users-list-active";
import usersListAll from "./cases/users-list-all";
import usersRecordLogin from "./cases/users-record-login";
import usersRecordLogout from "./cases/users-record-logout";
import usersSetActive from "./cases/users-set-active";
import usersSetRole from "./cases/users-set-role";
import usersUpdatePassword from "./cases/users-update-password";
import {
  createPerformanceContext,
  type PerformanceCase,
  type PerformanceContext,
} from "./harness";

const cases: PerformanceCase[] = [
  usersFindByEmail,
  usersFindById,
  usersCreate,
  usersUpdatePassword,
  usersSetRole,
  usersSetActive,
  usersListActive,
  usersListAll,
  usersRecordLogin,
  usersRecordLogout,
  sessionsCreate,
  sessionsFindById,
  sessionsRevoke,
  sessionsDelete,
  sessionsDeleteExpired,
  sessionsLimitActive,
  sessionsRevokeAll,
];

let context: PerformanceContext;

beforeAll(async () => {
  context = await createPerformanceContext();
});

afterAll(() => {
  context?.database.cleanup();
});

describe("auth repository SQLite performance", () => {
  it("measures each repository operation and reports one results table", async () => {
    const results = [];
    for (const benchmarkCase of cases) {
      results.push(await benchmarkCase.run(context));
    }

    expect(results).toHaveLength(cases.length);
    console.table(
      results.map((result) => ({
        operation: result.operation,
        iterations: result.iterations,
        "users rows": result.usersRows,
        "refresh_sessions rows": result.refreshSessionRows,
        "mean (ms)": result.meanMs.toFixed(3),
        "p99 (ms)": result.p99Ms.toFixed(3),
      })),
    );
    for (const result of results) {
      expect(result.p99Ms).toBeLessThanOrEqual(1);
    }
  });
});
