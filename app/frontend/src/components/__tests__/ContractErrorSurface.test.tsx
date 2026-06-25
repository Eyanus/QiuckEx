import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContractErrorSurface } from "../ContractErrorSurface";
import type { NormalizedApiError } from "@/lib/apiErrors";
import { QuickExClientError } from "@/lib/apiErrors";

describe("ContractErrorSurface", () => {
  // ---------------------------------------------------------------------------
  // Rendering — title, message, code badge
  // ---------------------------------------------------------------------------

  it("renders the title and message for a known contract error", () => {
    const error: NormalizedApiError = {
      code: "CONTRACT_INSUFFICIENT_BALANCE",
      message: "source account underfunded",
    };

    render(<ContractErrorSurface error={error} />);

    expect(screen.getByText("Not enough balance")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The source account does not have enough funds for the payment, reserve, or network fees.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("CONTRACT_INSUFFICIENT_BALANCE")).toBeInTheDocument();
  });

  it("renders the code badge as a mono-font label", () => {
    const error: NormalizedApiError = {
      code: "STELLAR_NETWORK_ERROR",
      message: "timeout",
    };

    render(<ContractErrorSurface error={error} />);

    const badge = screen.getByText("STELLAR_NETWORK_ERROR");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("font-mono");
  });

  it("renders recovery steps when not compact", () => {
    const error: NormalizedApiError = {
      code: "CONTRACT_ESCROW_EXPIRED",
      message: "expired",
    };

    render(<ContractErrorSurface error={error} compact={false} />);

    expect(
      screen.getByText("Ask the recipient to generate a new payment link."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Use the refund flow if you already funded this escrow."),
    ).toBeInTheDocument();
  });

  it("hides recovery steps when compact is true", () => {
    const error: NormalizedApiError = {
      code: "CONTRACT_ESCROW_EXPIRED",
      message: "expired",
    };

    render(<ContractErrorSurface error={error} compact />);

    expect(
      screen.queryByText("Ask the recipient to generate a new payment link."),
    ).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Severity styling
  // ---------------------------------------------------------------------------

  it("applies error severity styles for error-level codes", () => {
    const error: NormalizedApiError = {
      code: "CONTRACT_INSUFFICIENT_BALANCE",
      message: "underfunded",
    };

    const { container } = render(<ContractErrorSurface error={error} />);
    const section = container.querySelector("section");

    expect(section?.className).toContain("border-red");
  });

  it("applies warning severity styles for warning-level codes", () => {
    const error: NormalizedApiError = {
      code: "CONTRACT_PAUSED",
      message: "paused",
    };

    const { container } = render(<ContractErrorSurface error={error} />);
    const section = container.querySelector("section");

    expect(section?.className).toContain("border-amber");
  });

  it("applies info severity styles for info-level codes", () => {
    const error: NormalizedApiError = {
      code: "WALLET_REJECTED",
      message: "declined",
    };

    const { container } = render(<ContractErrorSurface error={error} />);
    const section = container.querySelector("section");

    expect(section?.className).toContain("border-sky");
  });

  // ---------------------------------------------------------------------------
  // Retry button
  // ---------------------------------------------------------------------------

  it("renders the retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    const error: NormalizedApiError = {
      code: "STELLAR_NETWORK_ERROR",
      message: "timeout",
    };

    render(<ContractErrorSurface error={error} onRetry={onRetry} />);

    const retryButton = screen.getByRole("button", { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("uses the custom retry label when provided", () => {
    const error: NormalizedApiError = {
      code: "STELLAR_NETWORK_ERROR",
      message: "timeout",
    };

    render(
      <ContractErrorSurface
        error={error}
        onRetry={() => {}}
        retryLabel="Retry Broadcast"
      />,
    );

    expect(screen.getByText("Retry Broadcast")).toBeInTheDocument();
  });

  it("shows context-aware retry label based on primary action", () => {
    const adjustError: NormalizedApiError = {
      code: "CONTRACT_INSUFFICIENT_BALANCE",
      message: "underfunded",
    };

    render(<ContractErrorSurface error={adjustError} onRetry={() => {}} />);

    expect(screen.getByText("Review Details")).toBeInTheDocument();
  });

  it("does not render retry button for dismiss-type errors", () => {
    const error: NormalizedApiError = {
      code: "LINK_CANCELLED",
      message: "cancelled",
    };

    render(<ContractErrorSurface error={error} onRetry={() => {}} />);

    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review details/i })).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Help button
  // ---------------------------------------------------------------------------

  it("renders the help button when onHelp is provided", () => {
    const onHelp = vi.fn();
    const error: NormalizedApiError = {
      code: "CONTRACT_PAUSED",
      message: "paused",
    };

    render(<ContractErrorSurface error={error} onHelp={onHelp} />);

    const helpButton = screen.getByRole("button", { name: /get help/i });
    expect(helpButton).toBeInTheDocument();

    fireEvent.click(helpButton);
    expect(onHelp).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Dismiss button
  // ---------------------------------------------------------------------------

  it("renders a dismiss button for dismiss-type errors when onDismiss is provided", () => {
    const onDismiss = vi.fn();
    const error: NormalizedApiError = {
      code: "LINK_CANCELLED",
      message: "cancelled",
    };

    render(
      <ContractErrorSurface error={error} onDismiss={onDismiss} />,
    );

    // There are two dismiss buttons: X close button and primary dismiss button
    const dismissButtons = screen.getAllByRole("button", { name: /dismiss/i });
    expect(dismissButtons).toHaveLength(2);

    // Click the primary dismiss button (the second one)
    fireEvent.click(dismissButtons[1]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders the X close button when onDismiss is provided", () => {
    const onDismiss = vi.fn();
    const error: NormalizedApiError = {
      code: "NOT_FOUND",
      message: "not found",
    };

    render(<ContractErrorSurface error={error} onDismiss={onDismiss} />);

    // The X button has aria-label="Dismiss"
    const closeButton = screen.getByLabelText("Dismiss");
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not render dismiss button when onDismiss is not provided", () => {
    const error: NormalizedApiError = {
      code: "LINK_CANCELLED",
      message: "cancelled",
    };

    render(<ContractErrorSurface error={error} />);

    expect(screen.queryByRole("button", { name: /dismiss/i })).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Contributor details (expandable section)
  // ---------------------------------------------------------------------------

  it("shows contributor details section with technical info", () => {
    const apiError: NormalizedApiError = {
      code: "CONTRACT_PAUSED",
      message: "admin paused writes",
      requestId: "req-abc-123",
      status: 503,
    };
    const error = new QuickExClientError(apiError);

    render(<ContractErrorSurface error={error} />);

    // Expand the details section
    const summary = screen.getByText("Contributor details");
    fireEvent.click(summary);

    expect(screen.getByText(/request_id: req-abc-123/)).toBeInTheDocument();
    expect(screen.getByText(/message: admin paused writes/)).toBeInTheDocument();
    expect(screen.getByText(/http_status: 503/)).toBeInTheDocument();
  });

  it("does not render contributor details when no technical info is available", () => {
    const error: NormalizedApiError = {
      code: "CONTRACT_PAUSED",
      message: "",
    };

    const { container } = render(<ContractErrorSurface error={error} />);
    const details = container.querySelector("details");

    // The details element exists because contributorNote is always present,
    // but requestId/technicalMessage/status may not show
    expect(details).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Contact support fallback
  // ---------------------------------------------------------------------------

  it("shows contact support link for contact-type errors when no onHelp", () => {
    const error: NormalizedApiError = {
      code: "CONTRACT_NOT_CONFIGURED",
      message: "no contract id",
    };

    render(<ContractErrorSurface error={error} />);

    const link = screen.getByRole("link", { name: /contact support/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("mailto:support@quickex.to");
  });

  it("does not show contact support link when onHelp is provided", () => {
    const error: NormalizedApiError = {
      code: "CONTRACT_NOT_CONFIGURED",
      message: "no contract id",
    };

    render(<ContractErrorSurface error={error} onHelp={() => {}} />);

    expect(screen.queryByRole("link", { name: /contact support/i })).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  it("has role=alert and aria-live=polite on the section element", () => {
    const error: NormalizedApiError = {
      code: "CONTRACT_PAUSED",
      message: "paused",
    };

    const { container } = render(<ContractErrorSurface error={error} />);
    const section = container.querySelector("section");

    expect(section?.getAttribute("role")).toBe("alert");
    expect(section?.getAttribute("aria-live")).toBe("polite");
  });

  // ---------------------------------------------------------------------------
  // Fallback for unknown errors
  // ---------------------------------------------------------------------------

  it("renders the fallback error view for completely unknown errors", () => {
    render(<ContractErrorSurface error={new Error("random crash")} />);

    expect(screen.getByText("Contract action failed")).toBeInTheDocument();
    expect(
      screen.getByText("The contract returned an unexpected error."),
    ).toBeInTheDocument();
  });

  it("handles null error gracefully", () => {
    render(<ContractErrorSurface error={null} />);

    expect(screen.getByText("Contract action failed")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Numeric Soroban code aliases
  // ---------------------------------------------------------------------------

  it("maps numeric Soroban error code 100 to CONTRACT_INVALID_AMOUNT", () => {
    const error: NormalizedApiError = {
      code: "100",
      message: "invalid amount from soroban",
    };

    render(<ContractErrorSurface error={error} />);

    expect(screen.getByText("Amount is invalid")).toBeInTheDocument();
    expect(screen.getByText("CONTRACT_INVALID_AMOUNT")).toBeInTheDocument();
  });

  it("maps numeric Soroban error code 300 to CONTRACT_PAUSED", () => {
    const error: NormalizedApiError = {
      code: "300",
      message: "paused by soroban",
    };

    render(<ContractErrorSurface error={error} />);

    expect(screen.getByText("Contract activity is paused")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // New backend error codes
  // ---------------------------------------------------------------------------

  it("renders USERNAME_TAKEN with appropriate copy", () => {
    const error: NormalizedApiError = {
      code: "USERNAME_TAKEN",
      message: "already claimed",
    };

    render(<ContractErrorSurface error={error} />);

    expect(screen.getByText("Username is already taken")).toBeInTheDocument();
    expect(
      screen.getByText("Another user has already claimed this username."),
    ).toBeInTheDocument();
  });

  it("renders VALIDATION_ERROR with field review guidance", () => {
    const error: NormalizedApiError = {
      code: "VALIDATION_ERROR",
      message: "fields bad",
    };

    render(<ContractErrorSurface error={error} />);

    expect(screen.getByText("Request validation failed")).toBeInTheDocument();
    expect(
      screen.getByText("Review the highlighted fields and correct any errors."),
    ).toBeInTheDocument();
  });

  it("renders INTERNAL_SERVER_ERROR with retry guidance", () => {
    const error: NormalizedApiError = {
      code: "INTERNAL_SERVER_ERROR",
      message: "500 internal",
    };

    render(<ContractErrorSurface error={error} onRetry={() => {}} />);

    expect(screen.getByText("Server error")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });
});
