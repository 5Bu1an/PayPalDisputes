import type { Assessment } from "@/lib/agent";
import { supabaseAdmin } from "@/lib/supabase";

export type DisputeRow = {
  id: string;
  sellerName: string | null;
  merchantId: string | null;
  reason: string | null;
  status: string | null;
  stage: string | null;
  amount: number | null;
  currency: string | null;
  dueAt: string | null;
  /** Whole days until the seller's deadline (negative once overdue); null when there's none. */
  daysLeft: number | null;
  updatedAt: string | null;
};

/** Every dispute with its seller's name, soonest seller deadline first. */
export async function listDisputes(): Promise<DisputeRow[]> {
  const db = supabaseAdmin();

  const [disputes, sellers] = await Promise.all([
    db
      .from("disputes")
      .select("id, seller_id, merchant_id, reason, status, lifecycle_stage, amount, currency, seller_response_due_at, paypal_updated_at")
      .order("seller_response_due_at", { ascending: true, nullsFirst: false }),
    db.from("sellers").select("id, name"),
  ]);
  if (disputes.error) throw disputes.error;
  if (sellers.error) throw sellers.error;

  const now = Date.now();
  const sellerNames = new Map(sellers.data.map((s) => [s.id, s.name as string]));

  return disputes.data.map((d) => ({
    id: d.id,
    sellerName: d.seller_id ? (sellerNames.get(d.seller_id) ?? null) : null,
    merchantId: d.merchant_id,
    reason: d.reason,
    status: d.status,
    stage: d.lifecycle_stage,
    amount: d.amount,
    currency: d.currency,
    dueAt: d.seller_response_due_at,
    daysLeft: d.seller_response_due_at
      ? Math.ceil((new Date(d.seller_response_due_at).getTime() - now) / 86_400_000)
      : null,
    updatedAt: d.paypal_updated_at,
  }));
}

type Money = { value: string; currency_code: string };

/** The parts of PayPal's full dispute object (stored in `disputes.raw`) the detail page reads. */
export type PayPalDisputeDetail = {
  create_time?: string;
  messages?: { posted_by: "BUYER" | "SELLER" | string; time_posted: string; content: string }[];
  evidences?: {
    evidence_type: string;
    source: string;
    date?: string;
    notes?: string;
    evidence_info?: { tracking_info?: { carrier_name: string; tracking_number: string }[] };
  }[];
  offer?: {
    buyer_requested_amount?: Money;
    seller_offered_amount?: Money;
    history?: { offer_time: string; actor: string; event_type: string; offer_amount?: Money }[];
  };
  fund_movements?: { type: string; reason: string; amount: Money }[];
  disputed_transactions?: {
    buyer?: { name?: string };
    items?: { item_name?: string; item_description?: string; item_quantity?: string }[];
    create_time?: string;
    gross_amount?: Money;
    transaction_status?: string;
    seller_transaction_id?: string;
    seller_protection_eligible?: boolean;
    seller_protection_type?: string;
  }[];
  links?: { rel: string; method: string }[];
  buyer_response_due_date?: string;
};

export type ShippingStatus = "NOT_SHIPPED" | "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED_TO_SENDER";

/** The seller's own record of the order behind a dispute (`orders` table). */
export type OrderEvidence = {
  orderNumber: string | null;
  itemDescription: string | null;
  shipToName: string | null;
  shipToAddress: string | null;
  shipToMatchesPayPal: boolean | null;
  carrier: string | null;
  trackingNumber: string | null;
  shippingStatus: ShippingStatus | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  signatureConfirmed: boolean | null;
  trackingEvents: { at: string; location?: string; description: string }[];
  notes: string | null;
  simulated: boolean;
};

/** The agent's latest report on a dispute (`decisions` table). */
export type Decision = {
  id: string;
  status: "pending_review" | "approved" | "rejected" | "submitted" | "failed";
  model: string | null;
  promptVersion: string | null;
  createdAt: string;
  /** False when PayPal has updated the dispute since this report was written. */
  current: boolean;
  assessment: Assessment;
};

export type DisputeDetail = DisputeRow & {
  raw: PayPalDisputeDetail;
  order: OrderEvidence | null;
  decision: Decision | null;
};

/** The newest decision for a dispute, or null if the agent hasn't assessed it. */
async function getLatestDecision(disputeId: string, paypalUpdatedAt: string | null): Promise<Decision | null> {
  const { data: d, error } = await supabaseAdmin()
    .from("decisions")
    .select("id, status, model, prompt_version, created_at, dispute_updated_at, assessment")
    .eq("dispute_id", disputeId)
    .not("assessment", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!d) return null;

  return {
    id: d.id,
    status: d.status,
    model: d.model,
    promptVersion: d.prompt_version,
    createdAt: d.created_at,
    current:
      !paypalUpdatedAt ||
      !d.dispute_updated_at ||
      new Date(d.dispute_updated_at).getTime() >= new Date(paypalUpdatedAt).getTime(),
    assessment: d.assessment as Assessment,
  };
}

/** The order matching a seller-side PayPal transaction id, or null if there's no record. */
export async function getOrder(paypalTransactionId: string | undefined): Promise<OrderEvidence | null> {
  if (!paypalTransactionId) return null;
  const { data: o, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("paypal_transaction_id", paypalTransactionId)
    .maybeSingle();
  if (error) {
    // PGRST205: table doesn't exist yet (supabase/orders.sql not run). Show no evidence rather than crash.
    if (error.code === "PGRST205") return null;
    throw error;
  }
  if (!o) return null;

  return {
    orderNumber: o.order_number,
    itemDescription: o.item_description,
    shipToName: o.ship_to_name,
    shipToAddress: o.ship_to_address,
    shipToMatchesPayPal: o.ship_to_matches_paypal,
    carrier: o.carrier,
    trackingNumber: o.tracking_number,
    shippingStatus: o.shipping_status,
    shippedAt: o.shipped_at,
    deliveredAt: o.delivered_at,
    signatureConfirmed: o.signature_confirmed,
    trackingEvents: o.tracking_events ?? [],
    notes: o.notes,
    simulated: o.simulated,
  };
}

/** One dispute with PayPal's full object, or null if it isn't in the database. */
export async function getDisputeDetail(id: string): Promise<DisputeDetail | null> {
  const db = supabaseAdmin();
  const { data: d, error } = await db
    .from("disputes")
    .select("id, seller_id, merchant_id, reason, status, lifecycle_stage, amount, currency, seller_response_due_at, paypal_updated_at, raw, sellers(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!d) return null;

  const seller = d.sellers as { name: string } | { name: string }[] | null;
  const raw = d.raw as PayPalDisputeDetail;
  const [order, decision] = await Promise.all([
    getOrder(raw.disputed_transactions?.[0]?.seller_transaction_id),
    getLatestDecision(d.id, d.paypal_updated_at),
  ]);
  return {
    id: d.id,
    sellerName: (Array.isArray(seller) ? seller[0]?.name : seller?.name) ?? null,
    merchantId: d.merchant_id,
    reason: d.reason,
    status: d.status,
    stage: d.lifecycle_stage,
    amount: d.amount,
    currency: d.currency,
    dueAt: d.seller_response_due_at,
    daysLeft: d.seller_response_due_at
      ? Math.ceil((new Date(d.seller_response_due_at).getTime() - Date.now()) / 86_400_000)
      : null,
    updatedAt: d.paypal_updated_at,
    raw,
    order,
    decision,
  };
}
