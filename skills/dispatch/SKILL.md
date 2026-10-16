---
name: dispatch
description: Hand the ready-for-agent tickets to parallel agents in worktrees, then integrate their work, run the full check once and land it on the base branch. Use only when the user asks for it by name.
disable-model-invocation: true
---

Turn the tracker's ready queue into commits on the base branch. Agents do the work in parallel, each in its own worktree. You are the **orchestrator**: you own the tracker, the integration branch and every merge. The gate is the full check going green on the integration branch, not a review of each branch.

## 1. Queue

Find the tracker. Look in the project's `AGENTS.md` / `CLAUDE.md` and the docs they point to, then the git host's issues, then ask the user. Learn its states and how a ticket closes.

List every ticket in the tracker's ready-for-agent state, including those that exist only on unmerged branches. Read each one in full. A ticket that lacks what an agent needs to start, such as acceptance criteria or a product decision, goes back to triage with a one-line reason.

Plan the **slots**: at most three agents run at once. Tickets that touch the same files, or block one another, run in sequence.

Done when every ready ticket has a place in the plan or a reason it is out. Show the plan in a few lines and start.

## 2. Base

Note the base branch and its sha. Agents can only read the base's commits, so a ticket changed this session must be committed to the base first, on its own, in the repo's commit form. Then create the integration branch `integration/<yyyy-mm-dd>` from the base.

Done when the base holds every ticket text the agents will read.

## 3. Launch

Launch one agent per ticket, each in its own worktree on its own branch. In Claude Code, use the Agent tool with `isolation: "worktree"` and Opus, unless the user names another model. Use the brief in [BRIEF.md](BRIEF.md) with its blanks filled in. When an agent finishes, its slot frees, so launch the next ticket in the plan.

Done when every planned ticket has run.

## 4. Integrate

As each report arrives:

- check that the agent's commits (`git log <base>..<branch>`) match what the report says;
- merge the branch into the integration branch with `--no-ff`, in the form `git log --merges` shows. Resolve mechanical conflicts yourself. A conflict that needs a choice goes to the user;
- keep the report's doubts and findings for steps 6 and 8.

When a report stops on a blocking question, put the question to the user with your recommendation. Then resume the same agent with the answer (in Claude Code, SendMessage).

Done when every finished branch is merged into integration, or held back with a reason.

## 5. Check

Run the repo's full check command once, on the integration branch: lint, typecheck, tests, build and e2e, as its docs or package scripts define them. Run e2e on a port no other session holds. A failure that a second run clears is flake. Note it and move on. For a real failure, fix it on the integration branch if the integration caused it; otherwise send it back to the agent whose merge introduced it.

Done when the full check is green on the integration head.

## 6. Tickets

Close each merged ticket the way the tracker closes them, with today's date and the merge sha. The agent's doubts go in the closing note. Each finding outside a ticket's scope becomes a new ticket in the triage state. Regenerate the tracker's index if it has one, then commit on the integration branch.

Done when every merged ticket is closed, and the index regenerates to an empty diff.

## 7. Land

Re-read the base right before landing, since other sessions commit to it while the checks run. If it moved:

- tracker-only commits: merge them into integration and land;
- anything else: merge it into integration and go back to step 5.

Fast-forward the base to integration. Before anything else, confirm that `git rev-parse <base>` equals the integration head. A failed fast-forward hidden behind a pipe once pushed someone else's commit.

Pushing is the user's call every time. Ask, and say how many commits the base is ahead of origin. Production deploys are theirs too.

Then clean up:

- stop any server an agent left listening (`lsof -i :<port>`);
- remove the run's worktrees (`git worktree remove`, plus `-f -f` on a locked one);
- delete the merged branches and the integration branch.

The wrap-up skill's report (`node <skill-dir>/../wrap-up/scripts/check.mjs`) lists every worktree and what still holds it.

Done when the base contains every merged ticket and none of the run's worktrees remain.

## 8. Report

- Tickets closed: each with its title in plain words, the id in brackets, and the sha.
- Tickets held back or sent back to triage, with the reason.
- New tickets filed from findings.
- The agents' non-blocking doubts, listed with your recommendation for each, not asked one by one.
- Commits on the base not yet pushed.
