import { supabaseAdmin } from "@/lib/supabase";
import type { PayPalDisputeDetail, ShippingStatus } from "@/lib/dashboard";

// Fills the `orders` table with made-up shipping evidence for every dispute in the database,
// so the dashboard and the agent have something to judge "item not received" claims against.
// Safe to re-run: it only ever overwrites rows it created (simulated = true).
// Usage: npm run seed:orders

const DAY = 86_400_000;
const at = (start: number, days: number, hour = 14) => {
  const d = new Date(start + days * DAY);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

type Scenario = {
  name: string;
  build: (ctx: { paidAt: number; usd: boolean; buyerName: string }) => {
    carrier: string;
    tracking_number: string;
    shipping_status: ShippingStatus;
    shipped_at: string | null;
    delivered_at: string | null;
    signature_confirmed: boolean;
    ship_to_matches_paypal: boolean;
    ship_to_address: string;
    tracking_events: { at: string; location: string; description: string }[];
    notes: string;
  };
};

const ADDRESS = { usd: "742 Evergreen Terrace, Springfield, IL 62704, US", cad: "88 Queen St W, Toronto, ON M5H 2N2, CA" };

/** Strong, medium and weak evidence, so the agent has clear fight / judgement-call / refund cases. */
const SCENARIOS: Scenario[] = [
  {
    name: "delivered with signature",
    build: ({ paidAt, usd }) => ({
      // USD matches the UPS tracking already submitted to PayPal for PP-R-DUI-10190261.
      carrier: usd ? "UPS" : "Canada Post",
      tracking_number: usd ? "1Z999AA10123456784" : "7023210039414604",
      shipping_status: "DELIVERED",
      shipped_at: at(paidAt, 1, 16),
      delivered_at: at(paidAt, 4, 13),
      signature_confirmed: true,
      ship_to_matches_paypal: true,
      ship_to_address: usd ? ADDRESS.usd : ADDRESS.cad,
      tracking_events: [
        { at: at(paidAt, 1, 16), location: usd ? "Louisville, KY" : "Mississauga, ON", description: "Accepted at origin facility" },
        { at: at(paidAt, 2, 22), location: usd ? "Chicago, IL" : "Toronto, ON", description: "In transit to next facility" },
        { at: at(paidAt, 4, 8), location: usd ? "Springfield, IL" : "Toronto, ON", description: "Out for delivery" },
        { at: at(paidAt, 4, 13), location: usd ? "Springfield, IL" : "Toronto, ON", description: "Delivered, signed for by recipient" },
      ],
      notes: "Signature on file from the carrier. Shipped to the address on the PayPal transaction.",
    }),
  },
  {
    name: "delivered, no signature",
    build: ({ paidAt, usd }) => ({
      carrier: usd ? "USPS" : "Canada Post",
      tracking_number: usd ? "9400111899223197428490" : "7023210039414611",
      shipping_status: "DELIVERED",
      shipped_at: at(paidAt, 2, 15),
      delivered_at: at(paidAt, 6, 11),
      signature_confirmed: false,
      ship_to_matches_paypal: true,
      ship_to_address: usd ? ADDRESS.usd : ADDRESS.cad,
      tracking_events: [
        { at: at(paidAt, 2, 15), location: usd ? "Columbus, OH" : "Mississauga, ON", description: "Accepted at origin facility" },
        { at: at(paidAt, 4, 3), location: usd ? "Indianapolis, IN" : "Toronto, ON", description: "In transit to next facility" },
        { at: at(paidAt, 6, 11), location: usd ? "Springfield, IL" : "Toronto, ON", description: "Delivered, left at front door" },
      ],
      notes: "Carrier shows delivered to the PayPal address, but no signature was required.",
    }),
  },
  {
    name: "label created, never scanned",
    build: ({ paidAt, usd }) => ({
      carrier: usd ? "USPS" : "Canada Post",
      tracking_number: usd ? "9400111899223197428506" : "7023210039414628",
      shipping_status: "LABEL_CREATED",
      shipped_at: null,
      delivered_at: null,
      signature_confirmed: false,
      ship_to_matches_paypal: true,
      ship_to_address: usd ? ADDRESS.usd : ADDRESS.cad,
      tracking_events: [
        { at: at(paidAt, 3, 10), location: usd ? "Columbus, OH" : "Mississauga, ON", description: "Shipping label created, awaiting item" },
      ],
      notes: "Label was printed but the carrier never received the parcel.",
    }),
  },
];

/** Fixed scenario for each known sandbox dispute; any other dispute gets one in rotation. */
const ASSIGNED: Record<string, number> = {
  "PP-R-DUI-10190261": 0, // $49.99 USD (Sandbox Seller 2)
  "PP-R-XOR-10190262": 1, // $25 CAD (Sandbox Test Seller)
  "PP-R-NBP-10190260": 2, // $10 CAD (Sandbox Test Seller)
};

async function main() {
  const db = supabaseAdmin();
  const { data: disputes, error } = await db.from("disputes").select("id, seller_id, currency, raw").order("id");
  if (error) throw error;

  const { data: existing, error: existingError } = await db.from("orders").select("paypal_transaction_id, simulated");
  if (existingError) {
    if (existingError.code === "PGRST205") {
      console.error("The orders table doesn't exist yet. Run supabase/orders.sql in the Supabase SQL Editor first.");
      process.exit(1);
    }
    throw existingError;
  }
  const real = new Set(existing.filter((o) => !o.simulated).map((o) => o.paypal_transaction_id));

  let i = 0;
  for (const d of disputes) {
    const tx = (d.raw as PayPalDisputeDetail).disputed_transactions?.[0];
    const txId = tx?.seller_transaction_id;
    if (!txId) {
      console.log(`- ${d.id}: no seller transaction id, skipped`);
      continue;
    }
    if (real.has(txId)) {
      console.log(`- ${d.id}: has a real (non-simulated) order, left alone`);
      continue;
    }

    const scenario = SCENARIOS[ASSIGNED[d.id] ?? i++ % SCENARIOS.length];
    const item = tx.items?.[0];
    const buyerName = tx.buyer?.name ?? "Sandbox Buyer";
    const fields = scenario.build({
      paidAt: tx.create_time ? new Date(tx.create_time).getTime() : Date.now(),
      usd: d.currency !== "CAD",
      buyerName,
    });

    const { error: upsertError } = await db.from("orders").upsert(
      {
        seller_id: d.seller_id,
        paypal_transaction_id: txId,
        order_number: `ORD-${txId.slice(-6)}`,
        item_description: item?.item_description ?? item?.item_name ?? null,
        ship_to_name: buyerName,
        ...fields,
        simulated: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paypal_transaction_id" },
    );
    if (upsertError) throw upsertError;
    console.log(`✓ ${d.id}: ${scenario.name}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
