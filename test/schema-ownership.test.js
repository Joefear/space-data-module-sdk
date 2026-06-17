import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("PLG binding generation uses SDS-owned schema rather than an SDK-local schema copy", () => {
  const generator = readRepoFile("scripts/generate-plg-bindings.mjs");
  const localPlgSchemaPath = path.join(
    repoRoot,
    "schemas",
    "spacedatastandards",
    "PLG.fbs",
  );

  assert.equal(
    fs.existsSync(localPlgSchemaPath),
    false,
    "SDK must not own a shadow PLG.fbs schema; canonical PLG lives in SDS",
  );
  assert.doesNotMatch(generator, /schemas[\\/]+spacedatastandards[\\/]+PLG\.fbs/);
  assert.match(generator, /spacedatastandards\.org/);
  assert.match(generator, /SPACE_DATA_STANDARDS_ROOT/);
  assert.match(generator, /"schema"[\s\S]*"PLG"[\s\S]*"main\.fbs"/);
});
