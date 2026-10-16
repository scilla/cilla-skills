// Checks every skill in skills/ against the Agent Skills spec
// (https://agentskills.io/specification) and the repo's own conventions.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SKILLS = join(ROOT, "skills");

const skills = readdirSync(SKILLS).filter((name) =>
  statSync(join(SKILLS, name)).isDirectory(),
);

/** Single-line `key: value` pairs between the opening and closing `---`. */
function frontmatter(text) {
  const lines = text.split("\n");
  assert.equal(lines[0], "---", "frontmatter must start on line 1");
  const end = lines.indexOf("---", 1);
  assert.ok(end > 0, "frontmatter has no closing ---");
  const fields = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([a-z-]+):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
  return fields;
}

/** Every Markdown file of the repo outside node_modules. */
function markdownFiles(dir = ROOT) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" || entry.name.startsWith(".") ? [] : markdownFiles(path);
    }
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

test("the repo has skills", () => {
  assert.ok(skills.length > 0);
});

for (const skill of skills) {
  const dir = join(SKILLS, skill);
  const file = join(dir, "SKILL.md");

  test(`${skill}: SKILL.md exists`, () => {
    assert.ok(existsSync(file));
  });

  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");

  test(`${skill}: name follows the spec and matches its folder`, () => {
    const { name } = frontmatter(text);
    assert.equal(name, skill);
    assert.ok(name.length <= 64, "name is longer than 64 characters");
    assert.match(name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.doesNotMatch(name, /anthropic|claude/, "name uses a reserved word");
  });

  test(`${skill}: description is set, short and free of XML tags`, () => {
    const { description = "" } = frontmatter(text);
    assert.ok(description.length > 0, "description is empty");
    assert.ok(description.length <= 1024, `description is ${description.length} characters`);
    assert.doesNotMatch(description, /<\/?[A-Za-z][^>]*>/);
  });

  test(`${skill}: Codex invocation policy matches Claude Code's`, () => {
    const manual = frontmatter(text)["disable-model-invocation"] === "true";
    const yaml = join(dir, "agents", "openai.yaml");
    const codexManual =
      existsSync(yaml) && /allow_implicit_invocation:\s*false/.test(readFileSync(yaml, "utf8"));
    assert.equal(codexManual, manual, "agents/openai.yaml and disable-model-invocation disagree");
  });

  test(`${skill}: relative links resolve`, () => {
    for (const [, target] of text.matchAll(/\]\(([^)#\s]+)\)/g)) {
      if (/^[a-z]+:/.test(target)) continue;
      assert.ok(existsSync(join(dir, target)), `broken link: ${target}`);
    }
  });
}

test("no Markdown file uses an em dash", () => {
  for (const file of markdownFiles()) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      assert.ok(!line.includes("—"), `${file.slice(ROOT.length + 1)}:${i + 1} has an em dash`);
    });
  }
});
