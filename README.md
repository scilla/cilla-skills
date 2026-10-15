# cilla-skills

Skill personali nel formato [Agent Skills](https://agentskills.io): una
cartella per skill in `skills/<nome>/`, con il suo `SKILL.md` e gli eventuali
script. Valgono per ogni agente che legge il formato (Claude Code, Codex,
Cursor, Gemini CLI, GitHub Copilot, …).

| Skill | Cosa fa |
|---|---|
| `wrap-up` | Chiusura di sessione: ticket aggiornati, lavoro committato e mergiato, worktree tolti. |

## Installazione

```bash
./link.sh
```

Collega ogni skill nella cartella globale di ogni agente installato
(`~/.claude/skills`, `~/.codex/skills`, …), così una modifica qui vale subito
ovunque. `./link.sh claude codex` limita agli agenti nominati; Continue entra
solo se nominato. I nomi già occupati da altro restano come sono; i link
rimasti appesi dopo uno spostamento della repo vengono rifatti.

`disable-model-invocation: true` lo rispetta solo Claude Code, dove la skill
parte unicamente a comando. Gli altri agenti leggono la `description`, che per
questo dice quando usarla.

## Test

```bash
node --test
```

Solo Node, nessuna dipendenza.
