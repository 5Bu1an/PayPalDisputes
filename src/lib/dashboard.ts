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
