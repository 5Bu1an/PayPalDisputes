import { getDispute, listDisputeIds } from "@/lib/paypal";
import { assessDispute } from "@/lib/assess";
import { upsertDispute, type PayPalDispute } from "@/lib/disputes";

/**
 * Pulls every recent dispute from PayPal and upserts it, then runs the agent on any that need
 * a (new) report. Backstop for webhooks, which the sandbox in particular delivers late or not at all.
 * Assessing is cheap to repeat: disputes that haven't changed since their last report are skipped.
 */
export async function syncDisputes(days = 30, { assess = true } = {}) {
  const ids = await listDisputeIds(days);
  const failed: string[] = [];
  const assessed: string[] = [];

  for (const id of ids) {
    try {
      await upsertDispute(await getDispute<PayPalDispute>(id));
    } catch (err) {
      console.error(`[sync] failed to sync dispute ${id}`, err);
      failed.push(id);
      continue;
    }
    if (!assess) continue;
    try {
      const outcome = await assessDispute(id);
      if (outcome.status === "assessed") assessed.push(id);
    } catch (err) {
      // A failed assessment shouldn't fail the sync; the next sync retries it.
      console.error(`[sync] failed to assess dispute ${id}`, err);
    }
  }
  return { synced: ids.length - failed.length, failed, assessed };
}
