import { readPersonalConfig, writePersonalConfig, type VaultIds } from "../config/personalConfig.ts";
import { notionFetch } from "../notion/client.ts";
import { dataSourceIdFromDatabase } from "./recall.ts";
import {
  ABOUT_ME_TITLE,
  memoriesProperties,
  MEMORIES_TITLE,
  skillsProperties,
  SKILLS_TITLE,
  titleProperty,
  WORKSTREAMS_TITLE,
} from "./schema.ts";

interface ChildRef {
  id: string;
  title: string;
  kind: "page" | "database";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function childTitle(block: Record<string, unknown>): ChildRef | null {
  const id = typeof block.id === "string" ? block.id : "";
  if (!id || typeof block.type !== "string") return null;
  if (block.type === "child_page" && isRecord(block.child_page) && typeof block.child_page.title === "string") {
    return { id, title: block.child_page.title, kind: "page" };
  }
  if (block.type === "child_database" && isRecord(block.child_database) && typeof block.child_database.title === "string") {
    return { id, title: block.child_database.title, kind: "database" };
  }
  return null;
}

async function listChildren(parentPageId: string, fetchImpl: typeof fetch): Promise<ChildRef[]> {
  const found: ChildRef[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const query = cursor ? `?start_cursor=${encodeURIComponent(cursor)}` : "";
    const payload = await notionFetch(`/blocks/${parentPageId}/children${query}`, { method: "GET" }, fetchImpl);
    if (!isRecord(payload) || !Array.isArray(payload.results)) break;
    for (const block of payload.results) {
      if (!isRecord(block)) continue;
      const child = childTitle(block);
      if (child) found.push(child);
    }
    if (payload.has_more !== true || typeof payload.next_cursor !== "string") break;
    cursor = payload.next_cursor;
  }
  return found;
}

async function createPage(parentPageId: string, title: string, fetchImpl: typeof fetch): Promise<string> {
  const payload = await notionFetch(
    "/pages",
    {
      method: "POST",
      idempotent: false,
      body: {
        parent: { type: "page_id", page_id: parentPageId },
        properties: { title: titleProperty(title) },
      },
    },
    fetchImpl,
  );
  if (!isRecord(payload) || typeof payload.id !== "string") throw new Error(`Could not create ${title}.`);
  return payload.id;
}

async function createDatabase(parentPageId: string, title: string, properties: Record<string, unknown>, fetchImpl: typeof fetch): Promise<{ id: string; dataSourceId: string }> {
  const payload = await notionFetch(
    "/databases",
    {
      method: "POST",
      idempotent: false,
      body: {
        parent: { type: "page_id", page_id: parentPageId },
        title: titleProperty(title).title,
        initial_data_source: { properties },
      },
    },
    fetchImpl,
  );
  if (!isRecord(payload) || typeof payload.id !== "string") throw new Error(`Could not create ${title}.`);
  return { id: payload.id, dataSourceId: dataSourceIdFromDatabase(payload) };
}

function findChild(children: ChildRef[], title: string, kind: ChildRef["kind"]): string {
  return children.find((child) => child.kind === kind && child.title === title)?.id ?? "";
}

async function ensureSelfRelation(dataSourceId: string, fetchImpl: typeof fetch): Promise<void> {
  const current = await notionFetch(`/data_sources/${dataSourceId}`, { method: "GET" }, fetchImpl);
  const properties = isRecord(current) && isRecord(current.properties) ? current.properties : {};
  if ("Supersedes" in properties) return;
  await notionFetch(
    `/data_sources/${dataSourceId}`,
    {
      method: "PATCH",
      idempotent: true,
      body: { properties: { Supersedes: memoriesProperties(dataSourceId).Supersedes } },
    },
    fetchImpl,
  );
}

export async function setupVault(root: string, parentPageId: string, fetchImpl: typeof fetch = fetch): Promise<VaultIds> {
  const parent = parentPageId.trim();
  if (!parent) throw new Error("parentPageId is required.");
  const existing = readPersonalConfig(root).vault;
  const children = await listChildren(parent, fetchImpl);

  const aboutMePageId = existing.aboutMePageId || findChild(children, ABOUT_ME_TITLE, "page") || (await createPage(parent, ABOUT_ME_TITLE, fetchImpl));
  let memoriesDbId = existing.memoriesDbId || findChild(children, MEMORIES_TITLE, "database");
  if (!memoriesDbId) {
    const created = await createDatabase(parent, MEMORIES_TITLE, memoriesProperties(), fetchImpl);
    memoriesDbId = created.id;
    await ensureSelfRelation(created.dataSourceId, fetchImpl);
  }
  const skillsDbId = existing.skillsDbId || findChild(children, SKILLS_TITLE, "database") || (await createDatabase(parent, SKILLS_TITLE, skillsProperties(), fetchImpl)).id;
  const workstreamsPageId = existing.workstreamsPageId || findChild(children, WORKSTREAMS_TITLE, "page") || (await createPage(parent, WORKSTREAMS_TITLE, fetchImpl));

  const vault: VaultIds = {
    parentPageId: parent,
    aboutMePageId,
    memoriesDbId,
    skillsDbId,
    workstreamsPageId,
  };
  writePersonalConfig(root, vault);
  return vault;
}
