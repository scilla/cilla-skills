# cilla-skills

Skill personali nel formato [Agent Skills](https://agentskills.io). Ogni skill
ha una cartella in `skills/<nome>/`, con il suo `SKILL.md` e gli eventuali
script. Valgono per ogni agente che legge il formato (Claude Code, Codex,
Cursor, Gemini CLI, GitHub Copilot e altri).

| Skill | Cosa fa |
|---|---|
| `wrap-up` | Chiusura di sessione: ticket aggiornati, lavoro committato e mergiato, worktree tolti. |
| `call-input` | Dalla trascrizione di una call al tracker: estrae i prossimi passi e propone quali ticket aprire, modificare o chiudere. |
| `dispatch` | I ticket pronti ad agenti paralleli nei worktree, poi integrazione, controlli completi una volta sola e approdo sul branch base. |
| `dispatch-and-triage` | Triage dei ticket in sospeso una domanda alla volta; ogni ticket che diventa pronto parte subito con `dispatch`. |
| `design-lab` | Varianti di una pagina o di un componente sulla route `/design-lab`, da confrontare, scegliere e portare nel prodotto. |
| `checkup` | Esame di come lavori con l'agente, nei repo e nella configurazione. Misura e consiglia, e non cambia nulla finché non scegli tu cosa applicare. |

## Installazione

```bash
./link.sh
```

Collega ogni skill nella cartella globale di ogni agente installato
(`~/.claude/skills`, `~/.codex/skills` e così via), così una modifica qui vale subito
ovunque. `./link.sh claude codex` limita agli agenti nominati; Continue entra
solo se nominato. I nomi già occupati da altro restano come sono; i link
rimasti appesi dopo uno spostamento della repo vengono rifatti.

Ogni skill parte solo a comando. Claude Code lo legge da
`disable-model-invocation: true` nel frontmatter, Codex da
`allow_implicit_invocation: false` in `agents/openai.yaml`. Gli altri agenti
leggono la `description`, che per questo dice quando usarla.

## Test

```bash
node --test
```

Solo Node, nessuna dipendenza.
