#!/usr/bin/env node
// test-cases-check.mjs: reads and checks a ticket's test case file, test-cases/<KEY>.md.
// Part of dirox-kit 1.23.0. /dirox-kit:setup-project copies it into projects as
// .github/scripts/test-cases-check.mjs next to pr-check.mjs, which imports it: do not edit the copy.
// No dependencies: Node 20 or later.
//
// The format (written by /dirox-kit:test-cases, edited by QC):
//   ---
//   jira: PROJ-123
//   qc: required | after-merge | none
//   status: draft | validated
//   cap: <capability>            (optional: the Testmo folder the cases are synced into)
//   ---
//   # PROJ-123 · <ticket summary>
//   ## Open questions            (optional)
//   ## PROJ-123-01 · <case title>
//   - Priority: High | Normal
//   - Type: smoke | regression
//   - Proof: automated | manual (<reason>)
//   - Covers: <the acceptance criterion or scenario>
//   - Testmo: <case id>          (optional, once the case is in Testmo)
//   Pre-conditions:              (optional) a list
//   Steps:                       a numbered list, at least one step
//   Expected:                    a list, at least one result
//
// Usage: node test-cases-check.mjs <file>... [--json]
//        node test-cases-check.mjs <file> --since <commit>
//   --since: which edits made since <commit> need the tests checked again (close-change uses it
//   after QC edited the file): an automated case added, an expected result of an automated case
//   changed, or a case switched to automated. Title, Covers, steps and wording elsewhere do not.
//   Prints JSON {reverify: [ids], ignored: [ids]}; exit 0 either way.
// Exit code: 0 = valid, 1 = errors, 2 = bad usage.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const PRIORITIES = ["High", "Normal"];
const TYPES = ["smoke", "regression"];

// Lines of a section ("Steps:") up to the next section label or the end of the case.
function section(lines, label) {
  const start = lines.findIndex((l) => new RegExp(`^\\*{0,2}${label}\\*{0,2}:?\\*{0,2}\\s*$`, "i").test(l.trim()));
  if (start < 0) return null;
  const out = [];
  for (const l of lines.slice(start + 1)) {
    if (/^\*{0,2}(Pre-conditions|Steps|Expected)\*{0,2}:?\*{0,2}\s*$/i.test(l.trim())) break;
    if (/^\s*(\d+[.)]|[-*])\s+\S/.test(l)) out.push(l.replace(/^\s*(\d+[.)]|[-*])\s+/, "").trim());
  }
  return out;
}

