import assert from "node:assert/strict";
import test from "node:test";

import {
  branchVerdict,
  DEFAULT_PARKED,
  joinListeners,
  parseWorktreeList,
  renderReport,
  worktreeVerdict,
} from "./check-core.mjs";

const ROOT = "/repo";
const OPTIONS = { base: "main", parked: DEFAULT_PARKED };

function worktree(overrides = {}) {
  return {
    path: `${ROOT}/.claude/worktrees/agent-1`,
    head: "aaaaaaaaaaaa",
    branch: "worktree-agent-1",
    locked: null,
    prunable: false,
    dirty: [],
    ahead: 0,
    listeners: [],
    ...overrides,
  };
}

function report(overrides = {}) {
  return {
    mainPath: ROOT,
    ...OPTIONS,
    mainBranch: "main",
    mainDirty: [],
    sync: { ahead: 0, behind: 0, fetched: true },
    worktrees: [],
    branches: [],
    session: null,
    ...overrides,
  };
}

test("parseWorktreeList reads branches, detached heads, locks and prunable entries", () => {
  const parsed = parseWorktreeList(`worktree /repo
HEAD 1111
branch refs/heads/main

worktree /repo/.claude/worktrees/agent-1
HEAD 2222
branch refs/heads/worktree-agent-1
locked claude agent agent-1 (pid 123)

worktree /repo/.claude/worktrees/agent-2
HEAD 3333
detached

worktree /tmp/gone
HEAD 4444
branch refs/heads/feature/x
prunable gitdir file points to non-existent location
`);

  assert.deepEqual(parsed, [
    { path: "/repo", head: "1111", branch: "main", locked: null, prunable: false },
    {
      path: "/repo/.claude/worktrees/agent-1",
      head: "2222",
      branch: "worktree-agent-1",
      locked: "claude agent agent-1 (pid 123)",
      prunable: false,
    },
    { path: "/repo/.claude/worktrees/agent-2", head: "3333", branch: null, locked: null, prunable: false },
    { path: "/tmp/gone", head: "4444", branch: "feature/x", locked: null, prunable: true },
  ]);
});

test("a bare `locked` line still reads as locked", () => {
  const [, entry] = parseWorktreeList(
    "worktree /repo\nHEAD 1\nbranch refs/heads/main\n\nworktree /w\nHEAD 2\nbranch refs/heads/b\nlocked\n",
  );
  assert.equal(entry.locked, "");
});

test("joinListeners ties each listener to its cwd and dedupes IPv4/IPv6 ports", () => {
  const listeners = joinListeners(
    "p501\ncnode\nf20\nn*:3101\nf21\nn[::1]:3101\np502\ncpostgres\nf5\nn127.0.0.1:5432\n",
    "p501\nfcwd\nn/repo/.claude/worktrees/agent-1\np502\nfcwd\nn/\n",
  );
  assert.deepEqual(listeners, [
    { pid: 501, command: "node", ports: [3101], cwd: "/repo/.claude/worktrees/agent-1" },
    { pid: 502, command: "postgres", ports: [5432], cwd: "/" },
  ]);
});

test("work outside the base outranks the mechanical blockers", () => {
  const server = { pid: 1, command: "node", ports: [3101], cwd: `${ROOT}/.claude/worktrees/agent-1` };
  assert.equal(worktreeVerdict(worktree({ dirty: [" M a.ts"], ahead: 2, locked: "" })), "dirty");
  assert.equal(worktreeVerdict(worktree({ ahead: 2, listeners: [server] })), "unmerged");
  assert.equal(worktreeVerdict(worktree({ listeners: [server], locked: "" })), "busy");
  assert.equal(worktreeVerdict(worktree({ locked: "" })), "locked");
  assert.equal(worktreeVerdict(worktree()), "removable");
});

test("a prunable worktree only needs a prune, whatever git last knew about it", () => {
  assert.equal(worktreeVerdict(worktree({ prunable: true, ahead: 3 })), "prunable");
});

test("branch verdicts: long-lived and parked are left alone, worktree branches are handled there", () => {
  assert.equal(branchVerdict({ name: "main", ahead: 0, worktreePath: ROOT }, OPTIONS), "base");
  assert.equal(branchVerdict({ name: "production", ahead: 5, worktreePath: null }, OPTIONS), "base");
  assert.equal(branchVerdict({ name: "trunk", ahead: 0, worktreePath: null }, { ...OPTIONS, base: "trunk" }), "base");
  assert.equal(branchVerdict({ name: "accantonato/login-b", ahead: 4, worktreePath: null }, OPTIONS), "parked");
  assert.equal(
    branchVerdict({ name: "wip/old", ahead: 4, worktreePath: null }, { ...OPTIONS, parked: ["wip/"] }),
    "parked",
  );
  assert.equal(branchVerdict({ name: "worktree-agent-1", ahead: 1, worktreePath: "/w" }, OPTIONS), "in-worktree");
  assert.equal(branchVerdict({ name: "integrazione", ahead: 1, worktreePath: null }, OPTIONS), "unmerged");
  assert.equal(branchVerdict({ name: "integrazione", ahead: 0, worktreePath: null }, OPTIONS), "merged");
});

test("a clean repo renders as nothing to fix", () => {
  const { text, attention } = renderReport(report());
  assert.equal(attention, 0);
  assert.match(text, /✓ niente da sistemare$/);
});

test("removable worktrees and merged leftovers come with their command and do not count as attention", () => {
  const { text, attention } = renderReport(
    report({
      worktrees: [worktree()],
      branches: [{ name: "old-integration", ahead: 0, worktreePath: null }],
    }),
  );
  assert.equal(attention, 0);
  assert.match(text, /git worktree remove \/repo\/\.claude\/worktrees\/agent-1 && git branch -d worktree-agent-1/);
  assert.match(text, /git branch -d old-integration/);
});

test("each blocker counts once, and AGENTS.md gets the next dev hint", () => {
  const { text, attention } = renderReport(
    report({
      mainBranch: "integrazione",
      mainDirty: [" M AGENTS.md", " M src/a.ts"],
      worktrees: [worktree({ ahead: 2 })],
      branches: [{ name: "feature/x", ahead: 1, worktreePath: null }],
    }),
  );
  // not on main, dirty main checkout, unmerged worktree, unmerged branch
  assert.equal(attention, 4);
  assert.match(text, /AGENTS\.md {3}\(se è il blocco riscritto da next dev/);
  assert.match(text, /⚠ 4 cose da guardare$/);
});

test("a server still running inside a worktree is listed with its pid", () => {
  const { text } = renderReport(
    report({
      worktrees: [
        worktree({
          listeners: [{ pid: 4242, command: "node", ports: [3101], cwd: `${ROOT}/.claude/worktrees/agent-1` }],
        }),
      ],
    }),
  );
  assert.match(text, /processo in ascolto dentro/);
  assert.match(text, /pid 4242 node su 3101 \(kill 4242\)/);
});

test("the report names the base it was given", () => {
  const { text } = renderReport(
    report({ base: "master", mainBranch: "master", sync: { ahead: 2, behind: 0, fetched: false } }),
  );
  assert.match(text, /master: 2 avanti, 0 indietro rispetto a origin\/master \(senza fetch/);
});
