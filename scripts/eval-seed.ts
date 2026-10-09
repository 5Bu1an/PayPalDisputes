import { supabaseAdmin } from "@/lib/supabase";
import { CASES } from "../evals/cases";

// Copies the cases in evals/cases.ts into the eval_cases table (insert or update by id).
// Cases added directly in Supabase are left alone.
// Usage: npm run eval:seed

async function main() {
  const { error } = await supabaseAdmin()
    .from("eval_cases")
    .upsert(
      CASES.map((c) => ({
        id: c.id,
        title: c.title,
        input: c.input,
        expected_recommendation: c.expected.recommendation,
        acceptable_recommendations: c.expected.alsoAcceptable ?? [],
        expected_urgency: c.expected.urgency,
        expected_risk: c.expected.risk,
        rationale: c.rationale,
        updated_at: new Date().toISOString(),
      })),
    );
  if (error) {
    if (error.code === "PGRST205") {
      console.error("The eval_cases table doesn't exist yet. Run supabase/evals.sql in the Supabase SQL Editor first.");
      process.exit(1);
    }
    throw error;
  }
  console.log(`Seeded ${CASES.length} eval cases.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
