---
name: web-search
description: Choose the web tool for the kind of search. Quick lookups use web_search. Open pages, PDFs, GitHub, and YouTube with fetch_content. Deep research uses web_research.
---

# Web search

Two packages search. They do different jobs. Use one.

| Job | Tool | Package |
| --- | --- | --- |
| A few focused queries, titles and links | `web_search` | pi-smart-web-search |
| Open those links, a normal page, a PDF, GitHub, or YouTube | `fetch_content` | pi-web-access |
| Deep research across providers | `web_research` | pi-web-access |
| Check a source or reread a stored page | `source_check`, `get_search_content` | pi-web-access |

`web_search` takes up to six query strings. Open the links with `fetch_content`. `web_fetch` is not installed: pi-smart-fetch needs Node 24.18 and Bun, and this machine stays on Node 22. `web_research` is pi-web-access search after the rename in `~/.pi/agent-personal/web-search.json`. If that file is missing, Pi reports a `web_search` clash and the deep tool does not load.

No API key is required. Optional provider keys for pi-web-access go in `~/.pi/agent-personal/web-search.json`, which the agent cannot read. Do not put them in this repo's `.env`.
