---
name: checkup
description: Check how the user works with the agent, in the repos and in the agent setup, and recommend what to change. Nothing changes until the user names it. Use only when the user asks for it by name.
argument-hint: "[sessions | repos | setup | <topic>] [window, e.g. 30d]"
disable-model-invocation: true
---

# Checkup

A **checkup** examines, measures and recommends. It ends at a report with ranked **findings**, each with its evidence and a fix, and a **verdict** (keep, remove, decide) for every item of any inventory it lists. The user decides what gets applied.

## 1. Scope

Map the argument onto dimensions. With no argument, take the first three:

- **sessions**: how the user and the agent work together, read from the session transcripts;
- **repos**: development practice in the active repos;
- **setup**: the agent's own configuration, meaning settings and permissions, instruction files, skills, MCP servers and connectors, plugins and memory;
- any other topic ("the tools", "my browser extensions") is a dimension of its own.

The window defaults to the last 30 days. [SOURCES.md](SOURCES.md) lists where each dimension's data lives and the traps in reading it.

**Done when** every dimension has its sources and window, and the user knows which sources the checkup cannot read, such as a browser profile the OS blocks or a service that needs a sign-in.

## 2. Evidence

Brief one read-only subagent per dimension, all in parallel. Each brief carries the dimension's sources from SOURCES.md and this output contract:

- each finding comes with evidence (counts, `file:line`, dates, at most two quotes under 15 words), its impact and a concrete fix, such as a settings line, an instruction-file line, a skill or a habit;
- each inventory (tools, skills, extensions) has one row per item, with its usage in the window and a verdict;
- what works and should stay;
- secrets named by file and key, with their values left out.

Gather a single small dimension yourself.

**Done when** every dimension has reported.

## 3. Spot-check

A subagent's report is a claim. Re-run one command for each top-ranked finding, each security or data-loss claim, and each number a verdict hinges on. Correct or drop what does not hold, and mark what cannot be checked as unverified.

**Done when** every top finding is verified, corrected or marked unverified.

## 4. Report

Write in the user's language, headings included, in this shape:

````markdown
<overall verdict, one sentence>

## Findings

1. **<finding>**, <dimension>. <evidence: counts, `file:line`, dates>. <impact>. Fix: <the concrete change>.

## <inventory, such as MCP servers>

| Item | Usage in window | Verdict | Reason |
|---|---|---|---|

## Keep

- <what works and should stay>

## Open points

1. <a decision for the user>
````

Rank findings by impact, urgent first (exposed secrets, missing guardrails). Leave out the inventory section when the scope has no inventory.

**Done when** every finding carries evidence and a fix, and every inventory row a verdict.

## 5. Stop

The checkup ends at the report. A number the user sends back asks for a closer look at that point, with per-item analysis and verdicts, followed by a question. Changes start only on an instruction that names them ("remove A and B", "apply 3"). Apply them reversibly. Back up first, archive rather than delete, verify, and report what changed and how to undo it.
