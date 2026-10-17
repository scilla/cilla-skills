---
name: dispatch-and-triage
description: Triage the pending tickets with the user in rounds of questions, and hand each ticket to an agent the moment it is ready. Use only when the user asks for it by name.
disable-model-invocation: true
---

Decisions and execution run side by side. The user settles the pending tickets in rounds of questions. Each ticket that becomes ready starts an agent right away, while the next round is still on the table.

Execution follows the **dispatch** skill next to this one, at `<skill-dir>/../dispatch/SKILL.md`. Read it now. It governs launching, integrating, checking, landing and the report.

## 1. Queue

Find the tracker as dispatch's step 1 does, then build two lists:

- **ready**: tickets already in the ready-for-agent state. They go straight to dispatch, through its steps 1 to 3;
- **pending**: tickets in the triage state (`needs-triage`, or the tracker's word for it), plus tickets waiting on information that may have arrived since.

Order the pending list by the tracker's priority, or oldest first if it has none. A ticket that blocks others comes before them.

Done when both lists exist and dispatch has launched the ready tickets.

## 2. Triage

Investigate every pending ticket, in order:

1. Read the ticket in full, with its prior notes and comments.
2. Check that it is still open in fact: search the code and `git log -S` for the behaviour it asks for. A ticket that is already done, or duplicates another, is closed the tracker's way, saying where the work lives.
3. For a bug, find the code path or reproduce it.
4. Give it a verdict:

| Verdict | When | Write in the ticket |
| --- | --- | --- |
| **ready-for-agent** | an evident bug, or fully specified | the decision, so an agent can start |
| **question** | a product choice the ticket leaves open | the user's answer, then ready-for-agent |
| **needs-info** | it waits on someone else | what is missing and who has it |
| **ready-for-human** | needs access, credentials, a manual test, or a judgement only the user can make | why |
| **wontfix** / **postponed** | the user drops or defers it | the reason; for postponed, what brings it back |

Ask the **question** verdicts in **rounds**. A round holds every open question whose answer does not wait on another question still open, across all the pending tickets. Number them, and give each a choice with your recommendation first and its reason in one line (in Claude Code, AskUserQuestion takes up to four per call). A question that depends on an answer still open waits for the next round. Settle the obvious ones yourself and note the choice in the ticket. When small decisions pile up on one theme, stop asking and propose rethinking the model behind them.

5. Write the outcome in the ticket with today's date. If the ticket is now ready-for-agent, commit it to the base on its own, because the agent's worktree only sees committed files. Then hand it to dispatch, which launches it as soon as a slot frees.

When an agent report arrives mid-triage, integrate it (dispatch's step 4) between one round and the next.

Done when every pending ticket has a new state, or stays pending with a reason (the user deferred it).

## 3. Finish

Once the last agent has launched, continue with dispatch from its step 4. The final report gains a triage section: each pending ticket, in plain words, with the state it reached and the decision taken.
