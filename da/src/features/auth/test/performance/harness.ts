import { expect } from "bun:test";
import { ClientDataProtector } from "../../../clients/crypto/ClientDataProtector";
import {
  DrizzleRefreshSessionRepository,
  DrizzleUserRepository,
} from "../../infrastructure/DrizzleAuthRepositories";
import type { RefreshSession } from "../../repositories";
import type { User } from "../../types";
import { createTestDatabase } from "../integration/testDatabase";

export const SAMPLES = 100;
export const OPERATIONS_PER_SAMPLE = 10;
export const ITERATIONS = SAMPLES * OPERATIONS_PER_SAMPLE;

export interface Measurement {
  operation: string;
  iterations: number;
  meanMs: number;
  p99Ms: number;
  usersRows: string;
  refreshSessionRows: string;
}

export interface PerformanceContext {
  database: ReturnType<typeof createTestDatabase>;
  users: DrizzleUserRepository;
  sessions: DrizzleRefreshSessionRepository;
  primaryUser: User;
  existingSession: RefreshSession;
}

export interface PerformanceCase {
  operation: string;
  run: (context: PerformanceContext) => Promise<Measurement>;
}

type Action = (context: PerformanceContext, index: number) => Promise<unknown>;
type Preparation = (
  context: PerformanceContext,
  index: number,
) => Promise<void>;

export function defineCase(
  operation: string,
  action: Action,
  prepare?: Preparation,
): PerformanceCase {
  return {
    operation,
    run: (context) =>
      measure(
        context,
        operation,
        (index) => action(context, index),
        prepare ? (index) => prepare(context, index) : undefined,
      ),
  };
}

export async function createPerformanceContext(): Promise<PerformanceContext> {
  const database = createTestDatabase("auth-performance");
  expect(database.sqlite.query("PRAGMA journal_mode").get()).toEqual({
    journal_mode: "wal",
  });
  const protector = new ClientDataProtector(Buffer.alloc(32, 24));
  const users = new DrizzleUserRepository(database.database, protector);
  const sessions = new DrizzleRefreshSessionRepository(database.database);
  const now = Date.now();

  const primaryUser = await users.create({
    email: "perf-0@example.test",
    firstname: "Perf0",
    lastname: "User",
    passwordHash: "benchmark-password-hash",
    role: "Subadmin",
    isActive: true,
    mustChangePassword: false,
    lastLoginAtEpochMs: null,
    createdAtEpochMs: now,
    updatedAtEpochMs: now,
  });
  for (let index = 1; index < 250; index += 1) {
    await users.create({
      email: `perf-${index}@example.test`,
      firstname: `Perf${index}`,
      lastname: "User",
      passwordHash: "benchmark-password-hash",
      role: "Subadmin",
      isActive: index % 2 === 0,
      mustChangePassword: false,
      lastLoginAtEpochMs: null,
      createdAtEpochMs: now,
      updatedAtEpochMs: now,
    });
  }

  const existingSession = makeSession("perf-existing-session", primaryUser.id);
  await sessions.create(existingSession);

  return { database, users, sessions, primaryUser, existingSession };
}

export function makeSession(
  id: string,
  userId: number,
  expiresAt = new Date(Date.now() + 60_000),
): RefreshSession {
  return {
    id,
    userId,
    tokenHash: `token-hash-${id}`,
    expiresAt,
    revokedAt: null,
    userAgent: "auth-performance-test",
  };
}

export async function measure(
  context: PerformanceContext,
  operation: string,
  action: (index: number) => Promise<unknown>,
  prepare?: (index: number) => Promise<void>,
): Promise<Measurement> {
  const samples: number[] = [];
  const userRowCounts: number[] = [];
  const sessionRowCounts: number[] = [];
  for (let sample = 0; sample < SAMPLES; sample += 1) {
    const firstOperation = sample * OPERATIONS_PER_SAMPLE;
    for (let offset = 0; offset < OPERATIONS_PER_SAMPLE; offset += 1) {
      await prepare?.(firstOperation + offset);
    }
    userRowCounts.push(
      (
        context.database.sqlite
          .query("SELECT COUNT(*) AS count FROM users")
          .get() as { count: number }
      ).count,
    );
    sessionRowCounts.push(
      (
        context.database.sqlite
          .query("SELECT COUNT(*) AS count FROM refresh_sessions")
          .get() as { count: number }
      ).count,
    );
    const start = performance.now();
    for (let offset = 0; offset < OPERATIONS_PER_SAMPLE; offset += 1) {
      await action(firstOperation + offset);
    }
    samples.push((performance.now() - start) / OPERATIONS_PER_SAMPLE);
  }
  samples.sort((left, right) => left - right);

  const tableSize = (counts: number[]) => {
    const minimum = Math.min(...counts);
    const maximum = Math.max(...counts);
    return minimum === maximum ? String(minimum) : `${minimum}-${maximum}`;
  };

  return {
    operation,
    iterations: ITERATIONS,
    meanMs: samples.reduce((sum, sample) => sum + sample, 0) / SAMPLES,
    p99Ms: samples[Math.ceil(SAMPLES * 0.99) - 1],
    usersRows: tableSize(userRowCounts),
    refreshSessionRows: tableSize(sessionRowCounts),
  };
}
