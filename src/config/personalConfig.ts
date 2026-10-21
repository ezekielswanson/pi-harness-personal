import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getWorkspaceRoot } from "./paths.ts";

export interface VaultIds {
  parentPageId: string;
  aboutMePageId: string;
  memoriesDbId: string;
  skillsDbId: string;
  workstreamsPageId: string;
}

export interface PersonalConfig {
  vault: VaultIds;
}

const EMPTY_VAULT: VaultIds = {
  parentPageId: "",
  aboutMePageId: "",
  memoriesDbId: "",
  skillsDbId: "",
  workstreamsPageId: "",
};

const ENV_KEYS = {
  aboutMePageId: "VAULT_ABOUT_ME_PAGE_ID",
  memoriesDbId: "VAULT_MEMORIES_DB_ID",
  skillsDbId: "VAULT_SKILLS_DB_ID",
  workstreamsPageId: "VAULT_WORKSTREAMS_PAGE_ID",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function personalConfigPath(root = getWorkspaceRoot()): string {
  return join(root, ".pi", "personal.json");
}

export function readPersonalConfig(root = getWorkspaceRoot()): PersonalConfig {
  const path = personalConfigPath(root);
  const fileVault = { ...EMPTY_VAULT };
  if (existsSync(path)) {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    const vault = isRecord(raw) && isRecord(raw.vault) ? raw.vault : {};
    fileVault.parentPageId = asId(vault.parentPageId);
    fileVault.aboutMePageId = asId(vault.aboutMePageId);
    fileVault.memoriesDbId = asId(vault.memoriesDbId);
    fileVault.skillsDbId = asId(vault.skillsDbId);
    fileVault.workstreamsPageId = asId(vault.workstreamsPageId);
  }
  const vault: VaultIds = { ...fileVault };
  for (const [field, envName] of Object.entries(ENV_KEYS) as Array<[keyof typeof ENV_KEYS, string]>) {
    const override = process.env[envName]?.trim();
    if (override) vault[field] = override;
  }
  return { vault };
}

export function vaultIdsMissing(vault: VaultIds): boolean {
  return !vault.aboutMePageId || !vault.memoriesDbId || !vault.skillsDbId || !vault.workstreamsPageId;
}

export function writePersonalConfig(root: string, vault: VaultIds): void {
  const path = personalConfigPath(root);
  mkdirSync(join(root, ".pi"), { recursive: true });
  const body: PersonalConfig = {
    vault: {
      parentPageId: vault.parentPageId.trim(),
      aboutMePageId: vault.aboutMePageId.trim(),
      memoriesDbId: vault.memoriesDbId.trim(),
      skillsDbId: vault.skillsDbId.trim(),
      workstreamsPageId: vault.workstreamsPageId.trim(),
    },
  };
  writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`);
}
