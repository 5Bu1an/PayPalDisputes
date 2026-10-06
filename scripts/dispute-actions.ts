// Tries PayPal's dispute response actions against one sandbox dispute.
// Run from the project root:
//   npm run dispute -- show     <dispute-id>                      (read-only: stage + allowed actions)
//   npm run dispute -- offer    <dispute-id> <amount> [note]      (partial refund offer)
//   npm run dispute -- evidence <dispute-id> <carrier> <tracking> [note]
//   npm run dispute -- message  <dispute-id> <text>
//   npm run dispute -- accept   <dispute-id> [note]               (refunds the buyer and closes the dispute)
import { getAccessToken, getDispute } from "../src/lib/paypal";

const API_BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";

if (!API_BASE.includes("sandbox")) {
  console.error("Refusing to run: PAYPAL_API_BASE is not the sandbox.");
  process.exit(1);
}

type Dispute = {
  dispute_id: string;
  reason: string;
  status: string;
  dispute_life_cycle_stage: string;
  dispute_amount: { currency_code: string; value: string };
  seller_response_due_date?: string;
  allowed_response_options?: unknown;
  links?: { rel: string; href: string; method: string }[];
};

async function post(path: string, body: BodyInit, contentType?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    body,
  });
  const text = await res.text();
  console.log(`${res.ok ? "OK" : "FAILED"} ${res.status} POST ${path}`);
  if (text) console.log(text);
  if (!res.ok) process.exit(1);
}

const json = (data: unknown) => [JSON.stringify(data), "application/json"] as const;

/** provide-evidence and send-message only accept multipart/form-data, with the JSON in an "input" part. */
function multipart(input: unknown) {
  const form = new FormData();
  form.append("input", new Blob([JSON.stringify(input)], { type: "application/json" }));
  return form; // fetch sets the multipart boundary header itself
}

async function show(id: string) {
  const d = await getDispute<Dispute>(id);
  console.log({
    id: d.dispute_id,
    reason: d.reason,
    status: d.status,
    stage: d.dispute_life_cycle_stage,
    amount: `${d.dispute_amount.value} ${d.dispute_amount.currency_code}`,
    due: d.seller_response_due_date,
  });
  // PayPal only includes a link for each action the dispute currently allows.
  console.log("Allowed actions:", (d.links ?? []).filter((l) => l.method === "POST").map((l) => l.rel));
  if (d.allowed_response_options) console.log("Response options:", JSON.stringify(d.allowed_response_options, null, 2));
}

async function main() {
  const [action, id, ...rest] = process.argv.slice(2);
  if (!action || !id) {
    console.error("Usage: npm run dispute -- <show|offer|evidence|message|accept> <dispute-id> ...");
    process.exit(1);
  }
  const path = `/v1/customer/disputes/${encodeURIComponent(id)}`;
  const currency = action === "show" ? "" : (await getDispute<Dispute>(id)).dispute_amount.currency_code;

  switch (action) {
    case "show":
      return show(id);

    case "offer": {
      const [amount, note = "We'd like to offer a partial refund to resolve this."] = rest;
      if (!amount) throw new Error("offer needs an amount, e.g. 5.00");
      return post(
        `${path}/make-offer`,
        ...json({ note, offer_type: "REFUND", offer_amount: { currency_code: currency, value: amount } }),
      );
    }

    case "evidence": {
      const [carrier, tracking, note = "The item was shipped; tracking attached."] = rest;
      if (!carrier || !tracking) throw new Error("evidence needs a carrier and tracking number, e.g. UPS 1Z999");
      return post(
        `${path}/provide-evidence`,
        multipart({
          evidences: [
            {
              evidence_type: "PROOF_OF_FULFILLMENT",
              evidence_info: { tracking_info: [{ carrier_name: carrier, tracking_number: tracking }] },
              notes: note,
            },
          ],
        }),
      );
    }

    case "message": {
      const text = rest.join(" ");
      if (!text) throw new Error("message needs text");
      return post(`${path}/send-message`, multipart({ message: text }));
    }

    case "accept": {
      const [note = "Accepting the claim and refunding the buyer."] = rest;
      return post(`${path}/accept-claim`, ...json({ note, accept_claim_type: "REFUND" }));
    }

    default:
      throw new Error(`Unknown action "${action}"`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
