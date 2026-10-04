// Run from the project root: npm run sync
import { syncDisputes } from "../src/lib/sync";

syncDisputes()
  .then((result) => console.log("[sync] done", result))
  .catch((err) => {
    console.error("[sync] failed", err);
    process.exit(1);
  });
