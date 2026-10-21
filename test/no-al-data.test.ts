import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const MARKERS = [
  "5627913",
  "07520416-3e66-4e90-8395-ba13ec2598d1",
  "075204163e664e908395ba13ec2598d1",
  "102bf244-9e83-809c-8fac-de07104c0fe0",
  "102bf2449e83809c8facde07104c0fe0",
  "3eebf244-9e83-8009-be9a-ffc30d0f09e9",
  "3eebf244-9e83-80b0-860e-f1c8ce7e6b23",
  "4486534842270",
  "1202368925633889",
  "clients/apartment-life",
  "hubspot-direct",
  "asana_",
];

const PROVENANCE = "Derived from pi-apartment-life 5b713d5 (history not carried over), tag harness-v5.";
const NAMES = ["pi-apartment-life", "harness-v5"];

const ABSENT = [
  "clients",
  "hubspot",
  "services",
  "src/connectors",
  "src/hubspot-direct",
  "src/hubspot-api-mcp",
  "src/runtime/planApproval.ts",
  "src/runtime/permissions.ts",
  "src/runtime/approvalSession.ts",
  "src/runtime/approvalState.ts",
  "src/runtime/pinGuard.ts",
  "src/runtime/localGuard.ts",
  "src/runtime/ledger.ts",
  "src/runtime/ledgerLock.ts",
  ".pi/extensions/require-harness.ts",
  "docs/tickets-issues-debugging",
];

test("tracked files do not carry Apartment Life identifiers", () => {
  const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const files = listed.split("\n").map((line) => line.trim()).filter((line) => line && line !== "test/no-al-data.test.ts");
  const hits: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const marker of MARKERS) {
      if (text.includes(marker)) hits.push(`${file}: ${marker}`);
    }
    for (const name of NAMES) {
      if (!text.includes(name)) continue;
      if (file === "README.md" && text.includes(PROVENANCE) && text.split("\n").every((line) => !line.includes(name) || line.includes(PROVENANCE))) {
        continue;
      }
      hits.push(`${file}: ${name}`);
    }
  }
  assert.deepEqual(hits, []);
  for (const path of ABSENT) assert.equal(existsSync(join(process.cwd(), path)), false, path);
});
