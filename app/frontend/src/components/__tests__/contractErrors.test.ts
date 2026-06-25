import { describe, expect, it } from "vitest";
import {
  resolveContractError,
  isContractLikeErrorCode,
  type ContractErrorView,
} from "@/lib/contractErrors";
import { QuickExClientError, type NormalizedApiError } from "@/lib/apiErrors";

// ---------------------------------------------------------------------------
// isContractLikeErrorCode
// ---------------------------------------------------------------------------

describe("isContractLikeErrorCode", () => {
  it("returns true for CONTRACT_ prefixed codes", () => {
    expect(isContractLikeErrorCode("CONTRACT_PAUSED")).toBe(true);
    expect(isContractLikeErrorCode("CONTRACT_INSUFFICIENT_BALANCE")).toBe(true);
    expect(isContractLikeErrorCode("CONTRACT_ESCROW_NOT_FOUND")).toBe(true);
  });

  it("returns true for STELLAR_ prefixed codes", () => {
    expect(isContractLikeErrorCode("STELLAR_NETWORK_ERROR")).toBe(true);
    expect(isContractLikeErrorCode("STELLAR_INSUFFICIENT_FUNDS")).toBe(true);
    expect(isContractLikeErrorCode("STELLAR_PATH_NOT_FOUND")).toBe(true);
  });

  it("returns true for REFUND_ prefixed codes", () => {
    expect(isContractLikeErrorCode("REFUND_NOT_REFUNDABLE")).toBe(true);
    expect(isContractLikeErrorCode("REFUND_NOT_FOUND")).toBe(true);
    expect(isContractLikeErrorCode("REFUND_IDEMPOTENCY_CONFLICT")).toBe(true);
  });

  it("returns true for LINK_ prefixed codes", () => {
    expect(isContractLikeErrorCode("LINK_EXPIRED")).toBe(true);
    expect(isContractLikeErrorCode("LINK_ALREADY_PAID")).toBe(true);
    expect(isContractLikeErrorCode("LINK_CANCELLED")).toBe(true);
    expect(isContractLikeErrorCode("LINK_NOT_FOUND")).toBe(true);
  });

  it("returns true for USERNAME_ prefixed codes", () => {
    expect(isContractLikeErrorCode("USERNAME_TAKEN")).toBe(true);
    expect(isContractLikeErrorCode("USERNAME_INVALID")).toBe(true);
    expect(isContractLikeErrorCode("USERNAME_NOT_FOUND")).toBe(true);
  });

  it("returns true for specific standalone codes", () => {
    expect(isContractLikeErrorCode("SIMULATION_FAILED")).toBe(true);
    expect(isContractLikeErrorCode("WALLET_REJECTED")).toBe(true);
    expect(isContractLikeErrorCode("RATE_LIMIT_EXCEEDED")).toBe(true);
    expect(isContractLikeErrorCode("VALIDATION_ERROR")).toBe(true);
    expect(isContractLikeErrorCode("UNAUTHORIZED")).toBe(true);
    expect(isContractLikeErrorCode("FORBIDDEN")).toBe(true);
    expect(isContractLikeErrorCode("INTERNAL_SERVER_ERROR")).toBe(true);
    expect(isContractLikeErrorCode("NOT_FOUND")).toBe(true);
  });

  it("returns false for unrelated or undefined codes", () => {
    expect(isContractLikeErrorCode(undefined)).toBe(false);
    expect(isContractLikeErrorCode("")).toBe(false);
    expect(isContractLikeErrorCode("SOME_RANDOM_CODE")).toBe(false);
    expect(isContractLikeErrorCode("OK")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveContractError
// ---------------------------------------------------------------------------

describe("resolveContractError", () => {
  it("resolves a known contract error code from a NormalizedApiError", () => {
    const apiError: NormalizedApiError = {
      code: "CONTRACT_INSUFFICIENT_BALANCE",
      message: "raw technical message",
      status: 422,
      requestId: "req-123",
    };
    const view = resolveContractError(new QuickExClientError(apiError));

    expect(view.code).toBe("CONTRACT_INSUFFICIENT_BALANCE");
    expect(view.title).toBe("Not enough balance");
    expect(view.severity).toBe("error");
    expect(view.primaryAction).toBe("adjust");
    expect(view.recovery.length).toBeGreaterThan(0);
    expect(view.requestId).toBe("req-123");
    expect(view.status).toBe(422);
    expect(view.technicalMessage).toBe("raw technical message");
  });

  it("resolves STELLAR_ error codes", () => {
    const view = resolveContractError({
      code: "STELLAR_NETWORK_ERROR",
      message: "Horizon unreachable",
    } as NormalizedApiError);

    expect(view.code).toBe("STELLAR_NETWORK_ERROR");
    expect(view.title).toBe("Stellar network is unreachable");
    expect(view.primaryAction).toBe("retry");
    expect(view.severity).toBe("warning");
  });

  it("resolves REFUND_ error codes", () => {
    const view = resolveContractError({
      code: "REFUND_NOT_REFUNDABLE",
      message: "not refundable",
    } as NormalizedApiError);

    expect(view.code).toBe("REFUND_NOT_REFUNDABLE");
    expect(view.title).toBe("Refund is not available");
    expect(view.primaryAction).toBe("retry");
  });

  it("resolves LINK_ error codes", () => {
    const view = resolveContractError({
      code: "LINK_EXPIRED",
      message: "expired",
    } as NormalizedApiError);

    expect(view.code).toBe("LINK_EXPIRED");
    expect(view.title).toBe("Payment link expired");
    expect(view.primaryAction).toBe("adjust");
  });

  it("resolves USERNAME_ error codes", () => {
    const view = resolveContractError({
      code: "USERNAME_TAKEN",
      message: "already taken",
    } as NormalizedApiError);

    expect(view.code).toBe("USERNAME_TAKEN");
    expect(view.title).toBe("Username is already taken");
    expect(view.primaryAction).toBe("adjust");
    expect(view.severity).toBe("warning");
  });

  it("resolves RATE_LIMIT_EXCEEDED", () => {
    const view = resolveContractError({
      code: "RATE_LIMIT_EXCEEDED",
      message: "too many requests",
    } as NormalizedApiError);

    expect(view.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(view.title).toBe("Too many requests");
    expect(view.primaryAction).toBe("wait");
  });

  it("resolves VALIDATION_ERROR", () => {
    const view = resolveContractError({
      code: "VALIDATION_ERROR",
      message: "fields invalid",
    } as NormalizedApiError);

    expect(view.code).toBe("VALIDATION_ERROR");
    expect(view.title).toBe("Request validation failed");
    expect(view.primaryAction).toBe("adjust");
  });

  it("resolves INTERNAL_SERVER_ERROR", () => {
    const view = resolveContractError({
      code: "INTERNAL_SERVER_ERROR",
      message: "server broke",
    } as NormalizedApiError);

    expect(view.code).toBe("INTERNAL_SERVER_ERROR");
    expect(view.title).toBe("Server error");
    expect(view.primaryAction).toBe("retry");
  });

  it("maps numeric Soroban codes to named codes via aliases", () => {
    const view = resolveContractError({
      code: "100",
      message: "raw numeric error",
    } as NormalizedApiError);

    expect(view.code).toBe("CONTRACT_INVALID_AMOUNT");
    expect(view.title).toBe("Amount is invalid");
  });

  it("maps numeric code 302 to CONTRACT_ESCROW_NOT_FOUND", () => {
    const view = resolveContractError({
      code: "302",
      message: "escrow missing",
    } as NormalizedApiError);

    expect(view.code).toBe("CONTRACT_ESCROW_NOT_FOUND");
  });

  it("maps numeric code 307 to CONTRACT_ESCROW_EXPIRED", () => {
    const view = resolveContractError({
      code: "307",
      message: "escrow expired",
    } as NormalizedApiError);

    expect(view.code).toBe("CONTRACT_ESCROW_EXPIRED");
  });

  it("maps numeric code 314 to CONTRACT_VERSION_MISMATCH", () => {
    const view = resolveContractError({
      code: "314",
      message: "version mismatch",
    } as NormalizedApiError);

    expect(view.code).toBe("CONTRACT_VERSION_MISMATCH");
  });

  it("falls back to CONTRACT_UNKNOWN_ERROR for unrecognized codes", () => {
    const view = resolveContractError({
      code: "TOTALLY_UNKNOWN",
      message: "something unexpected",
    } as NormalizedApiError);

    expect(view.code).toBe("TOTALLY_UNKNOWN");
    expect(view.title).toBe("Contract action failed");
    expect(view.message).toBe("The contract returned an unexpected error.");
    expect(view.severity).toBe("error");
  });

  it("handles QuickExClientError instances", () => {
    const apiError: NormalizedApiError = {
      code: "CONTRACT_PAUSED",
      message: "paused by admin",
      requestId: "req-abc",
    };
    const clientError = new QuickExClientError(apiError);

    const view = resolveContractError(clientError);

    expect(view.code).toBe("CONTRACT_PAUSED");
    expect(view.title).toBe("Contract activity is paused");
    expect(view.requestId).toBe("req-abc");
  });

  it("handles plain Error objects", () => {
    const err = new Error("network timeout");

    const view = resolveContractError(err);

    expect(view.title).toBe("Contract action failed");
    expect(view.technicalMessage).toBe("network timeout");
  });

  it("handles null/undefined gracefully", () => {
    const view = resolveContractError(null);
    expect(view.title).toBe("Contract action failed");
    expect(view.code).toBe("UNKNOWN_ERROR");
  });

  it("handles WALLET_REJECTED as info severity", () => {
    const view = resolveContractError({
      code: "WALLET_REJECTED",
      message: "user declined",
    } as NormalizedApiError);

    expect(view.code).toBe("WALLET_REJECTED");
    expect(view.severity).toBe("info");
    expect(view.primaryAction).toBe("retry");
  });

  it("handles LINK_CANCELLED with dismiss action", () => {
    const view = resolveContractError({
      code: "LINK_CANCELLED",
      message: "cancelled",
    } as NormalizedApiError);

    expect(view.code).toBe("LINK_CANCELLED");
    expect(view.primaryAction).toBe("dismiss");
    expect(view.severity).toBe("warning");
  });

  it("handles CONTRACT_RESTORE_REQUIRED with restore action", () => {
    const view = resolveContractError({
      code: "CONTRACT_RESTORE_REQUIRED",
      message: "storage expired",
    } as NormalizedApiError);

    expect(view.code).toBe("CONTRACT_RESTORE_REQUIRED");
    expect(view.primaryAction).toBe("restore");
  });

  it("preserves requestId and status from the normalized error", () => {
    const apiError: NormalizedApiError = {
      code: "CONTRACT_UNAUTHORIZED",
      message: "not authorized",
      requestId: "req-xyz",
      status: 403,
    };
    const view = resolveContractError(new QuickExClientError(apiError));

    expect(view.requestId).toBe("req-xyz");
    expect(view.status).toBe(403);
    expect(view.technicalMessage).toBe("not authorized");
  });

  it("every known error code has required fields", () => {
    const knownCodes = [
      "CONTRACT_PAUSED",
      "CONTRACT_WRITES_DISABLED",
      "CONTRACT_ESCROW_NOT_FOUND",
      "CONTRACT_ESCROW_ALREADY_SETTLED",
      "CONTRACT_ESCROW_NOT_EXPIRED",
      "CONTRACT_ESCROW_EXPIRED",
      "CONTRACT_RESTORE_REQUIRED",
      "CONTRACT_INSUFFICIENT_BALANCE",
      "CONTRACT_INVALID_AMOUNT",
      "CONTRACT_UNAUTHORIZED",
      "CONTRACT_AUTH_MISSING",
      "CONTRACT_NOT_CONFIGURED",
      "CONTRACT_NOT_FOUND",
      "CONTRACT_STORAGE_MISSING",
      "CONTRACT_VERSION_MISMATCH",
      "CONTRACT_BUDGET_EXCEEDED",
      "CONTRACT_UNKNOWN_ERROR",
      "SIMULATION_FAILED",
      "STELLAR_NETWORK_ERROR",
      "STELLAR_TRANSACTION_FAILED",
      "STELLAR_INSUFFICIENT_FUNDS",
      "STELLAR_PATH_NOT_FOUND",
      "LINK_EXPIRED",
      "LINK_ALREADY_PAID",
      "LINK_CANCELLED",
      "LINK_NOT_FOUND",
      "LINK_LIMIT_EXCEEDED",
      "REFUND_NOT_REFUNDABLE",
      "REFUND_NOT_FOUND",
      "REFUND_IDEMPOTENCY_CONFLICT",
      "WALLET_REJECTED",
      "RATE_LIMIT_EXCEEDED",
      "VALIDATION_ERROR",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "USERNAME_TAKEN",
      "USERNAME_INVALID",
      "USERNAME_NOT_FOUND",
      "INTERNAL_SERVER_ERROR",
      "NOT_FOUND",
    ];

    for (const code of knownCodes) {
      const view = resolveContractError({
        code,
        message: "test",
      } as NormalizedApiError);

      expect(view.code, `code field for ${code}`).toBe(code);
      expect(view.title, `title for ${code}`).toBeTruthy();
      expect(view.message, `message for ${code}`).toBeTruthy();
      expect(view.recovery, `recovery for ${code}`).toBeInstanceOf(Array);
      expect(view.recovery.length, `recovery length for ${code}`).toBeGreaterThan(0);
      expect(view.contributorNote, `contributorNote for ${code}`).toBeTruthy();
      expect(
        ["info", "warning", "error"],
        `severity for ${code}`,
      ).toContain(view.severity);
      expect(
        ["retry", "adjust", "wait", "contact", "restore", "dismiss"],
        `primaryAction for ${code}`,
      ).toContain(view.primaryAction);
    }
  });
});
