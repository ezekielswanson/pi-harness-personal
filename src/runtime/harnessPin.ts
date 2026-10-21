import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HARNESS_VERSION = "1.0.0";

function readHarnessTag(): string {
  const file = join(dirname(fileURLToPath(import.meta.url)), "harness-tag");
  const text = readFileSync(file, "utf8").trim();
  if (!/^personal-v[0-9]+$/.test(text)) throw new Error(`Pin tag file ${file} must contain personal-vN.`);
  return text;
}

/** Annotated git tag this checkout should carry. A mismatch is a warning. */
export const HARNESS_TAG = readHarnessTag();
export const HARNESS_INSTALL_REL = "git/github.com/ezekielswanson/pi-harness-personal";
export const EXPECTED_PROJECT_PACKAGES = [
  "npm:pi-mcp-adapter@5.3.2",
  "npm:pi-smart-web-search@0.4.0",
  "npm:pi-web-access@0.42.0",
  "npm:pi-subagents@0.79.1",
] as const;

export interface HarnessPinReport {
  ok: boolean;
  warnings: string[];
}

export interface HarnessPinInput {
  agentDir?: string;
  /** Tests point at a temp copy. Production uses ${PI_PERSONAL_HOME:-~/.config/pi-harness-personal}/harness.sha. */
  approvedShaFile?: string;
}

export function defaultAgentDir(): string {
  const configured = process.env.PI_CODING_AGENT_DIR?.trim();
  if (configured) return configured;
  return join(homedir(), ".pi/agent-personal"); // default-fallback
}

export function personalHomeDir(): string {
  const configured = process.env.PI_PERSONAL_HOME?.trim();
  if (configured) return configured;
  return join(homedir(), ".config/pi-harness-personal"); // default-fallback
}

export function alAgentDir(): string {
  return join(homedir(), ".pi/agent"); // al-dir-check
}

export function defaultApprovedShaFile(): string {
  return join(personalHomeDir(), "harness.sha");
}

function gitText(installDir: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      cwd: installDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function readApprovedSha(file: string): string | null {
  try {
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) return null;
    const text = readFileSync(file, "utf8").trim();
    return /^[0-9a-f]{40}$/.test(text) ? text : null;
  } catch {
    return null;
  }
}

/**
 * Report pin drift. Callers only notify warnings. Tools stay registered.
 * Warns when the resolved agent dir is the other harness dir (~/.pi/agent): start with pi-personal. al-dir-check
 */
export function verifyHarnessPin(input: HarnessPinInput = {}): HarnessPinReport {
  const warnings: string[] = [];
  const agentDir = resolve(input.agentDir?.trim() || defaultAgentDir());
  if (agentDir === resolve(alAgentDir())) {
    warnings.push("This session is using ~/.pi/agent. Start with pi-personal."); // al-dir-check
  }

  const installDir = join(agentDir, HARNESS_INSTALL_REL);
  if (!existsSync(installDir)) {
    warnings.push(`Pinned checkout is not installed at ${installDir}.`);
    return { ok: false, warnings };
  }

  const shaFile = input.approvedShaFile?.trim() || defaultApprovedShaFile();
  const approved = readApprovedSha(shaFile);
  const head = gitText(installDir, ["rev-parse", "HEAD"]);
  if (!approved) warnings.push(`Approved SHA file ${shaFile} is missing or is not a commit SHA.`);
  else if (head !== approved) warnings.push(`Pinned checkout HEAD ${head ?? "(unknown)"} is not the approved SHA.`);

  const tags = gitText(installDir, ["tag", "--points-at", "HEAD"]);
  const pointed = tags?.split("\n").includes(HARNESS_TAG) ?? false;
  const kind = gitText(installDir, ["cat-file", "-t", `refs/tags/${HARNESS_TAG}`]);
  if (!pointed || kind !== "tag") warnings.push(`Pinned checkout should be annotated tag ${HARNESS_TAG}.`);

  const dirty = gitText(installDir, ["status", "--porcelain"]);
  if (dirty === null) warnings.push("Pinned checkout is not a git work tree.");
  else if (dirty !== "") warnings.push("Pinned checkout is dirty.");

  return { ok: warnings.length === 0, warnings };
}
