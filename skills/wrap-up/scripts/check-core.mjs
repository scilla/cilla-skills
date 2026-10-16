// @ts-check
// Pure part of the `/wrap-up` report: parsing git and lsof output, deciding
// what each worktree and branch needs, rendering the report. No IO, so the
// verdicts are testable on their own (`check-core.test.mjs`); the shell that
// runs git and lsof is `check.mjs`.

/**
 * @typedef {object} Args
 * @property {boolean} fetch
 * @property {string | null} since
 * @property {string | null} base
 * @property {string[]} parked Prefixes beyond `DEFAULT_PARKED`.
 */

/**
 * Parses `check.mjs`'s arguments. Throws on an unknown flag or a missing
 * value, so that `--since --fetch` does not read `--fetch` as the sha.
 * @param {string[]} argv
 * @returns {Args}
 */
export function parseArgs(argv) {
  /** @type {Args} */
  const args = { fetch: false, since: null, base: null, parked: [] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--fetch") {
      args.fetch = true;
      continue;
    }
    if (!["--since", "--base", "--parked"].includes(flag)) throw new Error(`unknown argument: ${flag}`);
    const value = argv[++i];
    if (value === undefined || value.startsWith("-")) throw new Error(`${flag} needs a value`);
    if (flag === "--since") args.since = value;
    else if (flag === "--base") args.base = value;
    else args.parked.push(value);
  }
  return args;
}

/**
 * @typedef {object} Worktree
 * @property {string} path
 * @property {string} head
 * @property {string | null} branch Short name; null on a detached HEAD.
 * @property {string | null} locked Lock reason ("" when locked without one); null when not locked.
 * @property {boolean} prunable The directory is gone: only `git worktree prune` is left.
 */

/**
 * Parses `git worktree list --porcelain`. The first entry is the main checkout.
 * @param {string} porcelain
 * @returns {Worktree[]}
 */
