# claude-skills

Skill personali per Claude Code, una cartella per skill in `skills/<nome>/`
con il suo `SKILL.md` e gli eventuali script.

| Skill | Cosa fa |
|---|---|
| `wrap-up` | Chiusura di sessione: ticket aggiornati, lavoro committato e mergiato, worktree tolti. |

## Installazione

```bash
./link.sh
```

Collega ogni skill in `~/.claude/skills/<nome>` con un symlink, così una
modifica qui vale subito in tutte le sessioni. Salta, avvisando, i nomi già
presenti che non puntano qui.

## Test

```bash
node --test
```

Solo Node, nessuna dipendenza.
