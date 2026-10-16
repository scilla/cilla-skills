# Sources

Where each dimension's data lives in Claude Code. Other agents keep their own session logs and config, so find their equivalents before starting.

## Sessions

- Transcripts sit in `~/.claude/projects/<project-dir>/*.jsonl`, one JSON event per line, with subagent runs under `subagents/`. The project dir is the working directory with every `/` turned into `-`.
- Claude Code prunes old transcripts, so history covers roughly the last 30 to 60 days. A count of 0 means 0 in that window. State the window's real start in the report.
- A user prompt is an event with `type: "user"` whose content is a string or text blocks. Leave out `tool_result` blocks, system reminders and command wrappers.
- A skill run leaves one of three marks: the text "Base directory for this skill: .../skills/<name>", a `Skill` tool call, or `<command-name>/<name></command-name>` in a prompt. Count sessions, not lines.
- An MCP call is a tool call named `mcp__<server>__<tool>`. Connectors from claude.ai carry a UUID as the server name, so map it to a connector through its tool names.
- Friction worth counting: pushback ("no", "ti avevo detto", "di nuovo"), `[Request interrupted by user]`, denied tool calls, instructions retyped across sessions, long sessions with compactions.

## Setup

- Permissions, hooks and enabled plugins live in `~/.claude/settings.json` and in each project's `.claude/settings*.json`.
- `~/.claude.json` holds `mcpServers` (global and per project), `claudeAiMcpEverConnected`, and the `skillUsage` and `pluginUsage` counters. The counters run low, so cross-check them against the transcripts.
- Instruction files are `~/.claude/CLAUDE.md` and each repo's `CLAUDE.md` and `AGENTS.md`.
- Skills live in `~/.claude/skills` and in each project's `.claude/skills`. Skills installed by the `skills` CLI sit in `~/.agents/skills`, tracked by `~/.agents/.skill-lock.json`.
- Plugins live in `~/.claude/plugins`, with `installed_plugins.json` for local ones and `synced/` for those that come from claude.ai.
- Memory lives in `~/.claude/projects/<project-dir>/memory/`. Its `MEMORY.md` index loads into every session of that project, so its size is a cost.
- Connectors and plugins from claude.ai are managed in its settings, under Customize.

## Repos

- For each repo, read `git status`, `git log --since`, `git branch -vv`, `git worktree list`, `git stash list` and the commits not yet pushed.
- Quality gates are the tests, the lint and typecheck configs, pre-commit hooks and `.github/workflows`.
- Look for tracked secrets with `git ls-files`: `.env*` files, keys, credential exports. Report the file and the key name, never the value.

## Traps

- Project dirs start with `-`, so `ls` and `du` read them as options. Prefix them with `./`.
- zsh leaves unquoted variables unsplit. Loop over an explicit list or an array.
- Keyword counts pick up skill text and subagent briefs stored in the transcripts. Sample the matching lines before trusting a number.
- Before recommending the removal of a skill, search the repos' instruction files and the other skills for its name. A skill with no recorded use can still be part of a documented workflow.
- macOS blocks reading the Chrome profile, and extensions cannot read `chrome://` pages. Ask the user to open the page, then read it from a screenshot.
- In an agent session the `skills` CLI ignores `--skill`, and `remove` leaves the lock dirty. Edit the lock by hand when applying a change.
