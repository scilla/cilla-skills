---
name: wrap-up
description: Close a session when the user asks to wrap up — its tickets updated, its work committed and merged, its worktrees removed.
disable-model-invocation: true
---

Close this session's work so nothing it started is left half-done: tickets that say what happened, commits in the base branch, no leftover worktrees. Every step acts on the session's **footprint** only; what other sessions left in the repo is reported and left as it is.

## 1. Footprint

List everything this session touched:

- tickets it acted on, edited or created;
- branches and worktrees it created, subagents' included (in Claude Code, an Agent run with `isolation: "worktree"` names path and branch in its result);
- commits it made, and files it changed without committing.

The conversation is the source; after a compaction, re-read the session's saved transcript (Claude Code: `~/.claude/projects/<project>/<session-id>.jsonl`; other agents keep their own session log). Git is only the cross-check: other sessions may commit in this same checkout under the same author, and their worktrees and dirty files look exactly like this session's. A file or branch you cannot place in the footprint is someone else's.

Also note the start sha, the HEAD the session started from. Claude Code shows it as the first line of "Recent commits" in the git status that opens the session; otherwise take it from `git reflog --date=iso`, the last entry before the session began.

Done when every footprint item has a path or a name.

## 2. Report

From the repo root, with `<skill-dir>` the directory holding this `SKILL.md`:

```bash
node <skill-dir>/scripts/check.mjs --fetch --since <start-sha>
```

Read-only, whole repo. Add `--parked <prefix>` for a prefix the repo parks branches under, beyond the default `parked/`. Map each line onto the footprint; lines outside it go into the final report as not this session's, untouched.

## 3. Tickets

Find how the repo tracks work: its `AGENTS.md` / `CLAUDE.md` point to it. Apply its rules to every footprint ticket:

- finished → closed the way the repo closes tickets, with the date and the commit SHA;
- partial → its state says, with today's date, what is left and who holds it;
- a finding outside the ticket's scope → its own new ticket, in the repo's triage state.

A ticket index the repo generates is regenerated and committed with the tickets. A tracker outside the repo is updated through its tool when the session has one; otherwise its updates go into the final report for the user to make. A repo with no tracker skips this step.

Done when every footprint ticket's state says what happened, dated today, and the repo's index, if it has one, regenerates to an empty diff.

## 4. Commit

Every footprint change is committed, in the main checkout and in each footprint worktree, in the message form `git log` shows. The `AGENTS.md` block `next dev` rewrites goes in with the work. A dirty file whose owner you cannot tell: ask the user.

Done when no footprint file appears in a dirty list of the report.

## 5. Merge

Every footprint branch reaches the base the repo's way: its docs, or the shape of `git log --merges`. A merge that brings in code goes through an integration branch: merge there, the repo's full check command green (its docs, its package scripts), then fast-forward the base. Re-read the base right before the fast-forward, since other sessions may commit to it while checks run; if it moved, merge it into the integration branch and check again. Parked branches stay as they are.

Pushing is the user's call every time: ask, with the number of commits the base is ahead of origin. Production deploys are theirs.

Done when the report shows no footprint branch or worktree with commits outside the base.

## 6. Worktrees

For each footprint worktree, act on the report's verdict:

- `removable` → run the command the report prints (`git worktree remove`, then `git branch -d`, which refuses an unmerged branch by itself);
- `listening process` → an agent's dev server or `next start`: `kill` the pid the report names, then re-run the report;
- `locked` → `git worktree remove -f -f` once the user confirms;
- `missing directory` → `git worktree prune`;
- dirty, or with commits outside the base → back to step 4 or 5.

The worktree this session itself runs in stays: whatever started the session there (in Claude Code, the desktop app) removes it with the session.

`removable` worktrees outside the footprint are leftovers of past sessions: list them and offer to remove them all in one question.

Done when a re-run of the report shows no footprint worktree.

## 7. Final report

One line per area (tickets, commits, merge, worktrees) marked ✅ / ⚠️ / ❌, then:

- what is left, and who holds it;
- what the report showed outside the footprint, left alone;
- commits in the base not yet pushed.

If the session's work is unfinished, suggest a handoff (the `handoff` skill, where installed).
