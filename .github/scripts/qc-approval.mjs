#!/usr/bin/env node
// qc-approval.mjs: does a QC approval still cover the PR's code? Used by pr-check.mjs in CI (QC gate)
// and by /dirox-kit:close-change locally. Part of dirox-kit 1.18.0. /dirox-kit:setup-project copies
// it into projects as .github/scripts/qc-approval.mjs: do not edit the copy.
// No dependencies: Node 20 or later.
//
// An approval at commit A covers the PR at commit H when the PR's net code diff is the same:
//   git diff -U0 merge-base(base, A)..A   versus   git diff -U0 merge-base(base, H)..H
// leaving out openspec/, okf/ and test-cases/, compared per file with `git patch-id --stable`
// (which ignores line numbers and whitespace; -U0 leaves out context lines). So merging the base
// branch in, archiving the change or writing knowledge keeps the approval; changing the PR's own
// code does not. The commits must be in the local history (CI: checkout with fetch-depth 0).
//
// CLI (close-change): gh pr view <n> --json reviews | node qc-approval.mjs --base origin/main [--head HEAD]
//   reads the QC reviewers from .github/qc-reviewers, prints a JSON verdict.
//   Exit code: 0 = covered, 1 = no approval or code changed since, 2 = bad usage.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const NOT_REVIEWED = ["openspec/", "okf/", "test-cases/"];

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 });
}

export function readReviewers(file = ".github/qc-reviewers") {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n")
    .map((l) => l.replace(/#.*/, "").trim().replace(/^@/, ""))
    .filter((l) => l && l !== "QC-REVIEWER");
}

// Reviews from the REST API ({user:{login}, state, commit_id}) or from `gh pr view --json reviews`
// ({author:{login}, state, commit:{oid}}), oldest first. The latest approve, request-changes or
// dismissal of each QC reviewer counts; plain comments do not.
export function qcApprovals(reviews, reviewers) {
  const qc = new Set(reviewers.map((r) => r.toLowerCase()));
  const latest = {};
  for (const r of reviews || []) {
    const who = (r.user?.login || r.author?.login || "").toLowerCase();
    if (!qc.has(who) || r.state === "COMMENTED" || r.state === "PENDING") continue;
    latest[who] = { login: r.user?.login || r.author?.login, state: r.state, commit: r.commit_id || r.commit?.oid || "" };
  }
  return Object.values(latest).filter((r) => r.state === "APPROVED");
}

// The PR's net code diff from where it left the base, as {file: patch-id}.
function netCodeDiff(base, commit) {
  const mb = git("merge-base", base, commit).trim();
  const files = git("diff", "--name-only", "--no-renames", mb, commit).split("\n").filter(Boolean)
    .filter((f) => !NOT_REVIEWED.some((p) => f.startsWith(p)));
  const out = {};
  for (const f of files) {
    const diff = git("diff", "-U0", "--no-renames", mb, commit, "--", f);
    let id = "";
    try {
      id = execFileSync("git", ["patch-id", "--stable"], { input: diff, encoding: "utf8" }).split(" ")[0];
    } catch { /* binary or empty diff */ }
    out[f] = id || `blob:${git("rev-parse", `${commit}:${f}`).trim()}`;
  }
  return out;
}

const exists = (c) => { try { git("cat-file", "-e", `${c}^{commit}`); return true; } catch { return false; } };

// Files whose code differs between the approved commit and the head, [] when the approval covers it.
export function codeChangedSince(base, approved, head) {
  if (!exists(approved)) return null; // force-pushed away: nothing to compare with
  const a = netCodeDiff(base, approved);
  const h = netCodeDiff(base, head);
  return [...new Set([...Object.keys(a), ...Object.keys(h)])].filter((f) => a[f] !== h[f]).sort();
}

// The verdict: {ok, reason, approvals, changed}.
export function checkQcApproval({ reviews, reviewers, base, head }) {
  if (!reviewers.length) return { ok: false, reason: "no-reviewers", approvals: [], changed: [] };
  const approvals = qcApprovals(reviews, reviewers);
  if (!approvals.length) return { ok: false, reason: "not-approved", approvals, changed: [] };
  let best = null;
  for (const a of approvals) {
    const changed = codeChangedSince(base, a.commit, head);
    if (changed && !changed.length) return { ok: true, reason: "covered", approvals, changed: [], by: a.login, at: a.commit };
    if (!best || (changed && (!best.changed || changed.length < best.changed.length))) best = { a, changed };
  }
  return { ok: false, reason: best.changed ? "code-changed" : "commit-missing", approvals, changed: best.changed || [], by: best.a.login, at: best.a.commit };
}

// The message for a verdict that is not ok, in the words CI and close-change both use.
export function explain(v, key) {
  const who = (v.approvals || []).map((a) => a.login).join(", ");
  if (v.reason === "no-reviewers") return `${key} needs QC (qc: required), but .github/qc-reviewers lists no QC reviewer. Add their GitHub usernames.`;
  if (v.reason === "not-approved") return `Waiting for QC: ${key} is marked qc: required. A QC reviewer tests the PR's build, runs the manual test cases and approves the PR.`;
  if (v.reason === "commit-missing") return `${who} approved commit ${v.at.slice(0, 7)}, which is no longer in the branch's history (force-pushed?). QC looks at the PR again and re-approves.`;
  const files = v.changed.slice(0, 5).join(", ") + (v.changed.length > 5 ? ` and ${v.changed.length - 5} more` : "");
  return `The code changed since QC approved (${who}, at ${v.at.slice(0, 7)}): ${files}. QC looks at that diff and re-approves; they re-run cases only if behaviour they tested changed.`;
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
  const base = opt("base");
  if (!base) { console.error("usage: gh pr view <n> --json reviews | qc-approval.mjs --base <base ref> [--head HEAD] [--key PROJ-123]"); process.exit(2); }
  let input = "";
  try { input = fs.readFileSync(0, "utf8"); } catch { /* no stdin */ }
  let reviews;
  try { const j = JSON.parse(input || "{}"); reviews = Array.isArray(j) ? j : j.reviews || []; } catch { console.error("qc-approval: stdin is not the JSON of `gh pr view --json reviews`"); process.exit(2); }
  const v = checkQcApproval({ reviews, reviewers: readReviewers(), base, head: opt("head", "HEAD") });
  console.log(JSON.stringify({ ...v, message: v.ok ? `Covered by ${v.by}'s approval at ${v.at.slice(0, 7)}.` : explain(v, opt("key", "This ticket")) }, null, 2));
  process.exit(v.ok ? 0 : 1);
}
