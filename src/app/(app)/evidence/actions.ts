"use server";

import { refresh } from "next/cache";
import { assessDispute } from "@/lib/assess";
import { writeEvidence } from "@/lib/evidence";
import type { EvidenceField } from "@/lib/evidence-shared";

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Saves one edited cell from the Evidence grid. */
export async function saveEvidence(disputeId: string, field: EvidenceField, value: unknown): Promise<SaveResult> {
  try {
    return await writeEvidence(disputeId, { [field]: value });
  } catch (err) {
    console.error("[evidence] save failed", err);
    return { ok: false, error: "Couldn't save. Try again." };
  }
}

/** Saves the matched rows of a CSV import, one dispute at a time. */
export async function importEvidence(
  rows: { disputeId: string; values: Partial<Record<EvidenceField, unknown>> }[],
): Promise<{ saved: number; failed: { disputeId: string; error: string }[] }> {
  const failed: { disputeId: string; error: string }[] = [];
  let saved = 0;
  for (const r of rows.slice(0, 500)) {
    try {
      const res = await writeEvidence(r.disputeId, r.values);
      if (res.ok) saved++;
      else failed.push({ disputeId: r.disputeId, error: res.error });
    } catch {
      failed.push({ disputeId: r.disputeId, error: "Couldn't save." });
    }
  }
  if (saved) refresh();
  return { saved, failed };
}

/** Runs the agent again on one dispute so it sees the new evidence. */
export async function reassess(disputeId: string): Promise<{ ok: true; recommendation: string } | { ok: false; error: string }> {
  try {
    const outcome = await assessDispute(disputeId, { force: true });
    refresh();
    return outcome.status === "assessed"
      ? { ok: true, recommendation: outcome.recommendation }
      : { ok: false, error: outcome.reason };
  } catch (err) {
    console.error("[evidence] reassess failed", err);
    return { ok: false, error: "The agent couldn't finish. Try again in a minute." };
  }
}
