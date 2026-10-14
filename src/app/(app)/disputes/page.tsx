import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Badge, DecisionBadge } from "@/components/ui/primitives";
import { Deadline, formatAmount, humanize, reasonLabel, StatusBadge } from "@/app/_components/dispute-ui";
import { getHomeDataCached, type HomeDispute } from "@/lib/dashboard";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Disputes · Kaleshi" };

const VIEWS = {
  all: { label: "All", match: () => true },
  approval: {
    label: "Waiting for approval",
    match: (d: HomeDispute) => d.status !== "RESOLVED" && d.decision?.status === "pending_review" && d.decision.current,
  },
  "needs-response": { label: "Needs response", match: (d: HomeDispute) => d.status === "WAITING_FOR_SELLER_RESPONSE" },
  resolved: { label: "Resolved", match: (d: HomeDispute) => d.status === "RESOLVED" },
} as const;
type View = keyof typeof VIEWS;

/** Soonest seller deadline first; disputes without one go last. */
const byDeadline = (a: HomeDispute, b: HomeDispute) =>
  (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity);

export default async function DisputesPage({ searchParams }: PageProps<"/disputes">) {
  await connection(); // always read fresh rows from Supabase, never a build-time snapshot
  const { view: rawView } = await searchParams;
  const view: View = typeof rawView === "string" && rawView in VIEWS ? (rawView as View) : "all";
  const { disputes } = await getHomeDataCached();
  const rows = disputes.filter(VIEWS[view].match).sort(byDeadline);

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-20 md:px-10 md:pt-10">
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-fg">Disputes</h1>
        <p className="mt-1 text-[13.5px] text-fg-body">
          Every response waits for your approval before it reaches PayPal.
        </p>
      </header>

      <nav aria-label="Filter disputes" className="mt-6 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {(Object.keys(VIEWS) as View[]).map((key) => {
          const count = disputes.filter(VIEWS[key].match).length;
          const active = key === view;
          return (
            <Link
              key={key}
              href={key === "all" ? "/disputes" : `/disputes?view=${key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-11 shrink-0 items-center gap-2 px-3 text-[14px] transition-colors",
                active ? "font-medium text-fg" : "text-fg-body hover:text-fg",
              )}
            >
              {VIEWS[key].label}
              <span className={cn("rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums", active ? "bg-fg text-white" : "bg-muted text-fg-body")}>
                {count}
              </span>
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-fg" />}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line-strong p-10 text-center text-[14px] text-fg-body">
          {disputes.length === 0 ? (
            <>
              No disputes yet. Run <code className="font-mono">npm run sync</code> to pull them from PayPal.
            </>
          ) : (
            "Nothing here right now."
          )}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <thead className="bg-subtle text-[12.5px] text-fg-body">
              <tr>
                <th className="px-5 py-3.5 font-medium">Buyer</th>
                <th className="px-4 py-3.5 font-medium">Reason</th>
                <th className="px-4 py-3.5 font-medium">Status</th>
                <th className="px-4 py-3.5 font-medium">Recommendation</th>
                <th className="px-4 py-3.5 font-medium">Respond by</th>
                <th className="px-5 py-3.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {rows.map((d) => (
                <tr key={d.id} className="relative transition-colors hover:bg-subtle/60">
                  <td className="px-5 py-3.5">
                    <Link href={`/disputes/${d.id}`} className="font-medium text-fg after:absolute after:inset-0">
                      {d.buyerName ?? "Unknown buyer"}
                    </Link>
                    <span className="block font-mono text-[11.5px] text-fg-muted">
                      {d.id}
                      {d.sellerName ? ` · ${d.sellerName}` : d.merchantId ? ` · Unlinked (${d.merchantId})` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-fg-body">{reasonLabel(d.reason)}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={d.status} />
                    <span className="mt-1 block text-[12px] text-fg-muted">{humanize(d.stage)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {d.decision?.recommendation ? (
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <DecisionBadge decision={d.decision.recommendation} />
                        {VIEWS.approval.match(d) && <Badge tone="info">Needs approval</Badge>}
                        {!d.decision.current && d.status !== "RESOLVED" && <Badge tone="warn">Outdated</Badge>}
                      </span>
                    ) : (
                      <span className="text-fg-muted">Not assessed</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Deadline dueAt={d.dueAt} daysLeft={d.daysLeft} status={d.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium whitespace-nowrap text-fg tabular-nums">
                    {formatAmount(d.amount, d.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
