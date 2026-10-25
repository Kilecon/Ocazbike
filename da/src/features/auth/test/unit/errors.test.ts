import { describe, expect, it } from "bun:test";
import {
  AuthenticationError,
  ContractError,
  DuplicateUserError,
  ForbiddenAppError,
  ForbiddenRoleError,
  InvalidAuthTokenError,
  InvalidCredentialsError,
  InvalidCurrentPasswordError,
  InvalidEmailError,
  InvalidPasswordError,
  InvalidRoleError,
  InvalidUserDataError,
  PasswordChangeRequiredError,
  TooManyAttemptsError,
  UserAlreadyActivatedError,
  UserAlreadyDeactivatedError,
  UserNotFoundError,
} from "../../errors";

describe("auth errors", () => {
  it("exposes stable names, HTTP status codes, and public error codes", () => {
    const cases = [
      [new AuthenticationError(), 401, "UNAUTHORIZED"],
      [new InvalidAuthTokenError(), 401, "INVALID_AUTH_TOKEN"],
      [new InvalidCredentialsError(), 401, "UNAUTHORIZED"],
      [new ForbiddenAppError(), 403, "FORBIDDEN_APP"],
      [new ForbiddenRoleError(), 403, "FORBIDDEN"],
      [new PasswordChangeRequiredError(), 403, "PASSWORD_CHANGE_REQUIRED"],
      [new DuplicateUserError(), 409, "EMAIL_ALREADY_EXISTS"],
      [new UserNotFoundError(), 404, "USER_NOT_FOUND"],
      [new UserAlreadyActivatedError(), 409, "USER_ALREADY_ACTIVATED"],
      [new UserAlreadyDeactivatedError(), 409, "USER_ALREADY_DEACTIVATED"],
      [new InvalidCurrentPasswordError(), 400, "INVALID_CURRENT_PASSWORD"],
      [new InvalidPasswordError(), 400, "INVALID_PASSWORD"],
      [new InvalidEmailError(), 400, "INVALID_EMAIL"],
      [new InvalidUserDataError(), 400, "INVALID_USER_DATA"],
      [new InvalidRoleError(), 400, "INVALID_ROLE"],
    ] as const;

    for (const [error, statusCode, code] of cases) {
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(statusCode);
      expect(error.code).toBe(code);
    }
  });

  it("preserves custom contract errors and rate-limit retry information", () => {
    const contract = new ContractError(422, "INVALID", "Invalid input");
    expect(contract.name).toBe("ContractError");
    expect(contract.statusCode).toBe(422);
    expect(contract.code).toBe("INVALID");
    expect(contract.message).toBe("Invalid input");

    const limited = new TooManyAttemptsError(12);
    expect(limited.name).toBe("TooManyAttemptsError");
    expect(limited.statusCode).toBe(429);
    expect(limited.code).toBe("TOO_MANY_ATTEMPTS");
    expect(limited.retryAfterSeconds).toBe(12);
  });

  it("keeps invalid credentials an authentication error", () => {
    const error = new InvalidCredentialsError();
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe("Invalid credentials");
  });
});
