import { expect, it } from "bun:test";
import {
  BillingOperationInputError,
  BillingWorkflowConflictError,
} from "../../IBillingDocumentRepository";

it.each([BillingOperationInputError, BillingWorkflowConflictError])(
  "preserves the identity and message of %p",
  (ErrorType) => {
    const error = new ErrorType("Invalid billing operation");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ErrorType);
    expect(error.name).toBe(ErrorType.name);
    expect(error.message).toBe("Invalid billing operation");
  },
);
