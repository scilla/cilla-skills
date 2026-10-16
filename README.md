# cilla-skills

Personal skills in the [Agent Skills](https://agentskills.io) format. Each skill
has a folder in `skills/<name>/` with its `SKILL.md` and any scripts. They work
with every agent that reads the format: Claude Code, Codex, Cursor, Gemini CLI,
GitHub Copilot and others.

| Skill | What it does |
|---|---|
| `wrap-up` | Closes a session: tickets updated, work committed and merged, worktrees removed. |
| `call-input` | Turns a call transcript into tracker changes. Extracts the next steps and proposes which tickets to open, update or close. |
| `dispatch` | Hands ready tickets to parallel agents in worktrees, integrates their work, runs the full check once and lands it on the base branch. |
| `dispatch-and-triage` | Triages pending tickets one question at a time and dispatches each ticket as soon as it is ready. |
| `design-lab` | Builds variants of a page or component on the `/design-lab` route, to compare, pick and bring into the product. |
| `checkup` | Examines how you work with the agent, in your repos and in your agent setup. It measures and recommends, and changes nothing until you choose what to apply. |

## Install

```bash
npx skills add scilla/cilla-skills
```

The [skills CLI](https://github.com/vercel-labs/skills) asks which skills to
install and for which agents. Add `--skill checkup` to take a single one.
`npx skills update` brings them up to date, and `npx skills remove` takes them
out.

Every skill runs only when you invoke it. Claude Code reads that from
`disable-model-invocation: true` in the frontmatter, Codex from
`allow_implicit_invocation: false` in `agents/openai.yaml`. Other agents go by
the `description`, so each one says when to use the skill.

### For development

Clone the repo and link it instead, so an edit here applies everywhere at once:

```bash
git clone https://github.com/scilla/cilla-skills.git
cd cilla-skills
./link.sh
```

`link.sh` links every skill into the global skills folder of each installed
agent (`~/.claude/skills`, `~/.codex/skills` and so on). `./link.sh claude codex`
limits it to the agents named; Continue is linked only when named. Names
already taken by something else are left alone, and links left dangling after
the repo moves are redone.

## Tests

```bash
node --test
```

Node only, no dependencies.

## Contact

Questions and bug reports go in the [issues](https://github.com/scilla/cilla-skills/issues).

## License

MIT, see [LICENSE](LICENSE).
