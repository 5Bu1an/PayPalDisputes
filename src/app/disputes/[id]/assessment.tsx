import type { computeUrgency } from "@/lib/agent";
import type { Decision } from "@/lib/dashboard";
import { formatAmount } from "../../_components/dispute-ui";

type Level = "high" | "medium" | "low";
type Draft = Decision["assessment"]["drafts"][number];

const RECOMMENDATION: Record<string, { label: string; style: string }> = {
  fight: { label: "Fight", style: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200" },
  refund: { label: "Refund", style: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" },
  settle: { label: "Settle", style: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200" },
};

const LEVEL_STYLES: Record<Level, string> = {
  high: "border-red-200 text-red-700 dark:border-red-900 dark:text-red-400",
  medium: "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-400",
  low: "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400",
};

/** What each draft does once sent, in seller-facing words. */
const DRAFT_LABELS: Record<Draft["action"], string> = {
  provide_evidence: "Submit evidence",
  send_message: "Message",
  make_offer: "Offer note",
  accept_claim: "Accept & refund note",
};

const STATUS_LABELS: Record<Decision["status"], string> = {
  pending_review: "Waiting for your review",
  approved: "Approved",
  rejected: "Rejected",
  submitted: "Sent to PayPal",
  failed: "Sending failed",
};

function LevelBadge({ name, level }: { name: string; level: Level }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEVEL_STYLES[level]}`}>
      {name}: {level}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h3 className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</h3>
      {children}
    </div>
  );
}

/** The agent's report: recommendation, risk, urgency, reasoning, other options, evidence and drafts. */
export function AssessmentReport({
  decision,
  urgency,
  currency,
  disputeStatus,
}: {
  decision: Decision | null;
  /** Worked out when the page loads, so it tracks the deadline instead of the report's age. */
  urgency: ReturnType<typeof computeUrgency>;
  currency: string | null;
  disputeStatus: string | null;
}) {
  if (!decision) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {disputeStatus === "WAITING_FOR_SELLER_RESPONSE"
          ? "Not assessed yet. The agent runs when the dispute arrives or changes; this usually takes under a minute."
          : "No assessment needed right now: PayPal isn't waiting on you."}
      </p>
    );
  }

  const a = decision.assessment;
  const rec = RECOMMENDATION[a.recommendation];
  const assessedAt = new Date(decision.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="text-sm">
      {!decision.current && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          The dispute has changed since this report. A new one will replace it shortly.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-3 py-1 text-base font-semibold ${rec.style}`}>
          {rec.label}
          {a.recommendation === "settle" && a.settle_amount !== null && ` for ${formatAmount(a.settle_amount, currency)}`}
        </span>
        <LevelBadge name="Risk" level={a.risk} />
        <LevelBadge name="Urgency" level={urgency.urgency} />
      </div>

      <p className="mt-4 leading-relaxed">{a.reasoning}</p>
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">
        <span className="font-medium">Risk:</span> {a.risk_reason}
      </p>
      <p className="mt-1 text-zinc-500 dark:text-zinc-400">
        <span className="font-medium">Urgency:</span> {urgency.reason}
      </p>

      {a.alternatives.length > 0 && (
        <Section title="Other options">
          <ul className="space-y-2">
            {a.alternatives.map((alt) => (
              <li key={alt.option}>
                <span className="font-medium">{RECOMMENDATION[alt.option]?.label ?? alt.option}:</span>{" "}
                <span className="text-zinc-600 dark:text-zinc-400">{alt.what_happens}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Evidence">
        <div className="grid gap-4 sm:grid-cols-2">
          <ul className="space-y-1.5">
            {a.key_evidence.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
          {a.missing_evidence.length > 0 && (
            <ul className="space-y-1.5">
              {a.missing_evidence.map((e, i) => (
                <li key={i} className="flex gap-2 text-zinc-600 dark:text-zinc-400">
                  <span className="text-amber-600 dark:text-amber-400">?</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title={a.drafts.length === 1 ? "Draft" : "Drafts"}>
        <div className="space-y-3">
          {a.drafts.map((d, i) => (
            <div key={i} className="rounded-md border border-zinc-200 dark:border-zinc-800">
              <p className="border-b border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                {DRAFT_LABELS[d.action] ?? d.action} → {d.recipient === "paypal" ? "PayPal" : "buyer"}
              </p>
              <p className="whitespace-pre-wrap px-3 py-2 leading-relaxed">{d.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-400">Nothing is sent until you approve.</p>
      </Section>

      <p className="mt-5 text-xs text-zinc-400">
        {STATUS_LABELS[decision.status] ?? decision.status} · assessed {assessedAt}
        {decision.model && ` · ${decision.model}`}
        {decision.promptVersion && ` · prompt ${decision.promptVersion}`}
      </p>
    </div>
  );
}
