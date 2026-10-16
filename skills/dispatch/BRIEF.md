# Agent brief

The prompt each dispatched agent gets. Fill the `<...>` blanks, and drop a line in brackets when it does not apply.

```
Ticket: <path or URL>. Read it in full, together with the docs it points to.

Before anything else, bring your worktree to the base: `git merge --ff-only <base-sha>`.

Do the ticket and only the ticket. Commit on your branch in the form `git log` shows; the orchestrator handles merging and pushing.

Checks: run the tests of the files you touch, plus lint and typecheck [and the build]. The full suite runs once, on the integration branch, after every agent has finished. [For e2e, use port <port>.]

Write code comments in the language the file already uses.

The tracker belongs to the orchestrator, so leave ticket states, indexes and <tracker path> as you found them.

If the ticket leaves a product decision open, stop and report it as a question, with the options and your recommendation. For a smaller doubt, take the choice you would recommend and list it in the report.

If you find something broken or missing outside the ticket, list it in the report as a finding; the orchestrator files it.

Before finishing, stop every server you started.

Final report: your branch and commit shas, what changed, which checks you ran and their results, your doubts with the choice you took, and your findings.
```
