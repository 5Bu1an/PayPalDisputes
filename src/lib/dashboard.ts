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

export type DisputeDetail = DisputeRow & { raw: PayPalDisputeDetail };

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
    raw: d.raw as PayPalDisputeDetail,
  };
}
