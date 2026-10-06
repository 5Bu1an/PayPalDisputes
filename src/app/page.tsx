import { connection } from "next/server";
import { listDisputes, type DisputeRow } from "@/lib/dashboard";

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

/** Turns PayPal's ENUM_STYLE values into "Enum style". */
function humanize(value: string | null) {
  if (!value) return "—";
  const words = value.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(amount);
}

/** "5 days left" / "Due today" / "Overdue", coloured by urgency. Only meaningful while PayPal waits on the seller. */
function Deadline({ dueAt, daysLeft: days, status }: Pick<DisputeRow, "dueAt" | "daysLeft" | "status">) {
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

function StatusBadge({ status }: { status: string | null }) {
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

function DisputesTable({ disputes }: { disputes: DisputeRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-medium">Dispute</th>
            <th className="px-4 py-3 font-medium">Seller</th>
            <th className="px-4 py-3 font-medium">Reason</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Respond by</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {disputes.map((d) => (
            <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{d.id}</td>
              <td className="px-4 py-3">
                {d.sellerName ?? <span className="text-zinc-400">Unlinked ({d.merchantId ?? "unknown"})</span>}
              </td>
              <td className="px-4 py-3">{d.reason ? (REASONS[d.reason] ?? humanize(d.reason)) : "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatAmount(d.amount, d.currency)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={d.status} />
                <div className="mt-1 text-xs text-zinc-400">{humanize(d.stage)}</div>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Deadline dueAt={d.dueAt} daysLeft={d.daysLeft} status={d.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DisputesPage() {
  await connection(); // always read fresh rows from Supabase, never a build-time snapshot
  const disputes = await listDisputes();
  const needsResponse = disputes.filter((d) => d.status === "WAITING_FOR_SELLER_RESPONSE").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Disputes</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {disputes.length} total · {needsResponse} need{needsResponse === 1 ? "s" : ""} a response
        </p>
      </header>

      {disputes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No disputes yet. Run <code className="font-mono">npm run sync</code> to pull them from PayPal.
        </p>
      ) : (
        <DisputesTable disputes={disputes} />
      )}
    </main>
  );
}
