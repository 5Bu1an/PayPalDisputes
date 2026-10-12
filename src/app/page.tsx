import { connection } from "next/server";
import Link from "next/link";
import { listDisputes, type ListedDispute } from "@/lib/dashboard";
import {
  Deadline,
  formatAmount,
  humanize,
  LevelBadge,
  reasonLabel,
  RecommendationBadge,
  StatusBadge,
} from "./_components/dispute-ui";

const REPORT_STATUS: Record<string, string> = {
  submitted: "Sent to PayPal",
  approved: "Sending…",
  rejected: "You rejected it",
  failed: "Sending failed",
};

/** The AI's call on a dispute: recommendation + risk while it awaits review, or what happened to it. */
function AiCell({ d }: { d: ListedDispute }) {
  const r = d.report;
  if (!r) {
    return d.status === "WAITING_FOR_SELLER_RESPONSE" ? (
      <span className="text-xs text-zinc-400">Assessing…</span>
    ) : (
      <span className="text-zinc-400">—</span>
    );
  }
  const note = r.status !== "pending_review" ? REPORT_STATUS[r.status] : !r.current ? "Updating…" : null;
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <RecommendationBadge recommendation={r.recommendation} settleAmount={r.settleAmount} currency={d.currency} size="sm" />
        {r.risk && r.status === "pending_review" && <LevelBadge name="Risk" level={r.risk} />}
      </div>
      {note && <span className={`text-xs ${r.status === "failed" ? "text-red-600 dark:text-red-400" : "text-zinc-400"}`}>{note}</span>}
    </div>
  );
}

function DisputesTable({ disputes }: { disputes: ListedDispute[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-medium">Dispute</th>
            <th className="px-4 py-3 font-medium">Seller</th>
            <th className="px-4 py-3 font-medium">Reason</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">AI recommends</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Respond by</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {disputes.map((d) => (
            <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                <Link href={`/disputes/${d.id}`} className="text-sky-700 hover:underline dark:text-sky-400">
                  {d.id}
                </Link>
              </td>
              <td className="px-4 py-3">
                {d.sellerName ?? <span className="text-zinc-400">Unlinked ({d.merchantId ?? "unknown"})</span>}
              </td>
              <td className="px-4 py-3">{reasonLabel(d.reason)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatAmount(d.amount, d.currency)}</td>
              <td className="px-4 py-3">
                <AiCell d={d} />
              </td>
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
  const toReview = disputes.filter((d) => d.report?.status === "pending_review" && d.report.current).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Disputes</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {disputes.length} total · {needsResponse} need{needsResponse === 1 ? "s" : ""} a response
          {toReview > 0 && (
            <>
              {" · "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {toReview} AI report{toReview === 1 ? "" : "s"} ready for your review
              </span>
            </>
          )}
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
