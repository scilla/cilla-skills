#!/usr/bin/env node
// @ts-check
// Read-only end-of-session report for the `/wrap-up` skill. Run it from inside
// the repo being closed:
//
//   node check.mjs                    # whole repo
//   node check.mjs --fetch            # refresh origin/<base> first, if there is an origin
//   node check.mjs --since <sha>      # plus the commits on <base> since <sha>
//   node check.mjs --base <branch>    # when <base> is not origin's HEAD
//   node check.mjs --parked <prefix>  # one more parked-branch prefix (repeatable)
//
// It reports every worktree, branch and dirty file of the repo, whoever they
// belong to: telling this session's work from another session's is the
// skill's job. Nothing here writes, except `--fetch` updating origin's ref.
// Verdicts and rendering live in `check-core.mjs`; plain Node, no deps.
import { spawnSync } from "node:child_process";

import {
  DEFAULT_PARKED,
  isInside,
  joinListeners,
  parseArgs,
  parseWorktreeList,
  renderReport,
} from "./check-core.mjs";

const USAGE = "usage: node check.mjs [--fetch] [--since <sha>] [--base <branch>] [--parked <prefix>]...";

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} [cwd]
 */
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  return {
    ok: result.status === 0,
    out: (result.stdout ?? "").trimEnd(),
    err: (result.stderr ?? "").trim(),
  };
}

/**
 * @param {string[]} args
 * @param {string} [cwd]
 */
function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`git ${args.join(" ")} failed: ${(result.stderr ?? "").trim()}`);
    process.exit(2);
  }
  return result.stdout.trimEnd();
}

/** @param {string} output */
const lines = (output) => output.split("\n").filter(Boolean);

const args = (() => {
  try {
    return parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`${error instanceof Error ? error.message : error}\n${USAGE}`);
    process.exit(2);
  }
})();
const { fetch, since } = args;
const parked = [...DEFAULT_PARKED, ...args.parked];

const [main, ...others] = parseWorktreeList(git(["worktree", "list", "--porcelain"]));
const mainPath = main.path;

// The base is what work must reach: --base, else origin's HEAD, else the first
// of main/master that exists.
const originHead = run("git", ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], mainPath);
const resolvedBase =
  args.base ||
  (originHead.ok ? originHead.out.replace(/^origin\//, "") : "") ||
  ["main", "master"].find((name) => run("git", ["rev-parse", "--verify", "--quiet", name], mainPath).ok) ||
  main.branch ||
  "HEAD";

/** @param {string} rev */
const aheadOfBase = (rev) => Number(git(["rev-list", "--count", `${resolvedBase}..${rev}`], mainPath));

// Without an origin remote there is nothing to fetch, and the report says so.
// A failed fetch (offline, base not on origin) keeps the last known
// origin/<base>: the report still comes out, marked as not fetched.
const hasRemote = run("git", ["remote", "get-url", "origin"], mainPath).ok;
const fetched = (() => {
  if (!fetch || !hasRemote) return false;
  const result = run("git", ["fetch", "--quiet", "origin", resolvedBase], mainPath);
  if (!result.ok) {
    console.error(`git fetch origin ${resolvedBase} failed, using the last known origin/${resolvedBase}: ${result.err}`);
  }
  return result.ok;
})();
const hasOrigin = run("git", ["rev-parse", "--verify", "--quiet", `origin/${resolvedBase}`], mainPath).ok;
const sync = hasOrigin
  ? (() => {
      const [ahead, behind] = git(
        ["rev-list", "--left-right", "--count", `${resolvedBase}...origin/${resolvedBase}`],
        mainPath,
      )
        .split(/\s+/)
        .map(Number);
      return { ahead, behind, fetched };
    })()
  : null;

// Every TCP listener with its cwd. `lsof` exits 1 when nothing matches, which
// is not an error here.
const listen = run("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-Fpcn"]).out;
const pids = [...new Set(lines(listen).filter((l) => l.startsWith("p")).map((l) => l.slice(1)))];
const cwd = pids.length > 0 ? run("lsof", ["-a", "-p", pids.join(","), "-d", "cwd", "-Fpn"]).out : "";
const listeners = joinListeners(listen, cwd);

const worktrees = others.map((worktree) => ({
  ...worktree,
  dirty: worktree.prunable ? [] : lines(git(["status", "--porcelain"], worktree.path)),
  ahead: worktree.head && !worktree.prunable ? aheadOfBase(worktree.head) : 0,
  listeners: listeners.filter((listener) => isInside(listener.cwd, worktree.path)),
}));

const checkedOut = new Map(
  [main, ...others].flatMap((worktree) => (worktree.branch ? [[worktree.branch, worktree.path]] : [])),
);
const branches = lines(git(["branch", "--format=%(refname:short)"], mainPath)).map((name) => ({
  name,
  ahead: aheadOfBase(name),
  worktreePath: checkedOut.get(name) ?? null,
}));

const session = since
  ? { since, commits: lines(git(["log", "--format=%h %s", `${since}..${resolvedBase}`], mainPath)) }
  : null;

const { text } = renderReport({
  mainPath,
  base: resolvedBase,
  parked,
  mainBranch: main.branch,
  mainDirty: lines(git(["status", "--porcelain"], mainPath)),
  sync,
  worktrees,
  branches,
  session,
});
console.log(text);
