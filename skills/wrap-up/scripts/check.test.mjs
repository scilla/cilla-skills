import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

// End-to-end runs of check.mjs on throwaway repos: the shell around
// check-core.mjs, i.e. arguments, base resolution, origin and fetch.

const CHECK = new URL("./check.mjs", import.meta.url).pathname;
// Hermetic git: no user or system config, a fixed identity.
const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

/** @param {import("node:test").TestContext} t */
function tempDir(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "wrap-up-check-")));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * @param {string} cwd
 * @param {string[]} args
 */
function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, env: ENV, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

/**
 * @param {string} cwd
 * @param {string[]} args
 */
function check(cwd, ...args) {
  const result = spawnSync(process.execPath, [CHECK, ...args], { cwd, env: ENV, encoding: "utf8" });
  return { status: result.status, out: result.stdout, err: result.stderr };
}

/**
 * A repo with one commit on `branch`.
 * @param {import("node:test").TestContext} t
 */
function repo(t, branch = "main") {
  const dir = tempDir(t);
  git(dir, "init", "--quiet", `--initial-branch=${branch}`);
  git(dir, "commit", "--quiet", "--allow-empty", "-m", "init");
  return dir;
}

test("--fetch without an origin remote still prints the report", (t) => {
  const dir = repo(t);
  const { status, out, err } = check(dir, "--fetch");
  assert.equal(status, 0, err);
  assert.equal(err, "");
  assert.match(out, /· no origin\/main/);
  assert.match(out, /✓ nothing to fix$/m);
});

test("a fetch that fails warns and still prints the report", (t) => {
  const dir = repo(t);
  git(dir, "remote", "add", "origin", join(tempDir(t), "missing"));
  const { status, out, err } = check(dir, "--fetch");
  assert.equal(status, 0, err);
  assert.match(err, /git fetch origin main failed/);
  assert.match(out, /· no origin\/main/);
});

test("--fetch refreshes origin, and the report counts both directions", (t) => {
  const origin = tempDir(t);
  git(origin, "init", "--quiet", "--bare", "--initial-branch=main");
  const dir = repo(t);
  git(dir, "remote", "add", "origin", origin);
  git(dir, "push", "--quiet", "origin", "main");

  const other = join(tempDir(t), "other");
  git(origin, "clone", "--quiet", origin, other);
  git(other, "commit", "--quiet", "--allow-empty", "-m", "pushed by someone else");
  git(other, "push", "--quiet", "origin", "main");
  git(dir, "commit", "--quiet", "--allow-empty", "-m", "not pushed yet");

  assert.match(check(dir).out, /· main: 1 ahead, 0 behind origin\/main \(not fetched/);
  const { status, out, err } = check(dir, "--fetch");
  assert.equal(status, 0, err);
  assert.match(out, /· main: 1 ahead, 1 behind origin\/main$/m);
});

test("a flag without its value stops with the usage, before touching git", (t) => {
  const dir = repo(t);
  const { status, out, err } = check(dir, "--since", "--fetch");
  assert.equal(status, 2);
  assert.equal(out, "");
  assert.match(err, /--since needs a value\nusage: /);
});

test("the base falls back to master, and --base overrides it", (t) => {
  const dir = repo(t, "master");
  const fallback = check(dir).out;
  assert.match(fallback, /on master\n {2}✓ clean/);
  assert.doesNotMatch(fallback, /not on/);

  git(dir, "branch", "trunk");
  assert.match(check(dir, "--base", "trunk").out, /⚠ not on trunk/);
});

test("--since lists the base's commits after the given sha", (t) => {
  const dir = repo(t);
  const start = git(dir, "rev-parse", "HEAD");
  git(dir, "commit", "--quiet", "--allow-empty", "-m", "session work");
  assert.match(check(dir, "--since", start).out, /since [0-9a-f]{8} \(1, other sessions' included\)\n {2}[0-9a-f]+ session work/);
});

test("a worktree with commits outside the base is flagged", (t) => {
  const dir = repo(t);
  const path = join(tempDir(t), "feature");
  git(dir, "worktree", "add", "--quiet", "-b", "feature", path);
  git(path, "commit", "--quiet", "--allow-empty", "-m", "feature work");
  const { out } = check(dir);
  assert.match(out, /⚠ 1 commit\(s\) not in main {2}.*feature \[feature\]/);
  assert.match(out, /⚠ 1 item to look at$/m);
});
