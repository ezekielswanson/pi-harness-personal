import { readPersonalConfig, vaultIdsMissing } from "../config/personalConfig.ts";
import { blocksToText } from "../notion/blocks.ts";
import { notionFetch } from "../notion/client.ts";
import { ABOUT_ME_LIMIT, VAULT_MISSING_LINE } from "./schema.ts";

export function truncateAboutMe(text: string): string {
  return text.length > ABOUT_ME_LIMIT ? text.slice(0, ABOUT_ME_LIMIT) : text;
}

export async function fetchAboutMeText(pageId: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const payload = await notionFetch(`/blocks/${pageId}/children?page_size=100`, { method: "GET" }, fetchImpl);
  return truncateAboutMe(blocksToText(payload));
}

export async function aboutMeInjection(root: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const { vault } = readPersonalConfig(root);
  if (vaultIdsMissing(vault) || !vault.aboutMePageId) return VAULT_MISSING_LINE;
  const text = await fetchAboutMeText(vault.aboutMePageId, fetchImpl);
  return text.trim() ? text : VAULT_MISSING_LINE;
}
