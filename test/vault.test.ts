import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { writePersonalConfig } from "../src/config/personalConfig.ts";
import { aboutMeInjection } from "../src/vault/about.ts";
import { buildRecallFilter, parseRecallPage, recallMemories } from "../src/vault/recall.ts";
import { rememberFact, rememberProperties } from "../src/vault/remember.ts";
import { ABOUT_ME_LIMIT, VAULT_MISSING_LINE } from "../src/vault/schema.ts";
import { setupVault } from "../src/vault/setup.ts";
import { setSessionId } from "../src/runtime/sessionState.ts";
import { removeRepo, tempWorkspace, withEnv } from "./helpers.ts";

interface Call {
  method: string;
  url: string;
  body: unknown;
  headers: Headers;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function mockFetch(handler: (call: Call) => Response): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const raw = init?.body ? JSON.parse(String(init.body)) as unknown : undefined;
    const headers = new Headers(init?.headers);
    calls.push({ method: init?.method ?? "GET", url, body: raw, headers });
    return handler(calls[calls.length - 1]);
  };
  return { fetch: fetchImpl, calls };
}

test("recall builds the filter and parses rows", async () => {
  assert.deepEqual(buildRecallFilter({ text: "tea", scope: "Personal", type: "preference", includeRetired: false }), {
    and: [
      { property: "Fact", title: { contains: "tea" } },
      { property: "Scope", select: { equals: "Personal" } },
      { property: "Type", select: { equals: "preference" } },
      {
        or: [
          { property: "Status", select: { does_not_equal: "Retired" } },
          { property: "Status", select: { is_empty: true } },
        ],
      },
    ],
  });
  assert.equal(buildRecallFilter({ includeRetired: true }), undefined);

  const row = parseRecallPage({
    url: "https://www.notion.so/fact",
    properties: {
      Fact: { title: [{ plain_text: "Likes tea" }] },
      Scope: { select: { name: "Personal" } },
      Type: { select: { name: "preference" } },
      Date: { date: { start: "2026-10-21" } },
    },
  });
  assert.deepEqual(row, { fact: "Likes tea", scope: "Personal", type: "preference", date: "2026-10-21", url: "https://www.notion.so/fact" });

  const root = tempWorkspace();
  writePersonalConfig(root, {
    parentPageId: "parent",
    aboutMePageId: "about",
    memoriesDbId: "mem-db",
    skillsDbId: "skills",
    workstreamsPageId: "work",
  });
  const { fetch: fetchImpl, calls } = mockFetch((call) => {
    if (call.url.endsWith("/databases/mem-db")) return json({ data_sources: [{ id: "mem-ds" }] });
    if (call.url.endsWith("/data_sources/mem-ds/query")) {
      return json({ results: [{ url: "https://www.notion.so/fact", properties: { Fact: { title: [{ plain_text: "Likes tea" }] }, Scope: { select: { name: "Personal" } }, Type: { select: { name: "preference" } }, Date: { date: { start: "2026-10-21" } } } }] });
    }
    return json({ message: "unexpected" }, 500);
  });
  await withEnv({ NOTION_TOKEN: "test-notion-token" }, async () => {
    const rows = await recallMemories(root, { text: "tea", scope: "Personal", type: "preference", limit: 10 }, fetchImpl);
    assert.equal(rows[0]?.fact, "Likes tea");
  });
  const query = calls.find((call) => call.url.endsWith("/query"));
  assert.equal(query?.method, "POST");
  assert.deepEqual((query?.body as { page_size: number; sorts: unknown }).page_size, 10);
  assert.deepEqual((query?.body as { sorts: unknown }).sorts, [{ property: "Date", direction: "descending" }]);
  assert.equal(query?.headers.get("Notion-Version"), "2025-09-03");
  assert.equal(query?.headers.get("authorization"), "Bearer test-notion-token");
  removeRepo(root);
});

test("remember sends the properties and defaults", async () => {
  setSessionId("abc");
  const properties = rememberProperties({ fact: "Likes tea", scope: "Personal", type: "preference", today: "2026-10-21" });
  assert.deepEqual(properties.Date, { date: { start: "2026-10-21" } });
  assert.deepEqual(properties.Status, { select: { name: "Active" } });
  assert.deepEqual(properties.Source, { rich_text: [{ type: "text", text: { content: "pi:abc" } }] });

  const root = tempWorkspace();
  writePersonalConfig(root, {
    parentPageId: "parent",
    aboutMePageId: "about",
    memoriesDbId: "mem-db",
    skillsDbId: "skills",
    workstreamsPageId: "work",
  });
  const { fetch: fetchImpl, calls } = mockFetch((call) => {
    if (call.url.endsWith("/databases/mem-db")) return json({ data_sources: [{ id: "mem-ds" }] });
    if (call.url.endsWith("/pages")) return json({ id: "page-1", url: "https://www.notion.so/page-1" });
    return json({ message: "unexpected" }, 500);
  });
  await withEnv({ NOTION_TOKEN: "test-notion-token" }, async () => {
    const created = await rememberFact(root, { fact: "Likes tea", scope: "Personal", type: "preference", today: "2026-10-21", supersedes: "old-page" }, fetchImpl);
    assert.equal(created.id, "page-1");
  });
  const post = calls.find((call) => call.method === "POST");
  const body = post?.body as { parent: { data_source_id: string }; properties: { Supersedes: { relation: Array<{ id: string }> } } };
  assert.equal(body.parent.data_source_id, "mem-ds");
  assert.deepEqual(body.properties.Supersedes, { relation: [{ id: "old-page" }] });
  removeRepo(root);
});