export function parseWorktreeList(porcelain) {
  return porcelain
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").filter(Boolean))
    .filter((lines) => lines.length > 0 && lines[0].startsWith("worktree "))
    .map((lines) => {
      /** @type {Worktree} */
      const worktree = {
        path: lines[0].slice("worktree ".length),
        head: "",
        branch: null,
        locked: null,
        prunable: false,
      };
      for (const line of lines.slice(1)) {
        const [key, ...rest] = line.split(" ");
        const value = rest.join(" ");
        if (key === "HEAD") worktree.head = value;
        if (key === "branch") worktree.branch = value.replace(/^refs\/heads\//, "");
        if (key === "locked") worktree.locked = value;
        if (key === "prunable") worktree.prunable = true;
      }
      return worktree;
    });
}

/**
 * Parses `lsof -F` output (`p<pid>`, `c<command>`, `n<name>` lines).
 * @param {string} output
 * @returns {{ pid: number; command: string; names: string[] }[]}
 */
export function parseLsofFields(output) {
  /** @type {{ pid: number; command: string; names: string[] }[]} */
  const processes = [];
  for (const line of output.split("\n")) {
    const field = line[0];
    const value = line.slice(1);
    if (field === "p") processes.push({ pid: Number(value), command: "", names: [] });
    const current = processes.at(-1);
    if (!current) continue;
    if (field === "c") current.command = value;
    if (field === "n") current.names.push(value);
  }
  return processes;
}

/** @typedef {{ pid: number; command: string; ports: number[]; cwd: string }} Listener */

/**
 * Joins the TCP listeners (`lsof -iTCP -sTCP:LISTEN -Fpcn`) with their working
 * directories (`lsof -d cwd -Fpn`). A listener belongs to the worktree its cwd
 * is inside: an agent's dev server or `next start` keeps running from there
 * after the agent is done, and blocks the worktree's removal.
 * @param {string} listenOutput
 * @param {string} cwdOutput
 * @returns {Listener[]}
 */
export function joinListeners(listenOutput, cwdOutput) {
  const cwds = new Map(parseLsofFields(cwdOutput).map((p) => [p.pid, p.names[0] ?? ""]));
  return parseLsofFields(listenOutput).map((p) => ({
    pid: p.pid,
    command: p.command,
    ports: [
      ...new Set(
        p.names
          .map((name) => Number(name.match(/:(\d+)$/)?.[1]))
          .filter((port) => Number.isInteger(port)),
      ),
    ],
    cwd: cwds.get(p.pid) ?? "",
  }));
}

/**
 * @param {string} path
 * @param {string} dir
 */
export function isInside(path, dir) {
  return path === dir || path.startsWith(`${dir}/`);
}

/**
 * @typedef {Worktree & { dirty: string[]; ahead: number; listeners: Listener[] }} WorktreeFacts
 * `dirty` holds `git status --porcelain` lines; `ahead` counts the commits on
 * the worktree's HEAD that the base branch does not contain.
 */

/** @typedef {"prunable" | "dirty" | "unmerged" | "busy" | "locked" | "removable"} WorktreeVerdict */

/**
 * What a worktree needs before it can go, first blocker wins: work that is
 * not in the base branch (dirty, unmerged) outranks the mechanical blockers
 * (a server still running, a lock), because removing it would lose that work.
 * @param {WorktreeFacts} worktree
 * @returns {WorktreeVerdict}
 */
export function worktreeVerdict(worktree) {
  if (worktree.prunable) return "prunable";
  if (worktree.dirty.length > 0) return "dirty";
  if (worktree.ahead > 0) return "unmerged";
  if (worktree.listeners.length > 0) return "busy";
  if (worktree.locked !== null) return "locked";
  return "removable";
}

/** Long-lived branches: never cleanup, whatever they hold. */
export const LONG_LIVED = ["main", "master", "production", "staging", "develop"];
/** Branches parked on purpose; `--parked <prefix>` adds more. */
export const DEFAULT_PARKED = ["parked/"];

/** @typedef {{ name: string; ahead: number; worktreePath: string | null }} BranchFacts */
/** @typedef {"base" | "parked" | "in-worktree" | "unmerged" | "merged"} BranchVerdict */

/**
 * @param {BranchFacts} branch
 * @param {{ base: string; parked: string[] }} options
 * @returns {BranchVerdict}
 */
export function branchVerdict(branch, { base, parked }) {
  if (branch.name === base || LONG_LIVED.includes(branch.name)) return "base";
  if (parked.some((prefix) => branch.name.startsWith(prefix))) return "parked";
  if (branch.worktreePath !== null) return "in-worktree";
  return branch.ahead > 0 ? "unmerged" : "merged";
}

/**
 * @typedef {object} Report
 * @property {string} mainPath
 * @property {string} base The branch work must reach (usually `main`).
 * @property {string[]} parked
 * @property {string | null} mainBranch Checked out in the main checkout; null when detached.
 * @property {string[]} mainDirty
 * @property {{ ahead: number; behind: number; fetched: boolean } | null} sync Base against `origin/<base>`; null without one.
 * @property {WorktreeFacts[]} worktrees Every worktree except the main checkout.
 * @property {BranchFacts[]} branches
 * @property {{ since: string; commits: string[] } | null} session Present with `--since <sha>`.
 */

/**
 * @param {WorktreeFacts} worktree
 * @param {Report} report
 * @returns {string[]}
 */
function worktreeLines(worktree, report) {
  const where = worktree.path.startsWith(`${report.mainPath}/`)
    ? worktree.path.slice(report.mainPath.length + 1)
    : worktree.path;
  const name = `${where} [${worktree.branch ?? `detached ${worktree.head.slice(0, 8)}`}]`;
  const lines = (() => {
    switch (worktreeVerdict(worktree)) {
      case "prunable":
        return [`⚠ missing directory  ${name}`, "    git worktree prune"];
      case "dirty":
        return [
          `⚠ uncommitted changes  ${name}`,
          ...worktree.dirty.map((line) => `    ${line}`),
        ];
      case "unmerged":
        return [`⚠ ${worktree.ahead} commit(s) not in ${report.base}  ${name}`];
      case "busy":
        return [`⚠ listening process inside  ${name}`];
      case "locked":
        return [
          `⚠ locked${worktree.locked ? ` (${worktree.locked})` : ""}, merged and clean  ${name}`,
          `    git worktree remove -f -f ${worktree.path}  (once confirmed)`,
        ];
      case "removable":
        return [
          `· removable: merged and clean  ${name}`,
          `    git worktree remove ${worktree.path}${worktree.branch ? ` && git branch -d ${worktree.branch}` : ""}`,
        ];
    }
  })();
  for (const l of worktree.listeners) {
    lines.push(`    pid ${l.pid} ${l.command} on ${l.ports.join(", ") || "?"} (kill ${l.pid})`);
  }
  return lines;
}

/**
 * @param {BranchFacts} branch
 * @param {Report} report
 * @returns {string | null}
 */
function branchLine(branch, report) {
  switch (branchVerdict(branch, report)) {
    case "base":
    case "in-worktree":
      return null;
    case "parked":
      return `· parked, left alone: ${branch.name}`;
    case "unmerged":
      return `⚠ ${branch.ahead} commit(s) not in ${report.base}: ${branch.name}`;
    case "merged":
      return `· merged, left over: ${branch.name}    git branch -d ${branch.name}`;
  }
}

/**
 * Renders the report. `attention` counts the `⚠` lines, the ones that need
 * an action; `·` lines are informational, or cleanup with a ready command.
 * @param {Report} report
 * @returns {{ text: string; attention: number }}
 */
export function renderReport(report) {
  const { base } = report;
  const out = ["wrap-up: end-of-session check (read-only)", ""];

  out.push(`Main checkout  ${report.mainPath} on ${report.mainBranch ?? "detached HEAD"}`);
  if (report.mainBranch !== base) out.push(`  ⚠ not on ${base}`);
  if (report.mainDirty.length === 0) out.push("  ✓ clean");
  else {
    out.push(`  ⚠ ${report.mainDirty.length} uncommitted file${report.mainDirty.length === 1 ? "" : "s"}`);
    out.push(...report.mainDirty.map((line) => `    ${line}`));
  }
  if (report.sync === null) out.push(`  · no origin/${base}`);
  else {
    const { ahead, behind, fetched } = report.sync;
    const freshness = fetched ? "" : " (not fetched: --fetch for fresh data)";
    out.push(
      ahead === 0 && behind === 0
        ? `  ✓ ${base} in sync with origin/${base}${freshness}`
        : `  · ${base}: ${ahead} ahead, ${behind} behind origin/${base}${freshness}`,
    );
  }

  out.push("", `Worktrees (${report.worktrees.length})`);
  if (report.worktrees.length === 0) out.push("  ✓ none besides the main checkout");
  for (const worktree of report.worktrees) {
    out.push(...worktreeLines(worktree, report).map((line) => `  ${line}`));
  }

  const branchLines = report.branches
    .map((branch) => branchLine(branch, report))
    .filter((line) => line !== null);
  out.push("", "Local branches outside worktrees");
  if (branchLines.length === 0) out.push("  ✓ nothing to fix");
  out.push(...branchLines.map((line) => `  ${line}`));

  if (report.session) {
    const { since, commits } = report.session;
    out.push("", `Commits on ${base} since ${since.slice(0, 8)} (${commits.length}, other sessions' included)`);
    out.push(...commits.map((line) => `  ${line}`));
  }

  const attention = out.filter((line) => line.trimStart().startsWith("⚠")).length;
  const verdict =
    attention === 0 ? "✓ nothing to fix" : `⚠ ${attention} item${attention === 1 ? "" : "s"} to look at`;
  return { text: `${out.join("\n")}\n\n${verdict}`, attention };
}
