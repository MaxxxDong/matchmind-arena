import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolvePublicResults } from "../src/resolver.mjs";

const OUT_PATH = process.env.RESULT_SNAPSHOT_PATH ||
  path.resolve("snapshots", "resolutions.mantle-sepolia.json");

async function main() {
  const snapshot = await resolvePublicResults();
  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  const resolvedCount = Object.keys(snapshot.resolutions).length;
  const failedCount = snapshot.sourceChecks.filter((check) => !check.ok).length;
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Resolved ${resolvedCount} match(es); ${failedCount} source check(s) failed.`);
  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
