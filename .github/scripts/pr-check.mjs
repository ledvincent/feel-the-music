#!/usr/bin/env node
// pr-check.mjs: checks on a pull request that closing a change was not skipped: the OKF retro
// is answered, a finished OpenSpec change is archived, verified and proven by its tests, and a
// big change's proposal was approved before its code.
// Part of dirox-kit 1.13.0. /dirox-kit:setup-project copies it into projects as
// .github/scripts/pr-check.mjs and replaces it on later runs: do not edit the copy.
// No dependencies: Node 20 or later. Run by .github/workflows/dirox-checks.yml on pull requests,
// so it holds whether or not /dirox-kit:close-change or /dirox-kit:review-pr were run.
//
// Environment:
//   PR_BODY         the PR description
//   PR_AUTHOR_TYPE  "Bot" skips every check (dependency bots do not fill the template)
//   BASE_REF        the base to compare with (for example origin/main). In CI it can stay
//                   unset: the checkout is the PR's merge commit, compared with its first parent.
//                   Check 8 reads the history: check out with fetch-depth 0.
// Local run: PR_BODY="$(gh pr view --json body -q .body)" BASE_REF=origin/main node pr-check.mjs
// Exit code: 0 = no errors (warnings allowed), 1 = errors, 2 = bad usage.
//
// Errors:
//   1. The description's "## Knowledge" section is missing or empty, says "No OKF change" with
//      no reason, or the PR changes nothing in okf/ and the section does not say
//      "No OKF change: <reason>" (so "n/a" is not an answer).
//   2. A change archived by this PR marks more decisions "Decision record needed" in its
//      design.md than okf/decisions/ files link to it, plus "No decision record: <reason>"
//      lines in the Knowledge section. "No decision record needed" is not a mark.
//   3. An OpenSpec change this PR touches is still open (openspec/changes/<name>/, not archive/)
//      although every task in its tasks.md is ticked: the work is done but was never archived,
//      so openspec/specs/ would not get its behaviour.
//   5. A change archived by this PR (the kickoff aside) has no verification.md, its verification
//      lists blocking findings, or a scenario of its specs is missing from the verification.
//   6. A Proof task of a change archived by this PR ("Test `<scenario>` in `<file>`") names a
//      test file that does not exist, or that does not contain the scenario's name (compared
//      without case, spaces or punctuation, so test_order_total_rounds_up matches
//      "Order total rounds up").
//   7. A big change's proposal is added in the same PR as code: the proposal is approved and
//      merged in its own PR first. Code is any file outside openspec/, okf/, .claude/, .github/
//      and Markdown files.
// Warnings:
//   4. The PR touches structural paths (schema, dependencies, deployment, env files) and changes
//      nothing in okf/. The paths come from .github/okf-triggers.json when it exists
//      ({"okf/data/": ["**/migrations/**"], ...}, replacing the defaults below).
//   8. A spec this PR changes loses lines that another change added after this PR's change
//      started (git blame on the base): archiving may have dropped them. A warning, because
//      a deliberate rewording looks the same.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DEFAULT_TRIGGERS = {
  "okf/data/": ["**/migrations/**", "**/alembic/**", "**/*.prisma", "**/schema.sql", "**/schema.rb"],
  "okf/architecture/": [
    "**/package.json", "**/requirements*.txt", "**/pyproject.toml", "**/go.mod", "**/Cargo.toml",
    "**/Gemfile", "**/pom.xml", "**/build.gradle*", "**/composer.json",
  ],
  "okf/runbooks/": [
    "**/Dockerfile*", "**/docker-compose*.y*ml", "**/compose.y*ml", "infra/**", "terraform/**", "**/*.tf",
    "k8s/**", "helm/**", "Procfile", "fly.toml", "vercel.json", "netlify.toml", ".github/workflows/**",
  ],
  "okf/integrations/": ["**/.env.example", "**/.env.sample", "**/.env.template"],
};
// Kit-owned files: updating the kit must not ask for an OKF change.
const IGNORED = [".github/workflows/dirox-checks.yml", ".github/scripts/**"];

