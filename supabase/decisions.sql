-- Extends the existing `decisions` table so it can hold the agent's full report.
-- Existing columns keep their meaning:
--   action          fight | accept (= refund) | offer_refund (= settle) | message_buyer | needs_human
--   confidence      0-1 (unreliable on its own, see eval results)
--   reasoning       2-4 sentence explanation for the seller
--   draft_response  the main draft (all drafts are in `assessment`)
--   evidence        { key: [...], missing: [...] }
--   status          pending_review (default) | approved | rejected | submitted | failed
-- The newest row for a dispute is its current report; older rows are history.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

alter table decisions
  add column if not exists risk text,
  add column if not exists urgency text,
  add column if not exists settle_amount numeric,
  add column if not exists assessment jsonb,            -- the agent's full output (alternatives, drafts, reasons)
  add column if not exists prompt_version text,
  add column if not exists dispute_updated_at timestamptz, -- disputes.paypal_updated_at that was assessed
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer;

-- Fast "latest decision for this dispute" lookups.
create index if not exists decisions_dispute_id_created_at_idx on decisions (dispute_id, created_at desc);
