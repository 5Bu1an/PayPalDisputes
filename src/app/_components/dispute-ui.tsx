import type { PayPalAction } from "@/lib/agent";
import type { DisputeRow } from "@/lib/dashboard";

/** What each agent draft does once sent, in seller-facing words. */
export const DRAFT_LABELS: Record<PayPalAction, string> = {
  provide_evidence: "Submit evidence",
  send_message: "Message",
  make_offer: "Offer note",
  accept_claim: "Accept & refund note",
};

const REASONS: Record<string, string> = {
  MERCHANDISE_OR_SERVICE_NOT_RECEIVED: "Item not received",
  MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: "Not as described",
  UNAUTHORISED: "Unauthorized",
  CREDIT_NOT_PROCESSED: "Credit not processed",
  DUPLICATE_TRANSACTION: "Duplicate transaction",
  INCORRECT_AMOUNT: "Incorrect amount",
  PAYMENT_BY_OTHER_MEANS: "Paid by other means",
  CANCELED_RECURRING_BILLING: "Canceled subscription",
  PROBLEM_WITH_REMITTANCE: "Problem with remittance",
  OTHER: "Other",
};

export function reasonLabel(reason: string | null) {
  return reason ? (REASONS[reason] ?? humanize(reason)) : "—";
}

/** Turns PayPal's ENUM_STYLE values into "Enum style". */
export function humanize(value: string | null) {
  if (!value) return "—";
  const words = value.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(amount);
}

/** "5 days left" / "Due today" / "Overdue", coloured by urgency. Only meaningful while PayPal waits on the seller. */
export function Deadline({ dueAt, daysLeft: days, status }: Pick<DisputeRow, "dueAt" | "daysLeft" | "status">) {
  if (status !== "WAITING_FOR_SELLER_RESPONSE" || !dueAt || days === null) {
    return <span className="text-zinc-400">—</span>;
  }
  const date = new Date(dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const [label, colour] =
    days < 0
      ? ["Overdue", "text-red-600 dark:text-red-400"]
      : days === 0
        ? ["Due today", "text-red-600 dark:text-red-400"]
        : [`${days} day${days === 1 ? "" : "s"} left`, days <= 3 ? "text-amber-600 dark:text-amber-400" : ""];
  return (
    <span className={colour}>
      {label} <span className="text-zinc-400">· {date}</span>
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  WAITING_FOR_SELLER_RESPONSE: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  WAITING_FOR_BUYER_RESPONSE: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  UNDER_REVIEW: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  RESOLVED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function StatusBadge({ status }: { status: string | null }) {
  const label = status === "WAITING_FOR_SELLER_RESPONSE" ? "Needs response" : humanize(status?.replace(/^WAITING_FOR_/, "Waiting for ") ?? null);
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status ?? ""] ?? STATUS_STYLES.RESOLVED
      }`}
    >
      {label}
    </span>
  );
}
