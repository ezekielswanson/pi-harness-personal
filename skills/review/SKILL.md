---
name: review
description: Review a change with the reviewer subagent. Return must fix, should fix, nits, and questions.
---

# Review

1. Read the change yourself first.
2. Ask the reviewer subagent to critique it. The reviewer uses read, grep, find, and ls.
3. Report in this order:
   - Must fix
   - Should fix
   - Nits
   - Questions
4. Fix must-fix items, then read back the changed files.

Keep at most 3 subagents at once, depth 1.
