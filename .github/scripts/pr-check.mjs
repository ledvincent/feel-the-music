#!/usr/bin/env node
// pr-check.mjs: checks on a pull request that closing a change was not skipped: the OKF retro
// is answered and a finished OpenSpec change is archived.
// Part of dirox-kit 1.9.0. /dirox-kit:setup-project copies it into projects as
// .github/scripts/pr-check.mjs and replaces it on later runs: do not edit the copy.
// No dependencies: Node 20 or later. Run by .github/workflows/dirox-checks.yml on pull requests,
// so it holds whether or not /dirox-kit:close-change or /dirox-kit:review-pr were run.
//
// Environment:
//   PR_BODY         the PR description
//   PR_AUTHOR_TYPE  "Bot" skips every check (dependency bots do not fill the template)
//   BASE_REF        the base to compare with (for example origin/main). In CI it can stay
//                   unset: the checkout is the PR's merge commit, compared with its first parent.
// Local run: PR_BODY="$(gh pr view --json body -q .body)" BASE_REF=origin/main node pr-check.mjs
// Exit code: 0 = no errors (warnings allowed), 1 = errors, 2 = bad usage.
//
// Errors:
//   1. The description's "## Knowledge" section is missing or empty, or says "No OKF change"
//      with no reason.
//   2. A change archived by this PR marks more decisions "Decision record needed" in its
//      design.md than okf/decisions/ files link to it, plus "No decision record: <reason>"
//      lines in the Knowledge section.
//   3. An OpenSpec change this PR touches is still open (openspec/changes/<name>/, not archive/)
//      although every task in its tasks.md is ticked: the work is done but was never archived,
//      so openspec/specs/ would not get its behaviour.
// Warning:
//   4. The PR touches structural paths (schema, dependencies, deployment, env files) and changes
//      nothing in okf/. The paths come from .github/okf-triggers.json when it exists
//      ({"okf/data/": ["**/migrations/**"], ...}, replacing the defaults below).

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

function baseCommit() {
  if (process.env.BASE_REF) return git("merge-base", process.env.BASE_REF, "HEAD");
  const parents = git("rev-list", "--parents", "-n", "1", "HEAD").split(" ");
  if (parents.length === 3) return parents[1];
  console.error("pr-check: HEAD is not a merge commit; set BASE_REF (for example origin/main)");
  process.exit(2);
}

if (process.env.PR_AUTHOR_TYPE === "Bot") {
  console.log("pr-check: PR opened by a bot, skipped");
  process.exit(0);
}
if (process.env.PR_BODY === undefined) {
  console.error("pr-check: PR_BODY is not set (the PR description)");
  process.exit(2);
}

const base = baseCommit();
const changed = git("diff", "--name-status", "--no-renames", base, "HEAD")
  .split("\n").filter(Boolean)
  .map((line) => { const [status, file] = line.split("\t"); return { status, file }; });
const okfChanged = changed.some((c) => c.file.startsWith("okf/"));
const knowledge = knowledgeSection(process.env.PR_BODY);

// 1. The Knowledge section is answered.
if (knowledge === null) {
  report("error", 'The PR description has no "## Knowledge" section (see .github/pull_request_template.md). List the okf/ concepts added, updated or deprecated, or write "No OKF change: <reason>".');
} else if (!knowledge) {
  report("error", 'The "## Knowledge" section of the PR description is empty. List the okf/ concepts added, updated or deprecated, or write "No OKF change: <reason>".');
} else {
  const none = knowledge.match(/No OKF change\b\s*:?\s*(.*)/i);
  if (none && !none[1].replace(/<reason>/i, "").trim()) {
    report("error", '"No OKF change" needs its reason: "No OKF change: <reason>".');
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
  const needed = (fs.readFileSync(file, "utf8").match(/Decision record needed/gi) || []).length;
  if (!needed) continue;
  const dir = m[1];
  const id = dir.replace(/-\d{4}-\d{2}-\d{2}$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const recorded = decisions.filter((d) => d.includes(`openspec/changes/archive/${dir}`) || d.includes(`openspec/changes/${id}/`)).length;
  neededTotal += needed;
  if (recorded < needed) { missingTotal += needed - recorded; missingIn.push(`${dir} (${needed} marked, ${recorded} recorded)`); }
}
if (missingTotal > excused) {
  report("error", `Decisions marked "Decision record needed" are not in okf/decisions/: ${missingIn.join(", ")}. Record them (the OKF retro in /dirox-kit:close-change; each decision links its archived change), or add one "No decision record: <decision> - <reason>" line per decision left out to the Knowledge section.`);
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
    report("error", `openspec/changes/${name}/ has every task done but is not archived, so openspec/specs/ would not get its behaviour. Run /dirox-kit:close-change: it runs the OKF retro and archives the change.`, "Change not closed");
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
    report("warning", `This PR changes ${shown} and nothing in okf/. Check whether ${folder} needs an update; if not, the Knowledge section says why.`);
  }
}

console.log(`pr-check: ${changed.length} file(s) changed, ${neededTotal} decision(s) to record, ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