const inActions = Boolean(process.env.GITHUB_ACTIONS);
let errors = 0;
let warnings = 0;
function report(level, msg, title = "OKF retro") {
  if (level === "error") errors++;
  else warnings++;
  console.log(inActions ? `::${level} title=${title}::${msg}` : `${level === "error" ? "ERROR" : "WARN "} ${msg}`);
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") { re += "(?:.*/)?"; i += 2; } else { re += ".*"; i += 1; }
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}
const matchesAny = (file, globs) => globs.some((g) => globToRegExp(g).test(file));

// The Knowledge section of the PR description, without HTML comments; null when absent.
function knowledgeSection(body) {
  const lines = body.replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const start = lines.findIndex((l) => /^##\s+Knowledge\b/i.test(l.trim()));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^#{1,2}\s/.test(l.trim()));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join("\n").trim();
}

// The base the PR merges into, and the PR's own head.
function commits() {
  if (process.env.BASE_REF) return { base: git("merge-base", process.env.BASE_REF, "HEAD"), head: git("rev-parse", "HEAD") };
  const parents = git("rev-list", "--parents", "-n", "1", "HEAD").split(" ");
  if (parents.length === 3) return { base: parents[1], head: parents[2] };
  console.error("pr-check: HEAD is not a merge commit; set BASE_REF (for example origin/main)");
  process.exit(2);
}

// The change ID of an archive folder: <id>-<date>, or <date>-<id> before kit 1.4.0.
const changeId = (dir) => dir.replace(/-\d{4}-\d{2}-\d{2}$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
// Text compared without case, spaces or punctuation.
const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function specScenarios(dir) {
  const out = [];
  const walkSpecs = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walkSpecs(p);
      else if (e.name === "spec.md") {
        for (const m of fs.readFileSync(p, "utf8").matchAll(/^####\s+Scenario:\s*(.+?)\s*$/gm)) out.push(m[1]);
      }
    }
  };
  walkSpecs(path.join(dir, "specs"));
  return out;
}

function isAncestor(a, b) {
  try { execFileSync("git", ["merge-base", "--is-ancestor", a, b], { stdio: "ignore" }); return true; } catch { return false; }
}

if (process.env.PR_AUTHOR_TYPE === "Bot") {
  console.log("pr-check: PR opened by a bot, skipped");
  process.exit(0);
}
if (process.env.PR_BODY === undefined) {
  console.error("pr-check: PR_BODY is not set (the PR description)");
  process.exit(2);
}

const { base, head } = commits();
const changed = git("diff", "--name-status", "--no-renames", base, "HEAD")
  .split("\n").filter(Boolean)
  .map((line) => { const [status, file] = line.split("\t"); return { status, file }; });
const okfChanged = changed.some((c) => c.file.startsWith("okf/"));
const knowledge = knowledgeSection(process.env.PR_BODY);

// 1. The Knowledge section is answered.
// /dirox-kit:close-change writes this section; the messages say what to put there by hand.
if (knowledge === null) {
  report("error", 'The PR description has no "## Knowledge" section. Run /dirox-kit:close-change, or add the section from .github/pull_request_template.md.');
} else if (!knowledge) {
  report("error", 'The "Knowledge" section of the PR description is empty. Name the okf/ files this PR adds or changes, or write "No OKF change: <why>".');
} else {
  const none = knowledge.match(/No OKF change\b\s*:?\s*(.*)/i);
  if (none && !none[1].replace(/<reason>/i, "").trim()) {
    report("error", 'Say why there is no OKF change: "No OKF change: <why>".');
  } else if (!none && !okfChanged) {
    report("error", 'This PR changes nothing in okf/, so the "Knowledge" section must say "No OKF change: <why>".');
  }
  if (none && okfChanged) {
    report("warning", 'The description says "No OKF change" but the PR changes files in okf/. List them in the Knowledge section.');
  }
}

// 2. Every "Decision record needed" in a change archived by this PR is recorded or excused.
const excused = (knowledge || "").split("\n").filter((l) => /No decision record\s*:\s*\S/i.test(l)).length;
let neededTotal = 0;
let missingTotal = 0;
const missingIn = [];
const decisionsDir = "okf/decisions";
const decisions = fs.existsSync(decisionsDir)
  ? fs.readdirSync(decisionsDir).filter((f) => f.endsWith(".md") && f !== "index.md")
    .map((f) => fs.readFileSync(path.join(decisionsDir, f), "utf8"))
  : [];
for (const { status, file } of changed) {
  const m = file.match(/^openspec\/changes\/archive\/([^/]+)\/design\.md$/);
  if (status !== "A" || !m || !fs.existsSync(file)) continue;
  // "No decision record needed" is not a mark.
  const needed = (fs.readFileSync(file, "utf8").match(/(?<!\bno\s+)Decision record needed/gi) || []).length;
  if (!needed) continue;
  const dir = m[1];
  const id = changeId(dir);
  const recorded = decisions.filter((d) => d.includes(`openspec/changes/archive/${dir}`) || d.includes(`openspec/changes/${id}/`)).length;
  neededTotal += needed;
  if (recorded < needed) { missingTotal += needed - recorded; missingIn.push(`${dir} (${needed} marked, ${recorded} recorded)`); }
}
if (missingTotal > excused) {
  report("error", `Some decisions marked "Decision record needed" have no file in okf/decisions/: ${missingIn.join(", ")}. /dirox-kit:close-change records them. To leave one out, add a line "No decision record: <decision> - <why>" to the Knowledge section.`, "Decision not recorded");
}

// 3. A finished change that this PR touches is archived.
const openChanges = new Set(changed
  .map((c) => c.file.match(/^openspec\/changes\/([^/]+)\//))
  .filter((m) => m && m[1] !== "archive")
  .map((m) => m[1]));
for (const name of openChanges) {
  const tasks = path.join("openspec/changes", name, "tasks.md");
  if (!fs.existsSync(tasks)) continue;
  const text = fs.readFileSync(tasks, "utf8");
  const open = (text.match(/^\s*[-*]\s+\[ \]/gm) || []).length;
  const done = (text.match(/^\s*[-*]\s+\[[xX]\]/gm) || []).length;
  if (done && !open) {
    report("error", `Every task in openspec/changes/${name}/ is done, but the change was never closed, so the main specs miss it. Run /dirox-kit:close-change.`, "Change not closed");
  }
}

// 4. Structural paths changed with nothing in okf/.
if (!okfChanged) {
  let triggers = DEFAULT_TRIGGERS;
  const custom = ".github/okf-triggers.json";
  if (fs.existsSync(custom)) {
    try { triggers = JSON.parse(fs.readFileSync(custom, "utf8")); } catch (e) {
      report("warning", `${custom} is not valid JSON (${e.message}); using the defaults`);
    }
  }
  const files = changed.map((c) => c.file).filter((f) => !matchesAny(f, IGNORED));
  for (const [folder, globs] of Object.entries(triggers)) {
    const hits = files.filter((f) => matchesAny(f, globs));
    if (!hits.length) continue;
    const shown = hits.slice(0, 3).join(", ") + (hits.length > 3 ? ` and ${hits.length - 3} more` : "");
    report("warning", `This PR changes ${shown} and nothing in okf/. Check whether ${folder} needs an update.`);
  }
}

// Changes this PR archives (the kickoff writes no code, so it has no verification or proof).
const archived = [...new Set(changed
  .filter((c) => c.status === "A")
  .map((c) => c.file.match(/^openspec\/changes\/archive\/([^/]+)\//))
  .filter(Boolean)
  .map((m) => m[1]))]
  .filter((dir) => !changeId(dir).endsWith("-kickoff"));

for (const dir of archived) {
  const root = path.join("openspec/changes/archive", dir);
  const id = changeId(dir);
  const scenarios = specScenarios(root);
  if (!scenarios.length) continue;

  // 5. Verified, with no blocking findings, against every scenario.
  const vfile = path.join(root, "verification.md");
  if (!fs.existsSync(vfile)) {
    report("error", `${id} was closed without being verified. Run /dirox-kit:verify, then /dirox-kit:close-change again.`, "Not verified");
  } else {
    const v = fs.readFileSync(vfile, "utf8").replace(/\r\n?/g, "\n");
    const blocking = (v.match(/(?<![-\w])Blocking findings:[ \t]*\n([\s\S]*?)(?=\n\s*Non-blocking findings:|$)/i) || [])[1] || "";
    const open = blocking.split("\n").map((l) => l.replace(/^\s*[-*]\s*/, "").trim()).filter((l) => l && !/^none\.?$/i.test(l));
    if (open.length) report("error", `${id}: the verification still lists blocking findings (${open.length}). Fix them and run /dirox-kit:verify again.`, "Not verified");
    const vs = squash(v);
    const missing = scenarios.filter((s) => !vs.includes(squash(s)));
    if (missing.length) report("error", `${id}: the verification does not cover ${missing.map((s) => `"${s}"`).join(", ")} (added after it ran?). Run /dirox-kit:verify again.`, "Not verified");
  }

  // 6. Each Proof task's test file exists and names the scenario.
  const tasksFile = path.join(root, "tasks.md");
  if (fs.existsSync(tasksFile)) {
    const unproven = [];
    for (const m of fs.readFileSync(tasksFile, "utf8").matchAll(/Test\s+`([^`]+)`\s+in\s+`([^`]+)`/g)) {
      const file = m[2].replace(/::.*$/, "").replace(/:\d+$/, "");
      if (!fs.existsSync(file)) unproven.push(`"${m[1]}" (${file} does not exist)`);
      else if (!squash(fs.readFileSync(file, "utf8")).includes(squash(m[1]))) unproven.push(`"${m[1]}" (not found in ${file})`);
    }
    if (unproven.length) report("error", `${id}: no test proves ${unproven.join(", ")}. Each scenario needs a test whose name contains it, in the file its Proof task names.`, "Scenario not proven");
  }
}

// 7. A big change's proposal goes in its own PR, before the code.
const NOT_CODE = ["openspec/**", "okf/**", ".claude/**", ".github/**", "**/*.md"];
const code = changed.map((c) => c.file).filter((f) => !matchesAny(f, NOT_CODE));
if (code.length) {
  for (const { status, file } of changed) {
    const m = file.match(/^openspec\/changes\/(?:archive\/)?([^/]+)\/proposal\.md$/);
    if (status !== "A" || !m || !fs.existsSync(file)) continue;
    const id = changeId(m[1]);
    if (id.endsWith("-kickoff") || !/^Size:\s*big\b/im.test(fs.readFileSync(file, "utf8"))) continue;
    let merged = true;
    try { execFileSync("git", ["cat-file", "-e", `${base}:openspec/changes/${id}/proposal.md`], { stdio: "ignore" }); } catch { merged = false; }
    if (!merged) report("error", `${id} is a big change, so its proposal must be approved and merged in its own PR before the code. Move the code to a separate PR.`, "Big change");
  }
}

// 8. Spec lines another change added after this one started, removed by this PR.
for (const dir of archived) {
  const id = changeId(dir);
  const starts = git("log", "--format=%H", "--diff-filter=A", head, "--", `openspec/changes/${id}/proposal.md`).split("\n").filter(Boolean);
  if (!starts.length) continue;
  const start = starts[starts.length - 1];
  for (const { status, file } of changed) {
    if (status !== "M" || !/^openspec\/specs\/[^/]+\/spec\.md$/.test(file)) continue;
    const dropped = [];
    for (const h of git("diff", "-U0", base, "HEAD", "--", file).matchAll(/^@@ -(\d+)(?:,(\d+))? /gm)) {
      const from = Number(h[1]), count = h[2] === undefined ? 1 : Number(h[2]);
      if (!count) continue;
      for (const line of git("blame", "-l", "-s", "-L", `${from},+${count}`, base, "--", file).split("\n")) {
        const b = line.match(/^\^?([0-9a-f]{40})\s+\d+\)\s?(.*)$/);
        if (b && b[2].trim() && !isAncestor(b[1], start)) dropped.push(b[2].trim());
      }
    }
    if (dropped.length) {
      const shown = dropped.slice(0, 3).map((l) => `"${l.slice(0, 80)}"`).join(", ") + (dropped.length > 3 ? ` and ${dropped.length - 3} more` : "");
      report("warning", `${file} loses lines another change added after ${id} started: ${shown}. If they were not meant to go, add them back to ${id}'s spec.`, "Spec lines dropped");
    }
  }
}

console.log(`pr-check: ${changed.length} file(s) changed, ${neededTotal} decision(s) to record, ${archived.length} change(s) closed, ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
