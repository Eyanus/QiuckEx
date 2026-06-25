import { NormalizedApiError, normalizeUnknownError } from "@/lib/apiErrors";

export type ContractErrorSeverity = "info" | "warning" | "error";

export type ContractErrorAction = "retry" | "adjust" | "wait" | "contact" | "restore" | "dismiss";

export type ContractErrorView = {
  code: string;
  title: string;
  message: string;
  recovery: string[];
  contributorNote: string;
  severity: ContractErrorSeverity;
  primaryAction: ContractErrorAction;
  requestId?: string;
  status?: number;
  technicalMessage?: string;
};

type ContractErrorCopy = Omit<
  ContractErrorView,
  "code" | "requestId" | "status" | "technicalMessage"
>;

const CONTRACT_ERROR_COPY: Record<string, ContractErrorCopy> = {
  CONTRACT_PAUSED: {
    title: "Contract activity is paused",
    message: "QuickEx has temporarily paused contract writes for this flow.",
    recovery: [
      "Wait a few minutes and try again.",
      "Do not submit the same wallet transaction manually while writes are paused.",
    ],
    contributorNote: "Check pause flags, contract admin status, and deployment runbooks before re-enabling writes.",
    severity: "warning",
    primaryAction: "wait",
  },
  CONTRACT_WRITES_DISABLED: {
    title: "Contract writes are disabled",
    message: "This network is currently blocking contract-changing actions.",
    recovery: [
      "Retry after the network status changes.",
      "If you are testing, ask an admin to review the contract write feature flag.",
    ],
    contributorNote: "This is usually controlled by the testnet/mainnet contract_writes feature flag.",
    severity: "warning",
    primaryAction: "wait",
  },
  CONTRACT_ESCROW_NOT_FOUND: {
    title: "Escrow was not found",
    message: "The escrow record for this payment could not be found on-chain.",
    recovery: [
      "Refresh the page to load the latest payment state.",
      "Check whether this payment was already withdrawn, refunded, or created on a different network.",
    ],
    contributorNote: "Verify the escrow commitment, contract ID, network, and indexer freshness.",
    severity: "error",
    primaryAction: "retry",
  },
  CONTRACT_ESCROW_ALREADY_SETTLED: {
    title: "Escrow is already settled",
    message: "This escrow has already been completed or refunded.",
    recovery: [
      "Refresh the payment status.",
      "Check the transaction history before attempting another action.",
    ],
    contributorNote: "Treat this as an idempotent terminal state where possible.",
    severity: "info",
    primaryAction: "retry",
  },
  CONTRACT_ESCROW_NOT_EXPIRED: {
    title: "Refund is not available yet",
    message: "This escrow has not reached its refund window.",
    recovery: [
      "Wait until the expiry time shown on the payment.",
      "Use withdraw or complete-payment actions if the escrow is still active.",
    ],
    contributorNote: "Compare ledger time against escrow expiry before presenting refund actions.",
    severity: "warning",
    primaryAction: "wait",
  },
  CONTRACT_ESCROW_EXPIRED: {
    title: "Payment window expired",
    message: "The escrow can no longer be withdrawn because its payment window has closed.",
    recovery: [
      "Ask the recipient to generate a new payment link.",
      "Use the refund flow if you already funded this escrow.",
    ],
    contributorNote: "Hide withdraw actions for expired escrows and prefer refund recovery paths.",
    severity: "warning",
    primaryAction: "adjust",
  },
  CONTRACT_RESTORE_REQUIRED: {
    title: "Contract storage needs restoration",
    message: "Some on-chain state expired and must be restored before this action can continue.",
    recovery: [
      "Try again after storage restoration completes.",
      "If you are a contributor, run the restore flow for the affected ledger entry.",
    ],
    contributorNote: "Build or invoke the Soroban restore footprint flow, then retry simulation.",
    severity: "warning",
    primaryAction: "restore",
  },
  CONTRACT_INSUFFICIENT_BALANCE: {
    title: "Not enough balance",
    message: "The source account does not have enough funds for the payment, reserve, or network fees.",
    recovery: [
      "Add funds to the wallet and keep extra XLM for fees and minimum reserve.",
      "Try a smaller amount or choose another source asset.",
    ],
    contributorNote: "Check token balance, trustlines, minimum reserve, and fee estimates from simulation.",
    severity: "error",
    primaryAction: "adjust",
  },
  CONTRACT_INVALID_AMOUNT: {
    title: "Amount is invalid",
    message: "The contract rejected the amount for this action.",
    recovery: [
      "Enter an amount greater than zero.",
      "Use the asset precision supported by Stellar, up to 7 decimal places.",
    ],
    contributorNote: "Validate amount and stroop conversion before compose/simulation.",
    severity: "error",
    primaryAction: "adjust",
  },
  CONTRACT_UNAUTHORIZED: {
    title: "Wallet is not authorized",
    message: "The connected wallet cannot perform this contract action.",
    recovery: [
      "Switch to the wallet that owns or administers this escrow.",
      "Review the signing request and try again.",
    ],
    contributorNote: "Verify auth entries, source account, signer weights, and role checks.",
    severity: "error",
    primaryAction: "adjust",
  },
  CONTRACT_AUTH_MISSING: {
    title: "Wallet authorization is missing",
    message: "The transaction is missing a required authorization entry.",
    recovery: [
      "Retry signing from the wallet prompt.",
      "If this keeps happening, refresh and rebuild the transaction.",
    ],
    contributorNote: "Inspect the built XDR and ensure required auth entries are assembled before signing.",
    severity: "error",
    primaryAction: "retry",
  },
  CONTRACT_NOT_CONFIGURED: {
    title: "Contract is not configured",
    message: "The server does not have a QuickEx contract ID configured for this network.",
    recovery: [
      "Try again later.",
      "Contributors should set QUICKEX_CONTRACT_ID for the selected network.",
    ],
    contributorNote: "Check environment variables and deployment configuration.",
    severity: "error",
    primaryAction: "contact",
  },
  CONTRACT_NOT_FOUND: {
    title: "Contract or account was not found",
    message: "The requested contract resource does not exist on this network.",
    recovery: [
      "Confirm you are on the expected Stellar network.",
      "Check that the contract ID and source account are correct.",
    ],
    contributorNote: "Validate network selection, contract registry entries, and account funding.",
    severity: "error",
    primaryAction: "adjust",
  },
  CONTRACT_STORAGE_MISSING: {
    title: "Contract state is missing",
    message: "The contract is missing state required for this action.",
    recovery: [
      "Refresh the page and try again.",
      "Confirm the payment or escrow was created before retrying.",
    ],
    contributorNote: "Check initialization, storage keys, and migration state.",
    severity: "error",
    primaryAction: "retry",
  },
  CONTRACT_VERSION_MISMATCH: {
    title: "Contract version mismatch",
    message: "This action is not compatible with the deployed contract version.",
    recovery: [
      "Refresh the app to load the latest client.",
      "If the issue remains, contact support with the request ID.",
    ],
    contributorNote: "Check schema version, migrations, contract registry, and frontend/backend compatibility.",
    severity: "error",
    primaryAction: "contact",
  },
  CONTRACT_BUDGET_EXCEEDED: {
    title: "Transaction is too complex",
    message: "The transaction exceeds Soroban compute or size limits.",
    recovery: [
      "Try a simpler action or reduce the number of path hops.",
      "Retry after refreshing the quote.",
    ],
    contributorNote: "Inspect simulation resource estimates and split complex operations.",
    severity: "error",
    primaryAction: "adjust",
  },
  CONTRACT_UNKNOWN_ERROR: {
    title: "Contract action failed",
    message: "The contract returned an unexpected error.",
    recovery: [
      "Retry once after refreshing the page.",
      "If it happens again, report the issue with the request ID.",
    ],
    contributorNote: "Inspect backend technicalError/details and map this case to a stable code if recurrent.",
    severity: "error",
    primaryAction: "retry",
  },
  SIMULATION_FAILED: {
    title: "Simulation failed",
    message: "The transaction would fail before it reaches the Stellar network.",
    recovery: [
      "Check the wallet balance, trustlines, amount, and expiry.",
      "Refresh the quote and run preflight again.",
    ],
    contributorNote: "Backend should map the raw Soroban error to a CONTRACT_* code when possible.",
    severity: "error",
    primaryAction: "adjust",
  },
  STELLAR_NETWORK_ERROR: {
    title: "Stellar network is unreachable",
    message: "QuickEx could not reach Horizon or Soroban RPC.",
    recovery: [
      "Retry in a few seconds.",
      "If you already signed a transaction, retry broadcast instead of signing again.",
    ],
    contributorNote: "Check Horizon/RPC health, timeout logs, and retry-after behavior.",
    severity: "warning",
    primaryAction: "retry",
  },
  STELLAR_TRANSACTION_FAILED: {
    title: "Stellar rejected the transaction",
    message: "The network rejected the submitted transaction.",
    recovery: [
      "Refresh and rebuild the transaction.",
      "Check signer permissions, sequence number, balance, and trustlines.",
    ],
    contributorNote: "Surface result codes from Horizon/Soroban RPC when available.",
    severity: "error",
    primaryAction: "adjust",
  },
  STELLAR_INSUFFICIENT_FUNDS: {
    title: "Not enough Stellar balance",
    message: "The source account needs more balance to cover the payment and network requirements.",
    recovery: [
      "Add funds to the wallet.",
      "Keep enough XLM for fees and minimum reserve, then retry.",
    ],
    contributorNote: "Confirm reserve math and asset trustline balance in compose.",
    severity: "error",
    primaryAction: "adjust",
  },
  STELLAR_PATH_NOT_FOUND: {
    title: "No payment path found",
    message: "There is no available conversion path for the selected assets and amount.",
    recovery: [
      "Choose a different source asset.",
      "Try a smaller amount or refresh the quote.",
    ],
    contributorNote: "Check Horizon strict-receive path results and liquidity assumptions.",
    severity: "warning",
    primaryAction: "adjust",
  },
  LINK_EXPIRED: {
    title: "Payment link expired",
    message: "This link has passed its expiry time.",
    recovery: [
      "Ask the recipient for a new payment link.",
      "Do not send funds to an expired request.",
    ],
    contributorNote: "Keep pay actions hidden for expired links.",
    severity: "warning",
    primaryAction: "adjust",
  },
  LINK_ALREADY_PAID: {
    title: "Payment link already paid",
    message: "This payment request has already been fulfilled.",
    recovery: [
      "Refresh the page to see the latest transaction status.",
      "Create a new link for another payment.",
    ],
    contributorNote: "Treat this as a terminal state and link to the transaction when available.",
    severity: "info",
    primaryAction: "retry",
  },
  REFUND_NOT_REFUNDABLE: {
    title: "Refund is not available",
    message: "This payment is not in a state that allows refunds.",
    recovery: [
      "Refresh the payment status.",
      "Check whether the escrow is still active, already refunded, or already withdrawn.",
    ],
    contributorNote: "Align refund CTA visibility with backend refund eligibility rules.",
    severity: "warning",
    primaryAction: "retry",
  },
  REFUND_NOT_FOUND: {
    title: "Refund request was not found",
    message: "QuickEx could not find that refund attempt.",
    recovery: [
      "Refresh the refund list.",
      "Confirm the refund ID before trying again.",
    ],
    contributorNote: "Verify refund attempt IDs and idempotency-key usage.",
    severity: "error",
    primaryAction: "retry",
  },
  REFUND_IDEMPOTENCY_CONFLICT: {
    title: "Refund request conflicts",
    message: "This refund key was already used for a different refund request.",
    recovery: [
      "Refresh and submit the refund again.",
      "Do not reuse the same idempotency key for different refund details.",
    ],
    contributorNote: "Generate idempotency keys per refund intent and preserve them only for exact retries.",
    severity: "error",
    primaryAction: "retry",
  },
  WALLET_REJECTED: {
    title: "Wallet request was rejected",
    message: "The transaction was not signed because the wallet request was declined.",
    recovery: [
      "Review the transaction summary.",
      "Try signing again when you are ready.",
    ],
    contributorNote: "This is a user-controlled stop, not a contract failure.",
    severity: "info",
    primaryAction: "retry",
  },
  RATE_LIMIT_EXCEEDED: {
    title: "Too many requests",
    message: "You have sent too many requests in a short period.",
    recovery: [
      "Wait a moment and try again.",
      "If you are using an API key, check that it is sent via the X-API-Key header for higher limits.",
    ],
    contributorNote: "Check details.retryAfterSeconds for the exact wait time. API keys increase limits from 20 to 120 req/min.",
    severity: "warning",
    primaryAction: "wait",
  },
  VALIDATION_ERROR: {
    title: "Request validation failed",
    message: "One or more fields in your request are invalid.",
    recovery: [
      "Review the highlighted fields and correct any errors.",
      "Ensure amounts are positive numbers and asset codes are valid.",
    ],
    contributorNote: "Check error.fields for per-field validation messages.",
    severity: "error",
    primaryAction: "adjust",
  },
  UNAUTHORIZED: {
    title: "Authentication required",
    message: "You need to sign in or provide a valid API key to continue.",
    recovery: [
      "Connect your wallet or provide a valid API key.",
      "If using an API key, send it in the X-API-Key header.",
    ],
    contributorNote: "Verify API key validity and scope. Check X-API-Key header usage.",
    severity: "error",
    primaryAction: "adjust",
  },
  FORBIDDEN: {
    title: "Access denied",
    message: "Your credentials do not have permission for this action.",
    recovery: [
      "Create an API key with the required scopes.",
      "Contact an administrator if you need elevated permissions.",
    ],
    contributorNote: "Check API key scopes (e.g. refunds:write, admin). Create a new key with broader scopes if needed.",
    severity: "error",
    primaryAction: "contact",
  },
  USERNAME_TAKEN: {
    title: "Username is already taken",
    message: "Another user has already claimed this username.",
    recovery: [
      "Try a different username.",
      "Add numbers or underscores to make it unique.",
    ],
    contributorNote: "Present username suggestions or an alternate-name picker.",
    severity: "warning",
    primaryAction: "adjust",
  },
  USERNAME_INVALID: {
    title: "Username format is invalid",
    message: "Usernames must be 3-32 lowercase letters, numbers, or underscores.",
    recovery: [
      "Use only lowercase letters, numbers, and underscores.",
      "Make sure the username is between 3 and 32 characters.",
    ],
    contributorNote: "Pattern: ^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$ or ^[a-z0-9]{1,32}$",
    severity: "error",
    primaryAction: "adjust",
  },
  USERNAME_NOT_FOUND: {
    title: "Username not found",
    message: "No QuickEx user exists with that username.",
    recovery: [
      "Check the spelling of the username.",
      "The user may have changed their username or the link may be outdated.",
    ],
    contributorNote: "Verify username exists in Supabase before routing.",
    severity: "warning",
    primaryAction: "adjust",
  },
  LINK_NOT_FOUND: {
    title: "Payment link not found",
    message: "This payment link does not exist or has been removed.",
    recovery: [
      "Verify the link URL is correct.",
      "Ask the recipient to generate a new payment link.",
    ],
    contributorNote: "Check link parameters (username, amount, asset) and database.",
    severity: "warning",
    primaryAction: "adjust",
  },
  LINK_CANCELLED: {
    title: "Payment link was cancelled",
    message: "The creator has cancelled this payment link.",
    recovery: [
      "Contact the recipient to generate a new link.",
      "Do not send funds to a cancelled link.",
    ],
    contributorNote: "Treat as terminal state, similar to LINK_EXPIRED.",
    severity: "warning",
    primaryAction: "dismiss",
  },
  LINK_LIMIT_EXCEEDED: {
    title: "Too many active links",
    message: "You have reached the maximum number of active payment links.",
    recovery: [
      "Delete or cancel unused payment links.",
      "Contact support if you need a higher limit.",
    ],
    contributorNote: "Check user's active link count vs. configured limit.",
    severity: "warning",
    primaryAction: "adjust",
  },
  INTERNAL_SERVER_ERROR: {
    title: "Server error",
    message: "Something went wrong on our end. This is not your fault.",
    recovery: [
      "Retry the action once after a few seconds.",
      "If the problem persists, report the issue with the request ID.",
    ],
    contributorNote: "Check server logs with the request_id. This may indicate a deployment or infrastructure issue.",
    severity: "error",
    primaryAction: "retry",
  },
  NOT_FOUND: {
    title: "Resource not found",
    message: "The page or resource you are looking for does not exist.",
    recovery: [
      "Check the URL and try again.",
      "Navigate back to the homepage and start over.",
    ],
    contributorNote: "Verify the resource path and ID are correct.",
    severity: "warning",
    primaryAction: "dismiss",
  },
};