test("setup is idempotent and writes .pi/personal.json", async () => {
  const root = tempWorkspace();
  const children = {
    results: [
      { id: "about-1", type: "child_page", child_page: { title: "About Me" } },
      { id: "mem-1", type: "child_database", child_database: { title: "Memories" } },
      { id: "skills-1", type: "child_database", child_database: { title: "Skills" } },
      { id: "work-1", type: "child_page", child_page: { title: "Workstreams" } },
    ],
    has_more: false,
  };
  const { fetch: fetchImpl, calls } = mockFetch((call) => {
    if (call.url.includes("/blocks/parent/children")) return json(children);
    return json({ message: "unexpected" }, 500);
  });
  await withEnv({ NOTION_TOKEN: "test-notion-token", VAULT_ABOUT_ME_PAGE_ID: undefined, VAULT_MEMORIES_DB_ID: undefined, VAULT_SKILLS_DB_ID: undefined, VAULT_WORKSTREAMS_PAGE_ID: undefined }, async () => {
    const first = await setupVault(root, "parent", fetchImpl);
    assert.deepEqual(first, { parentPageId: "parent", aboutMePageId: "about-1", memoriesDbId: "mem-1", skillsDbId: "skills-1", workstreamsPageId: "work-1" });
    const saved = JSON.parse(readFileSync(join(root, ".pi", "personal.json"), "utf8")) as { vault: typeof first };
    assert.deepEqual(saved.vault, first);
    const posts = calls.filter((call) => call.method === "POST");
    assert.equal(posts.length, 0);
    calls.length = 0;
    const second = await setupVault(root, "parent", fetchImpl);
    assert.deepEqual(second, first);
    assert.equal(calls.filter((call) => call.method === "POST").length, 0);
  });
  removeRepo(root);
});

test("setup creates missing items and About Me injection truncates or falls back", async () => {
  const root = tempWorkspace();
  writeFileSync(join(root, ".pi", "personal.json"), `${JSON.stringify({ vault: { parentPageId: "", aboutMePageId: "", memoriesDbId: "", skillsDbId: "", workstreamsPageId: "" } })}\n`);
  let created = 0;
  const { fetch: fetchImpl } = mockFetch((call) => {
    if (call.url.includes("/blocks/parent/children")) return json({ results: [], has_more: false });
    if (call.method === "POST" && call.url.endsWith("/pages")) {
      created += 1;
      const title = created === 1 ? "about-new" : "work-new";
      return json({ id: title });
    }
    if (call.method === "POST" && call.url.endsWith("/databases")) {
      const title = JSON.stringify(call.body).includes("Memories") ? "mem-new" : "skills-new";
      return json({ id: title, data_sources: [{ id: `${title}-ds` }] });
    }
    if (call.url.endsWith("/data_sources/mem-new-ds") && call.method === "GET") return json({ properties: {} });
    if (call.method === "PATCH") return json({ id: "mem-new-ds" });
    return json({ message: "unexpected" }, 500);
  });
  await withEnv({ NOTION_TOKEN: "test-notion-token", VAULT_ABOUT_ME_PAGE_ID: undefined, VAULT_MEMORIES_DB_ID: undefined, VAULT_SKILLS_DB_ID: undefined, VAULT_WORKSTREAMS_PAGE_ID: undefined }, async () => {
    const vault = await setupVault(root, "parent", fetchImpl);
    assert.equal(vault.aboutMePageId, "about-new");
    assert.equal(vault.memoriesDbId, "mem-new");
    assert.equal(vault.skillsDbId, "skills-new");
    assert.equal(vault.workstreamsPageId, "work-new");
    const empty = tempWorkspace();
    const missing = await aboutMeInjection(empty, fetchImpl);
    removeRepo(empty);
    assert.equal(missing, VAULT_MISSING_LINE);
    writePersonalConfig(root, { ...vault, aboutMePageId: "about-new" });
    const long = "x".repeat(ABOUT_ME_LIMIT + 50);
    const reader: typeof fetch = async () => json({ results: [{ type: "paragraph", paragraph: { rich_text: [{ plain_text: long }] } }] });
    const text = await aboutMeInjection(root, reader);
    assert.equal(text.length, ABOUT_ME_LIMIT);
    assert.equal(text, long.slice(0, ABOUT_ME_LIMIT));
  });
  removeRepo(root);
});
