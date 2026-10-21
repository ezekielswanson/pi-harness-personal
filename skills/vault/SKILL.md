---
name: vault
description: Recall vault memories at the start of non-trivial work and remember durable facts at the end.
---

# Vault

About Me is already loaded when the vault is set up.

## Start

Call `vault_recall` for the topic. Use Scope and Type when you know them. Retired rows stay out unless you are checking history.

## End

Call `vault_remember` for a durable preference, decision, or fact. One sentence. Source defaults to this session.

When a new fact replaces an old one, pass `supersedes` with the old page id, or mark the old row Retired in Notion.

## First run

If the context says the vault is not set up, run `vault_setup` under the Pi Context Vault page.
