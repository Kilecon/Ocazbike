export class AuthenticationError extends Error {
  readonly statusCode: number = 401;
  readonly code: string = "UNAUTHORIZED";

  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class InvalidAuthTokenError extends Error {
  readonly statusCode = 401;
  readonly code = "INVALID_AUTH_TOKEN";

  constructor() {
    super("Invalid token");
    this.name = "InvalidAuthTokenError";
  }
}

export class ContractError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ContractError";
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super("Invalid credentials");
    this.name = "InvalidCredentialsError";
  }
}

export class ForbiddenAppError extends Error {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN_APP";

  constructor() {
    super("Forbidden application");
    this.name = "ForbiddenAppError";
  }
}

export class ForbiddenRoleError extends Error {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";

  constructor() {
    super("Missings rights");
    this.name = "ForbiddenRoleError";
  }
}

export class PasswordChangeRequiredError extends Error {
  readonly statusCode = 403;
  readonly code = "PASSWORD_CHANGE_REQUIRED";

  constructor() {
    super("Password change required");
    this.name = "PasswordChangeRequiredError";
  }
}

export class DuplicateUserError extends Error {
  readonly statusCode = 409;
  readonly code = "EMAIL_ALREADY_EXISTS";

  constructor() {
    super("Email already exists");
    this.name = "DuplicateUserError";
  }
}

export class UserNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "USER_NOT_FOUND";

  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

export class UserAlreadyActivatedError extends Error {
  readonly statusCode = 409;
  readonly code = "USER_ALREADY_ACTIVATED";

  constructor() {
    super("User already activated");
    this.name = "UserAlreadyActivatedError";
  }
}

export class UserAlreadyDeactivatedError extends Error {
  readonly statusCode = 409;
  readonly code = "USER_ALREADY_DEACTIVATED";

  constructor() {
    super("User already deactivated");
    this.name = "UserAlreadyDeactivatedError";
  }
}

export class InvalidCurrentPasswordError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_CURRENT_PASSWORD";

  constructor() {
    super("Invalid current password");
    this.name = "InvalidCurrentPasswordError";
  }
}

export class InvalidPasswordError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_PASSWORD";

  constructor() {
    super("Invalid password");
    this.name = "InvalidPasswordError";
  }
}

export class InvalidEmailError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_EMAIL";

  constructor() {
    super("Invalid email address");
    this.name = "InvalidEmailError";
  }
}

export class InvalidUserDataError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_USER_DATA";

  constructor() {
    super("Invalid first name or last name");
    this.name = "InvalidUserDataError";
  }
}

export class InvalidRoleError extends Error {
  readonly statusCode = 400;
  readonly code = "INVALID_ROLE";

  constructor() {
    super("Invalid or unauthorized role");
    this.name = "InvalidRoleError";
  }
}

export class TooManyAttemptsError extends Error {
  readonly statusCode = 429;
  readonly code = "TOO_MANY_ATTEMPTS";

  constructor(readonly retryAfterSeconds: number) {
    super("Too many failed login attempts, try again later");
    this.name = "TooManyAttemptsError";
  }
}