export function parseTestCases(text, file = "") {
  const t = text.replace(/\r\n?/g, "\n");
  const front = {};
  const fm = t.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) for (const l of fm[1].split("\n")) {
    const m = l.match(/^([a-z_]+):\s*(.*?)\s*$/i);
    if (m) front[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, "");
  }
  const key = front.jira || path.basename(file, ".md");
  const cases = [];
  const blocks = t.split(/^## /m).slice(1);
  for (const b of blocks) {
    const [head, ...lines] = b.split("\n");
    const m = head.match(/^([A-Z][A-Z0-9]*-\d+-\d+)\s*[·\-–—:|]\s*(.+?)\s*$/);
    if (!m) continue; // "Open questions" and other sections
    const field = (name) => {
      const l = lines.find((x) => new RegExp(`^\\s*[-*]?\\s*\\*{0,2}${name}\\*{0,2}:`, "i").test(x));
      return l ? l.replace(new RegExp(`^\\s*[-*]?\\s*\\*{0,2}${name}\\*{0,2}:\\*{0,2}\\s*`, "i"), "").trim() : "";
    };
    const proof = field("Proof");
    cases.push({
      id: m[1], title: m[2],
      priority: field("Priority"), type: field("Type"),
      proof: /^automated\b/i.test(proof) ? "automated" : /^manual\b/i.test(proof) ? "manual" : proof,
      manualReason: (proof.match(/^manual\s*\(?\s*[-—:]?\s*(.*?)\)?\s*$/i) || [])[1] || "",
      covers: field("Covers"), testmo: field("Testmo"),
      preconditions: section(lines, "Pre-conditions") || [],
      steps: section(lines, "Steps"), expected: section(lines, "Expected"),
    });
  }
  const title = ((t.match(/^# (.+)$/m) || [])[1] || "").replace(/^[A-Z][A-Z0-9]*-\d+\s*[·\-–—:|]\s*/, "").trim();
  return { key, title, cap: front.cap || "", qc: (front.qc || "").toLowerCase(), status: (front.status || "").toLowerCase(), front, cases };
}

export function checkTestCases(text, file = "") {
  const p = parseTestCases(text, file);
  const errors = [];
  const name = path.basename(file || `${p.key}.md`);
  if (!p.front.jira) errors.push(`${name}: the front matter has no "jira:" line.`);
  else if (file && path.basename(file, ".md") !== p.front.jira) errors.push(`${name}: "jira: ${p.front.jira}" does not match the file name.`);
  if (!["required", "after-merge", "none"].includes(p.qc)) errors.push(`${name}: "qc:" must be required, after-merge or none.`);
  if (!["draft", "validated"].includes(p.status)) errors.push(`${name}: "status:" must be draft or validated.`);
  if (!p.cases.length) errors.push(`${name}: no test case (headings "## ${p.key}-01 · <title>").`);
  const seen = new Set();
  for (const c of p.cases) {
    const where = `${name} ${c.id}`;
    if (seen.has(c.id)) errors.push(`${where}: the ID is used twice.`);
    seen.add(c.id);
    if (!c.id.startsWith(`${p.key}-`)) errors.push(`${where}: the ID must start with ${p.key}-.`);
    if (!PRIORITIES.includes(c.priority)) errors.push(`${where}: Priority must be ${PRIORITIES.join(" or ")}.`);
    if (!TYPES.includes(c.type)) errors.push(`${where}: Type must be ${TYPES.join(" or ")}.`);
    if (c.proof !== "automated" && c.proof !== "manual") errors.push(`${where}: Proof must be "automated" or "manual (<reason>)".`);
    if (c.proof === "manual" && !c.manualReason) errors.push(`${where}: a manual case says why: "Proof: manual (<reason>)".`);
    if (!c.covers) errors.push(`${where}: Covers is empty (the criterion or scenario it checks).`);
    if (!c.steps || !c.steps.length) errors.push(`${where}: no steps (a numbered list under "Steps:").`);
    if (!c.expected || !c.expected.length) errors.push(`${where}: no expected result (a list under "Expected:").`);
  }
  return { ...p, errors };
}

// Case IDs whose edits since an older version of the file need the tests checked again.
const norm = (list) => (list || []).map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()).join("|");
export function editsSince(oldText, newText, file = "") {
  const before = Object.fromEntries((oldText ? parseTestCases(oldText, file).cases : []).map((c) => [c.id, c]));
  const reverify = [];
  const ignored = [];
  for (const c of parseTestCases(newText, file).cases) {
    const o = before[c.id];
    if (!o) { (c.proof === "automated" ? reverify : ignored).push(c.id); continue; }
    const edited = norm(o.expected) !== norm(c.expected) || o.proof !== c.proof || norm(o.steps) !== norm(c.steps) || o.title !== c.title || o.covers !== c.covers;
    if (c.proof === "automated" && (o.proof !== "automated" || norm(o.expected) !== norm(c.expected))) reverify.push(c.id);
    else if (edited) ignored.push(c.id);
  }
  return { reverify, ignored };
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const si = args.indexOf("--since");
  if (si >= 0) {
    const f = args.find((a, i) => i !== si && i !== si + 1 && a !== "--json");
    if (!f || !args[si + 1]) { console.error("usage: test-cases-check.mjs <file> --since <commit>"); process.exit(2); }
    let old = "";
    try {
      old = execFileSync("git", ["show", `${args[si + 1]}:${f.split(path.sep).join("/")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch { /* the file did not exist then: every automated case is new */ }
    console.log(JSON.stringify(editsSince(old, fs.readFileSync(f, "utf8"), f)));
    process.exit(0);
  }
  const files = args.filter((a) => a !== "--json");
  if (!files.length) {
    console.error("usage: test-cases-check.mjs <test-cases/KEY.md>... [--json]");
    process.exit(2);
  }
  let failed = 0;
  const out = [];
  for (const f of files) {
    if (!fs.existsSync(f)) { console.error(`test-cases-check: ${f} not found`); process.exit(2); }
    const r = checkTestCases(fs.readFileSync(f, "utf8"), f);
    out.push({ file: f, key: r.key, qc: r.qc, status: r.status, cases: r.cases, errors: r.errors });
    if (r.errors.length) failed++;
    if (!json) {
      for (const e of r.errors) console.log(`ERROR ${e}`);
      const auto = r.cases.filter((c) => c.proof === "automated").length;
      console.log(`${f}: ${r.cases.length} case(s), ${auto} automated, ${r.cases.length - auto} manual, qc ${r.qc || "?"}, ${r.errors.length} error(s)`);
    }
  }
  if (json) console.log(JSON.stringify(out, null, 2));
  process.exit(failed ? 1 : 0);
}
