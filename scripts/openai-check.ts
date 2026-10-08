import { MODELS, openai } from "@/lib/openai";

// Verifies OPENAI_API_KEY works and that each configured model tier is usable.
// Usage: npm run openai:check
async function main() {
  const available = new Set<string>();
  for await (const m of openai().models.list()) available.add(m.id);
  console.log(`Auth OK: key can see ${available.size} models`);

  let failed = false;
  for (const [tier, model] of Object.entries(MODELS)) {
    if (!available.has(model)) {
      console.error(`[${tier}] ${model}: not available to this key/project`);
      failed = true;
      continue;
    }
    const res = await openai().responses.create({ model, input: "Reply with the single word: ok" });
    console.log(`[${tier}] ${model}: "${res.output_text.trim()}" (${res.usage?.total_tokens} tokens)`);
  }

  if (failed) {
    const gpt = [...available].filter((id) => id.startsWith("gpt-")).sort();
    console.log(`\nAvailable gpt-* models:\n  ${gpt.join("\n  ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