const CONTRACT_NUMERIC_CODE_ALIASES: Record<string, string> = {
  "100": "CONTRACT_INVALID_AMOUNT",
  "200": "CONTRACT_UNAUTHORIZED",
  "300": "CONTRACT_PAUSED",
  "302": "CONTRACT_ESCROW_NOT_FOUND",
  "304": "CONTRACT_ESCROW_ALREADY_SETTLED",
  "307": "CONTRACT_ESCROW_EXPIRED",
  "308": "CONTRACT_ESCROW_NOT_EXPIRED",
  "313": "CONTRACT_PAUSED",
  "314": "CONTRACT_VERSION_MISMATCH",
  "315": "CONTRACT_INVALID_AMOUNT",
  "500": "CONTRACT_AUTH_MISSING",
  "501": "CONTRACT_AUTH_MISSING",
  "900": "CONTRACT_UNKNOWN_ERROR",
};

export function isContractLikeErrorCode(code: string | undefined): boolean {
  return Boolean(
    code &&
      (code.startsWith("CONTRACT_") ||
        code.startsWith("STELLAR_") ||
        code.startsWith("REFUND_") ||
        code.startsWith("LINK_") ||
        code.startsWith("USERNAME_") ||
        code === "SIMULATION_FAILED" ||
        code === "WALLET_REJECTED" ||
        code === "RATE_LIMIT_EXCEEDED" ||
        code === "VALIDATION_ERROR" ||
        code === "UNAUTHORIZED" ||
        code === "FORBIDDEN" ||
        code === "INTERNAL_SERVER_ERROR" ||
        code === "NOT_FOUND"),
  );
}

export function resolveContractError(error: NormalizedApiError | unknown): ContractErrorView {
  const normalized = normalizeUnknownError(error);
  const aliasCode = CONTRACT_NUMERIC_CODE_ALIASES[normalized.code] ?? normalized.code;
  const copy =
    CONTRACT_ERROR_COPY[aliasCode] ??
    CONTRACT_ERROR_COPY[normalized.code] ??
    CONTRACT_ERROR_COPY.CONTRACT_UNKNOWN_ERROR;

  return {
    code: aliasCode,
    ...copy,
    requestId: normalized.requestId,
    status: normalized.status,
    technicalMessage: normalized.message,
  };
}
