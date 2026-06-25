"use client";

import React from "react";
import { AlertTriangle, ExternalLink, LifeBuoy, RefreshCw, X } from "lucide-react";
import {
  ContractErrorView,
  resolveContractError,
} from "@/lib/contractErrors";
import { NormalizedApiError } from "@/lib/apiErrors";

type ContractErrorSurfaceProps = {
  error: ContractErrorView | NormalizedApiError | unknown;
  onRetry?: () => void;
  onHelp?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  helpLabel?: string;
  dismissLabel?: string;
  compact?: boolean;
  className?: string;
};

const severityClasses: Record<ContractErrorView["severity"], string> = {
  info: "border-sky-400/20 bg-sky-500/10 text-sky-100",
  warning: "border-amber-400/20 bg-amber-500/10 text-amber-100",
  error: "border-red-400/20 bg-red-500/10 text-red-100",
};

const iconClasses: Record<ContractErrorView["severity"], string> = {
  info: "text-sky-300",
  warning: "text-amber-300",
  error: "text-red-300",
};

function defaultRetryLabel(action: ContractErrorView["primaryAction"]): string {
  switch (action) {
    case "adjust":
      return "Review Details";
    case "restore":
      return "Retry After Restore";
    case "wait":
      return "Check Again";
    case "contact":
      return "Retry";
    case "dismiss":
      return "Dismiss";
    case "retry":
    default:
      return "Try Again";
  }
}

export function ContractErrorSurface({
  error,
  onRetry,
  onHelp,
  onDismiss,
  retryLabel,
  helpLabel = "Get Help",
  dismissLabel = "Dismiss",
  compact = false,
  className = "",
}: ContractErrorSurfaceProps) {
  const resolved = resolveContractError(error);

  return (
    <section
      role="alert"
      aria-live="polite"
      className={`relative rounded-2xl border p-4 ${severityClasses[resolved.severity]} ${className}`}
    >
      {/* Dismiss button (top-right corner) */}
      {(onDismiss || resolved.primaryAction === "dismiss") && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="absolute right-3 top-3 rounded-lg p-1 text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
      <div className="flex gap-3">
        <AlertTriangle
          aria-hidden="true"
          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${iconClasses[resolved.severity]}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-white">{resolved.title}</h3>
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-white/70">
              {resolved.code}
            </span>
          </div>

          <p className="mt-1 text-sm leading-relaxed text-white/85">
            {resolved.message}
          </p>

          {!compact && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-white/75">
              {resolved.recovery.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {onRetry && resolved.primaryAction !== "dismiss" && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-neutral-950 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                {retryLabel ?? defaultRetryLabel(resolved.primaryAction)}
              </button>
            )}
            {onHelp && (
              <button
                type="button"
                onClick={onHelp}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <LifeBuoy aria-hidden="true" className="h-3.5 w-3.5" />
                {helpLabel}
              </button>
            )}
            {onDismiss && resolved.primaryAction === "dismiss" && (
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-neutral-950 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {dismissLabel}
              </button>
            )}
          </div>

          {(resolved.requestId || resolved.technicalMessage || resolved.contributorNote) && (
            <details className="mt-3 text-xs text-white/60">
              <summary className="cursor-pointer select-none font-semibold text-white/70">
                Contributor details
              </summary>
              <div className="mt-2 space-y-1 rounded-xl border border-white/10 bg-black/20 p-3">
                <p>{resolved.contributorNote}</p>
                {resolved.requestId && (
                  <p className="font-mono">request_id: {resolved.requestId}</p>
                )}
                {resolved.technicalMessage && (
                  <p className="break-words font-mono">
                    message: {resolved.technicalMessage}
                  </p>
                )}
                {resolved.status && (
                  <p className="font-mono">http_status: {resolved.status}</p>
                )}
              </div>
            </details>
          )}

          {resolved.primaryAction === "contact" && !onHelp && (
            <a
              href="mailto:support@quickex.to"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white underline decoration-white/40 underline-offset-4"
            >
              Contact support
              <ExternalLink aria-hidden="true" className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
