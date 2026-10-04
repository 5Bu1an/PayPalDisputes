import { getDispute, listDisputeIds } from "@/lib/paypal";
import { upsertDispute, type PayPalDispute } from "@/lib/disputes";

/**
 * Pulls every recent dispute from PayPal and upserts it. Backstop for webhooks,
 * which the sandbox in particular delivers late or not at all.
 */
export async function syncDisputes(days = 30) {
  const ids = await listDisputeIds(days);
  const failed: string[] = [];

  for (const id of ids) {
    try {
      await upsertDispute(await getDispute<PayPalDispute>(id));
    } catch (err) {
      console.error(`[sync] failed to sync dispute ${id}`, err);
      failed.push(id);
    }
  }
  return { synced: ids.length - failed.length, failed };
}
