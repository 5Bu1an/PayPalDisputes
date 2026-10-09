import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kaleshi | Disputes, decided.",
  description:
    "Kaleshi reads every PayPal dispute, decides whether to fight, refund or settle, and drafts the reply.",
};

const CTA_HREF = "/";

const FEATURES = [
  {
    icon: "◎",
    title: "Catch every dispute",
    body: "PayPal webhooks land in Kaleshi the moment a buyer files. No inbox digging, no surprise holds.",
  },
  {
    icon: "◆",
    title: "AI decides the move",
    body: "Fight, refund or settle, with a confidence score and the reasoning a seller can actually read.",
  },
  {
    icon: "◷",
    title: "Never miss a deadline",
    body: "Responses are drafted with the evidence PayPal asks for, days before the seller-response window closes.",
  },
];

type Decision = "Fight" | "Refund" | "Settle" | "Won" | "Lost";

const DECISION_STYLES: Record<Decision, string> = {
  Fight: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  Refund: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  Settle: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  Won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Lost: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const ROWS: { id: string; buyer: string; initials: string; reason: string; amount: string; due: string; decision: Decision; confidence: number }[] = [
  { id: "PP-R-DUI-10190261", buyer: "John Doe", initials: "JD", reason: "Item not received", amount: "$49.99", due: "6 days", decision: "Fight", confidence: 87 },
  { id: "PP-R-KQX-10190318", buyer: "Maya Patel", initials: "MP", reason: "Not as described", amount: "$129.00", due: "4 days", decision: "Settle", confidence: 72 },
  { id: "PP-R-LTB-10190402", buyer: "Chris Nolan", initials: "CN", reason: "Unauthorized", amount: "$18.50", due: "9 days", decision: "Refund", confidence: 91 },
  { id: "PP-R-ZMA-10189977", buyer: "Aisha Khan", initials: "AK", reason: "Item not received", amount: "$240.00", due: "—", decision: "Won", confidence: 94 },
  { id: "PP-R-HWE-10189803", buyer: "Lucas Pereira", initials: "LP", reason: "Duplicate charge", amount: "$62.40", due: "2 days", decision: "Refund", confidence: 96 },
  { id: "PP-R-QSN-10189655", buyer: "Elise Jefferson", initials: "EJ", reason: "Not as described", amount: "$315.00", due: "—", decision: "Lost", confidence: 58 },
  { id: "PP-R-PRV-10189511", buyer: "Yuki Tanaka", initials: "YT", reason: "Item not received", amount: "$89.99", due: "7 days", decision: "Fight", confidence: 81 },
];

const TIMELINE = [
  { title: "Dispute opened by buyer", detail: "Item not received · $49.99", time: "6 hours ago" },
  { title: "Kaleshi decided: Fight (87%)", detail: "Tracking shows delivery 3 days before the claim.", time: "6 hours ago" },
  { title: "Response drafted", detail: "Proof of fulfillment attached: carrier tracking + delivery scan.", time: "5 hours ago" },
  { title: "Awaiting your approval", detail: "Submit before Oct 15 to stay inside the seller window.", time: "now" },
];

const STEPS = [
  { n: "01", title: "Connect PayPal", body: "One sign-in. Kaleshi subscribes to your dispute webhooks and backfills the last 30 days." },
  { n: "02", title: "Kaleshi reviews", body: "Every dispute gets a decision, a confidence score and a drafted response within minutes." },
  { n: "03", title: "You approve", body: "Skim the reasoning, tweak the draft if you want, and settle the dispute in one click." },
];

function Pill({ decision }: { decision: Decision }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ${DECISION_STYLES[decision]}`}>
      {decision}
    </span>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <span className="grid size-6 place-items-center rounded-md bg-zinc-900 text-[13px] text-white dark:bg-white dark:text-zinc-900">
        K
      </span>
      Kaleshi
    </span>
  );
}

function PrimaryButton({ children = "Settle Disputes" }: { children?: React.ReactNode }) {
  return (
    <Link
      href={CTA_HREF}
      className="inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg bg-zinc-900 px-3 text-sm sm:px-4 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {children}
    </Link>
  );
}

/** Static mock of the product, BlindPay-style: the screenshot sells the idea better than copy. */
function ProductPreview() {
  const active = ROWS[0];
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)] dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-800">
        <span className="size-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <span className="size-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <span className="size-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <span className="ml-3">app.kaleshi.com/disputes</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] xl:grid-cols-[170px_1fr_300px]">
        <aside className="hidden flex-col gap-1 border-r border-zinc-200 p-3 text-xs text-zinc-500 xl:flex dark:border-zinc-800">
          <div className="mb-3 px-2"><Logo /></div>
          {["Disputes", "Decisions", "Responses", "Evidence", "Sellers", "Settings"].map((item, i) => (
            <span
              key={item}
              className={`rounded-md px-2 py-1.5 ${i === 0 ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100" : ""}`}
            >
              {item}
            </span>
          ))}
        </aside>

        <div className="min-w-0 overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">Disputes</span>
            <span className="rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] text-white dark:bg-white dark:text-zinc-900">3 need approval</span>
          </div>
          <table className="w-full min-w-[560px] whitespace-nowrap text-left text-xs">
            <thead className="text-zinc-400">
              <tr className="border-y border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-2 font-normal">Buyer</th>
                <th className="px-4 py-2 font-normal">Reason</th>
                <th className="px-4 py-2 text-right font-normal">Amount</th>
                <th className="px-4 py-2 font-normal">Due</th>
                <th className="px-4 py-2 font-normal">Kaleshi</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-zinc-100 last:border-0 dark:border-zinc-900 ${row === active ? "bg-zinc-50 dark:bg-zinc-900/60" : ""}`}
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-full bg-zinc-100 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {row.initials}
                      </span>
                      {row.buyer}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500">{row.reason}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.amount}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{row.due}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <Pill decision={row.decision} />
                      <span className="text-zinc-400">{row.confidence}%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-200 p-4 text-xs lg:border-t-0 lg:border-l dark:border-zinc-800">
          <p className="text-zinc-400">{active.id}</p>
          <p className="mt-1 text-sm font-medium">Dispute details</p>
          <dl className="mt-3 grid grid-cols-2 gap-y-2">
            {[
              ["Buyer", active.buyer],
              ["Amount", active.amount],
              ["Reason", active.reason],
              ["Protection", "Eligible"],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-zinc-400">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <Pill decision="Fight" />
              <span className="text-zinc-400">87% confident</span>
            </div>
            <p className="mt-2 leading-relaxed text-zinc-600 dark:text-zinc-400">
              Carrier tracking confirms delivery before the claim was filed, and the order qualifies for seller protection.
            </p>
          </div>

          <p className="mt-4 font-medium">Timeline</p>
          <ol className="mt-2 space-y-3">
            {TIMELINE.map((step, i) => (
              <li key={step.title} className="flex gap-2.5">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${
                    i === TIMELINE.length - 1 ? "bg-amber-500" : "bg-zinc-900 dark:bg-zinc-100"
                  }`}
                />
                <div>
                  <p>{step.title}</p>
                  <p className="text-zinc-400">{step.detail}</p>
                  <p className="text-zinc-400">{step.time}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col bg-white font-mono text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="border-b border-zinc-200 bg-zinc-50 py-2 text-center text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Now in beta for PayPal sellers ·{" "}
        <Link href={CTA_HREF} className="font-medium text-zinc-900 dark:text-zinc-100">
          Try it →
        </Link>
      </div>

      <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="hidden gap-8 text-sm text-zinc-600 md:flex dark:text-zinc-400">
            <a href="#product" className="hover:text-zinc-900 dark:hover:text-zinc-100">Product</a>
            <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-zinc-100">How it works</a>
            <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-zinc-100">Pricing</a>
          </div>
          <PrimaryButton />
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* Faint grid, fading out toward the edges. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(0_0_0/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(0_0_0/0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] dark:bg-[linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)]"
          />
          <div className="relative mx-auto max-w-4xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
            <h1 className="text-5xl font-medium tracking-tighter sm:text-7xl">Disputes, decided.</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
              Kaleshi reads every PayPal dispute, decides whether to fight, refund or settle, and drafts the reply
              before the deadline does.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <PrimaryButton />
              <a
                href="#how-it-works"
                className="inline-flex h-10 items-center rounded-lg border border-zinc-200 px-4 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                See how it works
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl border-y border-zinc-200 sm:grid-cols-3 dark:border-zinc-800">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`px-6 py-10 text-center ${i > 0 ? "border-t border-zinc-200 sm:border-t-0 sm:border-l dark:border-zinc-800" : ""}`}
            >
              <span className="mx-auto grid size-9 place-items-center rounded-lg border border-zinc-200 text-zinc-500 dark:border-zinc-800">
                {f.icon}
              </span>
              <h2 className="mt-4 text-sm font-medium">{f.title}</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500">{f.body}</p>
            </div>
          ))}
        </section>

        <section id="product" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <ProductPreview />
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="max-w-xl text-3xl font-medium tracking-tight sm:text-4xl">
              From &ldquo;dispute opened&rdquo; to settled, without the busywork.
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                  <span className="text-xs text-zinc-400">{s.n}</span>
                  <h3 className="mt-3 font-medium">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-20 mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
          <h2 className="text-4xl font-medium tracking-tighter sm:text-5xl">
            Stop losing disputes
            <br />
            you could have won.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-zinc-500">Free while in beta. Connect PayPal and see Kaleshi&apos;s first decision in minutes.</p>
          <div className="mt-8 flex justify-center">
            <PrimaryButton />
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p>Kaleshi is not affiliated with PayPal. © {new Date().getFullYear()} Kaleshi.</p>
        </div>
      </footer>
    </div>
  );
}
