import { HARNESS_TAG, verifyHarnessPin, type HarnessPinInput } from "../src/runtime/harnessPin.ts";

export interface PreflightReport {
  ok: boolean;
  lines: string[];
}

/** Report the pin. Warnings do not block tools. Do not print env values. */
export function reportHarnessPreflight(input: HarnessPinInput = {}): PreflightReport {
  const pin = verifyHarnessPin(input);
  const lines = [`Harness preflight: tag ${HARNESS_TAG}`];
  if (pin.ok) lines.push("Harness preflight: tag and SHA match.");
  else for (const warning of pin.warnings) lines.push(`Harness preflight: warning. ${warning}`);
  return { ok: pin.ok, lines };
}

function isDirectRun(): boolean {
  const entry = process.argv[1] ?? "";
  return entry.endsWith("harness-preflight.ts") || entry.endsWith("harness-preflight.js");
}

if (isDirectRun()) {
  const report = reportHarnessPreflight();
  process.stdout.write(`${report.lines.join("\n")}\n`);
}
