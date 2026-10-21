import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { getWorkspaceRoot } from "../../../src/config/paths.ts";
import { recallMemories } from "../../../src/vault/recall.ts";
import { rememberFact } from "../../../src/vault/remember.ts";
import { MEMORY_SCOPES, MEMORY_TYPES, STATUSES } from "../../../src/vault/schema.ts";
import { setupVault } from "../../../src/vault/setup.ts";
import { sanitizeErrorMessage } from "../../../src/utils/errors.ts";
import { toolError, toolText } from "../../../src/utils/toolResult.ts";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "vault_recall",
    label: "Vault Recall",
    description: "Query the Memories database. Fact contains text, optional Scope and Type, Status not Retired unless includeRetired. Newest first.",
    promptSnippet: "Recall vault memories",
    promptGuidelines: ["Call this at the start of non-trivial work. Empty Status counts as Active."],
    parameters: Type.Object({
      text: Type.Optional(Type.String({ description: "Substring matched against Fact" })),
      scope: Type.Optional(Type.String({ description: "Global, Learning, Projects, Personal, or Pi" })),
      type: Type.Optional(Type.String({ description: "preference, decision, fact, person, or how-to" })),
      limit: Type.Optional(Type.Number({ description: "Max rows. Default 10." })),
      includeRetired: Type.Optional(Type.Boolean({ description: "Include Retired rows. Default false." })),
    }),
    async execute(_toolCallId, params) {
      try {
        const scope = params.scope && (MEMORY_SCOPES as readonly string[]).includes(params.scope) ? params.scope as (typeof MEMORY_SCOPES)[number] : undefined;
        const type = params.type && (MEMORY_TYPES as readonly string[]).includes(params.type) ? params.type as (typeof MEMORY_TYPES)[number] : undefined;
        if (params.scope && !scope) return toolError(`scope must be one of: ${MEMORY_SCOPES.join(", ")}.`);
        if (params.type && !type) return toolError(`type must be one of: ${MEMORY_TYPES.join(", ")}.`);
        const rows = await recallMemories(getWorkspaceRoot(), {
          text: params.text,
          scope,
          type,
          limit: params.limit ?? 10,
          includeRetired: params.includeRetired === true,
        });
        return toolText({ ok: true, rows });
      } catch (err) {
        return toolError(sanitizeErrorMessage(err));
      }
    },
  });

  pi.registerTool({
    name: "vault_remember",
    label: "Vault Remember",
    description: "Create a Memories row now. Date is today. Source defaults to pi:<session id>. Status defaults to Active.",
    promptSnippet: "Write one durable memory",
    promptGuidelines: ["Write the fact in one sentence. Pass supersedes when this replaces an older row."],
    parameters: Type.Object({
      fact: Type.String(),
      scope: Type.String(),
      type: Type.String(),
      source: Type.Optional(Type.String()),
      status: Type.Optional(Type.String()),
      supersedes: Type.Optional(Type.String({ description: "Page id of the memory this replaces" })),
    }),
    async execute(_toolCallId, params) {
      try {
        if (!(MEMORY_SCOPES as readonly string[]).includes(params.scope)) return toolError(`scope must be one of: ${MEMORY_SCOPES.join(", ")}.`);
        if (!(MEMORY_TYPES as readonly string[]).includes(params.type)) return toolError(`type must be one of: ${MEMORY_TYPES.join(", ")}.`);
        const status = params.status ?? "Active";
        if (!(STATUSES as readonly string[]).includes(status)) return toolError(`status must be one of: ${STATUSES.join(", ")}.`);
        const created = await rememberFact(getWorkspaceRoot(), {
          fact: params.fact,
          scope: params.scope as (typeof MEMORY_SCOPES)[number],
          type: params.type as (typeof MEMORY_TYPES)[number],
          source: params.source,
          status: status as (typeof STATUSES)[number],
          supersedes: params.supersedes,
        });
        return toolText({ ok: true, ...created });
      } catch (err) {
        return toolError(sanitizeErrorMessage(err));
      }
    },
  });

  pi.registerTool({
    name: "vault_setup",
    label: "Vault Setup",
    description: "Create About Me, Memories, Skills, and Workstreams under a Notion page if they are missing, and write ids to .pi/personal.json.",
    promptSnippet: "Create the Notion vault under a page",
    promptGuidelines: ["Pass the parent page id. Running it again reuses existing items."],
    parameters: Type.Object({
      parentPageId: Type.String({ description: "Notion page that will hold the vault" }),
    }),
    async execute(_toolCallId, params) {
      try {
        const vault = await setupVault(getWorkspaceRoot(), params.parentPageId);
        return toolText({ ok: true, vault });
      } catch (err) {
        return toolError(sanitizeErrorMessage(err));
      }
    },
  });
}
