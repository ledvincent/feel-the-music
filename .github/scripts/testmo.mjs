#!/usr/bin/env node
// testmo.mjs: the kit's Testmo calls, for projects that use Testmo (okf/integrations/testmo.md).
// Part of dirox-kit 1.23.0. /dirox-kit:setup-project copies it into projects as
// .github/scripts/testmo.mjs next to test-cases-check.mjs, which it imports: do not edit the copy.
// No dependencies: Node 20 or later.
//
// The repo is the source: test-cases/<KEY>.md is synced one way into Testmo, the way QC's own
// push-testmo-cases skill lays it out by default: one sub-folder per ticket (named after the ticket)
// under the regression root folder, one case per kit case named by its title, plain text in
// <p>line<br />line</p>, Reference (the Jira URL), Note (the automation plan), an estimate. A case is
// found again by the Testmo ID written back into the file ("- Testmo: <id>"), else by its title in
// its folder. Nothing is ever deleted.
//
// The API key (TESTMO_TOKEN): the environment (CI's secret), else the key file named in the settings
// (default .env, git-ignored), read here and never printed, so it never enters Claude's context.
//
// Commands (JSON on stdout; every write is a dry run unless --apply):
//   info --instance <url> [--project <id>]   (no settings yet: the key from the environment, .env,
//                                  .env.staging or .env.local, whichever has TESTMO_TOKEN)
//                                  for setup: projects, or one project's templates, case fields,
//                                  folders, states, Jira connections
//   check                          the key works and the project is reachable; says where the key
//                                  came from (never the key), whether that file is git-ignored
//                                  and whether it was ever committed
//   sync <files>... [--apply] [--no-writeback]
//                                  create or update the files' cases; with --apply, write each new
//                                  case's Testmo ID back into its file (CI passes --no-writeback)
//   link <automation-run-id> [--apply]
//                                  link a CI run's tests to cases by the case IDs in their names
//   run <KEY> [--all] [--apply]    QC's manual run "<KEY>: <title>" with the ticket's manual cases
//   status <KEY>                   the ticket's runs: passed, failed, untested
//   csv <test-cases/KEY.md>        the cases in Testmo's CSV export format (stdout)
// Exit code: 0 = done, 1 = Testmo refused or is unreachable, 2 = bad usage or settings.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS = "okf/integrations/testmo.md";
const KIT_ID = /\b([A-Z][A-Z0-9]*-\d+-\d+)\b/g;

function fail(code, msg) { console.error(`testmo: ${msg}`); process.exit(code); }

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[a.slice(2)] = true;
    else { out[a.slice(2)] = next; i++; }
  }
  return out;
}

// "- Label: `value`" lines; "none" and <placeholders> read as empty.
export function readSettings(file = SETTINGS) {
  if (!fs.existsSync(file)) fail(2, `${file} not found: this project does not use Testmo yet (/dirox-kit:testmo setup)`);
  const text = fs.readFileSync(file, "utf8");
  const get = (label) => {
    const m = text.match(new RegExp(`^-\\s*${label}:\\s*\`([^\`]*)\``, "mi"));
    const v = m ? m[1].trim() : "";
    return !v || /^none$/i.test(v) || /^<.*>$/.test(v) ? "" : v;
  };
  const s = {
    instance: get("Instance").replace(/\/+$/, ""), project: get("Project ID"), keyFile: get("Key file") || ".env",
    rootFolderId: get("Root folder ID"), rootFolder: get("Root folder"), groupBy: (get("Group by") || "ticket").toLowerCase(),
    caseName: (get("Case name") || "title").toLowerCase(), updateExisting: /^yes$/i.test(get("Update existing")), textFormat: (get("Text format") || "paragraphs").toLowerCase(),
    template: get("Case template ID"), templateName: get("Case template name"), caseState: get("Case state ID"),
    stepsField: get("Steps field"), expectedField: get("Expected field"), preField: get("Pre-conditions field"),
    referenceField: get("Reference field"), noteField: get("Note field"), estimate: get("Estimate"),
    priorityField: get("Priority field"), priorityHigh: get("Priority High"), priorityNormal: get("Priority Normal"),
    typeField: get("Type field"), typeKind: get("Type field kind"), typeSmoke: get("Type smoke"), typeRegression: get("Type regression"),
    runState: get("Run state ID"), jira: get("Jira integration ID"),
  };
  for (const [k, label] of [["instance", "Instance"], ["project", "Project ID"]]) if (!s[k]) fail(2, `${file} has no ${label}: run /dirox-kit:testmo setup`);
  return s;
}

// Whether the key file is git-ignored and was ever committed: a committed key has leaked.
function keyFileStatus(f) {
  const git = (...a) => {
    try { return execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch (e) { return e.status === 1 ? null : undefined; }
  };
  const ignored = git("check-ignore", "-q", f);
  const history = git("log", "--all", "--oneline", "--", f);
  return {
    key_file_ignored: ignored === undefined ? "unknown (not a git repo?)" : ignored !== null,
    key_file_ever_committed: history === undefined || history === null ? "unknown" : Boolean(history.trim()),
  };
}

// The key: the environment first (CI), else KEY=value in the key file. Never printed.
function readKey(keyFile) {
  if (process.env.TESTMO_TOKEN) return { token: process.env.TESTMO_TOKEN, from: "environment (TESTMO_TOKEN)" };
  const files = keyFile ? [keyFile] : [".env", ".env.staging", ".env.local"];
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?TESTMO_TOKEN\s*=\s*(.*?)\s*$/);
      if (m && m[1]) return { token: m[1].replace(/^(['"])(.*)\1$/, "$2"), from: f, ...keyFileStatus(f) };
    }
  }
  fail(2, `no Testmo API key: put TESTMO_TOKEN=<your key> in ${keyFile || ".env"} (git-ignored; never commit it), or set TESTMO_TOKEN in the environment. See the kit's docs/testmo.md`);
}

function client(instance, keyFile) {
  const { token, from, ...keyStatus } = readKey(keyFile);
  const base = `${instance.replace(/\/+$/, "")}/api/v1`;
  async function call(method, p, body) {
    // Only reads, creates and updates, as QC's push script: there is no DELETE anywhere in the kit.
    if (!["GET", "POST", "PATCH"].includes(method)) fail(2, `method ${method} is not allowed`);
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(base + p, {
          method,
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch (e) { fail(1, `${method} ${p}: ${instance} could not be reached (${e.cause?.code || e.message})`); }
      if (res.status === 429 && attempt < 3) { await new Promise((r) => setTimeout(r, 1000 * (Number(res.headers.get("retry-after")) || 2))); continue; }
      if (res.status === 204) return null;
      const text = await res.text();
      if (!res.ok) {
        const hint = res.status === 401 ? " (the key is wrong or expired)" : res.status === 403 ? " (this Testmo user lacks access)" : "";
        fail(1, `${method} ${p} -> ${res.status}${hint}: ${text.slice(0, 300)}`);
      }
      return text ? JSON.parse(text) : null;
    }
  }
  async function all(p, perPage = 100) {
    const out = [];
    for (let page = 1; page; ) {
      const r = await call("GET", `${p}${p.includes("?") ? "&" : "?"}page=${page}&per_page=${perPage}`);
      out.push(...((r && r.result) || []));
      page = (r && r.next_page) || 0;
    }
    return out;
  }
  return { call, all, keyFrom: from, keyStatus };
}

async function testCasesModule() {
  try { return await import(new URL("./test-cases-check.mjs", import.meta.url)); } catch { fail(2, `test-cases-check.mjs must sit next to testmo.mjs (${HERE})`); }
}

// ---------------------------------------------------------------- case bodies
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ids = (v) => String(v).split(",").map((x) => Number(x.trim())).filter(Boolean);
const numbered = (items) => (items || []).map((x, i) => `${i + 1}. ${x}`);
function jiraSite() {
  const f = "okf/integrations/jira.md";
  if (!fs.existsSync(f)) return "";
  return (fs.readFileSync(f, "utf8").match(/Site:\s*`([^`]+\.atlassian\.net)`/) || [])[1] || "";
}

// Text as QC's push script writes it (<p>line<br />line</p>), or as HTML lists.
function textOf(s, lines, numberedList) {
  if (!lines || !lines.length) return "";
  if (s.textFormat === "lists") {
    const tag = numberedList ? "ol" : "ul";
    return `<${tag}>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</${tag}>`;
  }
  return `<p>${(numberedList ? numbered(lines) : lines).map(esc).join("<br />")}</p>`;
}

export function caseFields(s, p, c) {
  const f = {};
  const steps = textOf(s, c.steps, true);
  const expected = textOf(s, c.expected, true);
  const pre = textOf(s, c.preconditions, false);
  const label = (t) => `<p><strong>${t}</strong></p>`;
  if (s.preField && pre) f[s.preField] = pre;
  const head = !s.preField && pre ? label("Pre-conditions") + pre : "";
  if (s.expectedField && s.expectedField !== s.stepsField) {
    f[s.stepsField] = head + steps;
    f[s.expectedField] = expected;
  } else {
    f[s.stepsField] = head + label("Steps") + steps + label("Expected") + expected;
  }
  const site = jiraSite();
  if (s.referenceField && site) f[s.referenceField] = `<p>${esc(`https://${site}/browse/${p.key}`)}</p>`;
  if (s.noteField) f[s.noteField] = `<p>${esc(c.proof === "manual" ? `Automation: Manual — ${c.manualReason}` : "Automation: To be automated")}</p>`;
  if (s.priorityField) {
    const v = c.priority === "High" ? s.priorityHigh : s.priorityNormal;
    if (v) f[s.priorityField] = Number(v);
  }
  if (s.typeField) {
    const v = c.type === "smoke" ? s.typeSmoke : s.typeRegression;
    if (v) f[s.typeField] = s.typeKind === "multi" ? ids(v) : ids(v)[0];
  }
  return f;
}

const caseName = (s, c) => (s.caseName === "id-title" ? `${c.id} · ${c.title}` : c.title);
// The sub-folder, as QC names it: the file's "folder:" line (their CSV "Folder" column, a feature or
// section name such as "App ADV - Carelog reactions"), else the ticket title.
const folderName = (s, p) => (s.groupBy === "capability" ? p.cap || "Unsorted" : p.front.folder || p.title || p.key);
const folderUrl = (s, id) => (id ? `${s.instance}/repositories/${s.project}?group_id=${id}` : null);

// ---------------------------------------------------------------- Testmo lookups
async function rootFolder(api, s, apply, plan) {
  const folders = await api.all(`/projects/${s.project}/folders`);
  if (s.rootFolderId) {
    const root = folders.find((f) => String(f.id) === String(s.rootFolderId));
    if (!root) fail(2, `Root folder ID ${s.rootFolderId} is not a folder of project ${s.project}`);
    return { root, folders };
  }
  if (!s.rootFolder) fail(2, `${SETTINGS} has no Root folder ID: run /dirox-kit:testmo setup`);
  let root = folders.find((f) => f.name === s.rootFolder && !f.parent_id);
  if (!root) {
    plan.createFolders.push(s.rootFolder);
    if (!apply) return { root: null, folders };
    root = (await api.call("POST", `/projects/${s.project}/folders`, { folders: [{ name: s.rootFolder }] })).result[0];
    folders.push(root);
  }
  return { root, folders };
}

async function subFolder(api, s, ctx, name, apply, plan) {
  if (!ctx.root) return null;
  let f = ctx.folders.find((x) => x.parent_id === ctx.root.id && x.name === name);
  if (f) return f;
  plan.createFolders.push(`${ctx.root.name}/${name}`);
  if (!apply) return null;
  f = (await api.call("POST", `/projects/${s.project}/folders`, { folders: [{ name, parent_id: ctx.root.id }] })).result[0];
  ctx.folders.push(f);
  return f;
}

// Write "- Testmo: <id>" into each new case's block, right after its "- Covers:" line. Only that line
// of the file changes: the rest stays as QC wrote it.
function writeBack(file, newIds) {
  if (!Object.keys(newIds).length) return [];
  const lines = fs.readFileSync(file, "utf8").split(/(?<=\n)/);
  let current = null;
  const done = [];
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^## ([A-Z][A-Z0-9]*-\d+-\d+)\b/);
    if (h) { current = h[1]; continue; }
    if (current && newIds[current] && /^\s*[-*]\s*Covers:/i.test(lines[i])) {
      const eol = lines[i].endsWith("\r\n") ? "\r\n" : "\n";
      lines.splice(i + 1, 0, `- Testmo: ${newIds[current]}${eol}`);
      done.push(current);
      current = null;
    }
  }
  fs.writeFileSync(file, lines.join(""));
  return done;
}

// ---------------------------------------------------------------- commands
async function sync(files, opts, quiet = false) {
  if (!files.length) fail(2, "sync needs test-cases/<KEY>.md files");
  const s = readSettings();
  if (!s.template || !s.stepsField) fail(2, `${SETTINGS} needs a Case template ID and a Steps field: run /dirox-kit:testmo setup`);
  const tc = await testCasesModule();
  const api = client(s.instance, s.keyFile);
  const apply = Boolean(opts.apply);
  const plan = { apply, createFolders: [], files: [], orphans: [] };
  const ctx = await rootFolder(api, s, apply, plan);
  const mapping = {};
  for (const file of files) {
    if (!fs.existsSync(file)) { plan.files.push({ file, error: "not found" }); continue; }
    const p = tc.checkTestCases(fs.readFileSync(file, "utf8"), file);
    if (p.errors.length) { plan.files.push({ file, error: p.errors.join(" ") }); continue; }
    const folder = await subFolder(api, s, ctx, folderName(s, p), apply, plan);
    const inFolder = folder ? await api.all(`/projects/${s.project}/cases?folder_id=${folder.id}`) : [];
    const byName = new Map(inFolder.map((c) => [c.name, c]));
    const issues = s.jira ? [{ display_id: p.key, integration_id: Number(s.jira) }] : undefined;
    const out = { file, key: p.key, folder: `${ctx.root ? ctx.root.name : s.rootFolder}/${folderName(s, p)}`, create: [], update: [], skip: [], folder_url: folderUrl(s, folder && folder.id) };
    const toCreate = [];
    const seen = new Set();
    for (const c of p.cases) {
      const fields = caseFields(s, p, c);
      // The estimate is set in seconds; Testmo stores microseconds, so it is sent x 1,000,000, as QC's script does.
      const body = {
        name: caseName(s, c), template_id: Number(s.template), ...(s.caseState ? { state_id: Number(s.caseState) } : {}),
        ...(s.estimate ? { estimate: Number(s.estimate) * 1_000_000 } : {}), ...fields, tags: [p.key, c.type], ...(issues ? { issues } : {}),
      };
      const known = c.testmo ? Number(String(c.testmo).replace(/\D/g, "")) : (byName.get(body.name) || {}).id;
      if (known) {
        seen.add(known);
        mapping[c.id] = known;
        // As QC's push: a case already in Testmo is never overwritten (QC owns it there), unless the
        // settings say "Update existing: yes" (the repo is then the source and Testmo mirrors it).
        if (!s.updateExisting) { out.skip.push(c.id); continue; }
        out.update.push(c.id);
        if (apply) await api.call("PATCH", `/projects/${s.project}/cases`, { ids: [known], ...body, ...(folder ? { folder_id: folder.id } : {}) });
      } else {
        out.create.push(c.id);
        toCreate.push({ id: c.id, body: { ...body, ...(folder ? { folder_id: folder.id } : {}) }, fields });
      }
    }
    if (apply && toCreate.length) {
      const newIds = {};
      for (let i = 0; i < toCreate.length; i += 100) {
        const batch = toCreate.slice(i, i + 100);
        const r = await api.call("POST", `/projects/${s.project}/cases`, { cases: batch.map((x) => x.body) });
        for (const [j, made] of (r.result || []).entries()) {
          mapping[batch[j].id] = made.id;
          newIds[batch[j].id] = made.id;
          // Some Testmo versions ignore text fields on create: fill the missing ones on the new case only,
          // as QC's script does.
          const missing = Object.fromEntries(Object.entries(batch[j].fields).filter(([k, v]) => v && !made[k]));
          if (Object.keys(missing).length) await api.call("PATCH", `/projects/${s.project}/cases`, { ids: [made.id], ...missing });
        }
      }
      if (!opts.noWriteback) out.written_back = writeBack(file, newIds);
      if (!out.folder_url) out.folder_url = folderUrl(s, toCreate[0].body.folder_id);
    }
    for (const c of inFolder) if (!seen.has(c.id) && !Object.values(mapping).includes(c.id)) plan.orphans.push({ testmo: c.id, name: c.name, folder: out.folder, note: "in the ticket's Testmo folder, not in the file: QC retires it in Testmo if it is obsolete" });
    plan.files.push(out);
  }
  plan.mapping = mapping;
  if (!quiet) console.log(JSON.stringify(plan, null, 2));
  return plan;
}

// Kit case ID -> Testmo case ID, from the "- Testmo:" lines of every test case file.
async function knownIds() {
  const tc = await testCasesModule();
  const out = {};
  if (!fs.existsSync("test-cases")) return out;
  for (const f of fs.readdirSync("test-cases").filter((x) => x.endsWith(".md") && x !== "README.md")) {
    for (const c of tc.parseTestCases(fs.readFileSync(path.join("test-cases", f), "utf8"), f).cases) {
      if (c.testmo) out[c.id] = Number(String(c.testmo).replace(/\D/g, ""));
    }
  }
  return out;
}

async function link(runId, apply) {
  if (!runId) fail(2, "link needs an automation run id");
  const s = readSettings();
  const api = client(s.instance, s.keyFile);
  const known = await knownIds();
  const tests = await api.all(`/automation/runs/${runId}/tests`, 500);
  const pairs = [];
  const unknown = new Set();
  let already = 0;
  for (const t of tests) {
    for (const [, id] of `${t.name || ""} ${t.key || ""}`.matchAll(KIT_ID)) {
      const caseId = known[id];
      if (!caseId) { unknown.add(id); continue; }
      if (t.repository_case_id === caseId) { already++; continue; }
      pairs.push({ case_id: caseId, automation_case_id: t.automation_case_id });
    }
  }
  const uniq = [...new Map(pairs.map((p) => [`${p.case_id}:${p.automation_case_id}`, p])).values()];
  if (apply) for (let i = 0; i < uniq.length; i += 500) await api.call("POST", `/projects/${s.project}/automation-links/bulk`, { links: uniq.slice(i, i + 500) });
  console.log(JSON.stringify({ apply: Boolean(apply), run: Number(runId), tests: tests.length, linked: uniq.length, already_linked: already, ids_without_testmo_id: [...unknown] }, null, 2));
}

async function findRuns(api, s, key) {
  return (await api.all(`/projects/${s.project}/runs?name=${encodeURIComponent(key)}`)).filter((r) => String(r.name).startsWith(`${key}:`));
}

async function run(key, all, apply) {
  if (!key) fail(2, "run needs a ticket key");
  const file = `test-cases/${key}.md`;
  if (!fs.existsSync(file)) fail(2, `${file} not found`);
  const s = readSettings();
  if (!s.runState) fail(2, `${SETTINGS} has no Run state ID: run /dirox-kit:testmo setup`);
  const tc = await testCasesModule();
  const plan = await sync([file], { apply }, true);
  const p = tc.parseTestCases(fs.readFileSync(file, "utf8"), file);
  const api = client(s.instance, s.keyFile);
  const wanted = p.cases.filter((c) => all || c.proof === "manual").map((c) => c.id);
  const caseIds = wanted.map((id) => plan.mapping[id]).filter(Boolean);
  const open = (await findRuns(api, s, key)).find((r) => !r.is_closed);
  const name = `${key}: ${p.title || key}`;
  const issues = s.jira ? [{ display_id: key, integration_id: Number(s.jira) }] : undefined;
  const result = { action: open ? "update" : "create", run: open ? open.id : null, name, cases: wanted };
  if (apply && caseIds.length) {
    const body = { name, cases: caseIds, tags: [key], ...(issues ? { issues } : {}) };
    const r = open
      ? (await api.call("PATCH", `/projects/${s.project}/runs/${open.id}`, body)).result
      : (await api.call("POST", `/projects/${s.project}/runs`, { ...body, state_id: Number(s.runState), include_all: false })).result;
    result.run = r.id;
  }
  if (!wanted.length) result.note = all ? "the file has no cases" : "no manual case: nothing for QC to run by hand (--all puts every case in the run)";
  else if (!apply) result.note = "dry run: --apply syncs the cases, then creates or updates the run";
  console.log(JSON.stringify({ apply: Boolean(apply), sync: plan.files, ...result }, null, 2));
}

async function status(key) {
  if (!key) fail(2, "status needs a ticket key");
  const s = readSettings();
  const api = client(s.instance, s.keyFile);
  const runs = await findRuns(api, s, key);
  console.log(JSON.stringify({ key, runs: runs.map((r) => ({
    id: r.id, name: r.name, is_closed: r.is_closed, total: r.total_count, passed: r.success_count,
    failed: r.failure_count, untested: r.untested_count, completed: r.completed_count,
  })) }, null, 2));
}

// QC's ticket-draft CSV, exactly as their build-testmo-csv.js writes it (read by their
// merge-module-csv.js and push-testmo-cases.js): Testmo's 31-column export header ("Description" twice;
// readers take the first), every field quoted, UTF-8 with BOM, CRLF line endings inside fields too.
const CSV_HEADER = ["Case ID", "Case", "Automated", "Automation", "Configurations", "Created at", "Created by", "Description",
  "Description", "Estimate", "Expected Result", "Folder", "Forecast", "Issues", "Note", "Post Condition",
  "Pre-Condition", "Priority", "Reference", "State", "Status (latest)", "Status date", "Steps (Data)",
  "Steps (Expected)", "Steps (Step)", "Tags", "Template", "Test Data", "Test Type", "Updated at", "Updated by"];
const CSV_COL = { caseId: 0, case: 1, automation: 3, description: 7, estimate: 9, expected: 10, folder: 11, forecast: 12,
  issues: 13, note: 14, preCondition: 16, priority: 17, reference: 18, state: 19, tags: 25, template: 26, testType: 28 };
async function csv(file) {
  if (!file || !fs.existsSync(file)) fail(2, "csv needs a test-cases/<KEY>.md file");
  const tc = await testCasesModule();
  const p = tc.parseTestCases(fs.readFileSync(file, "utf8"), file);
  let s = { caseName: "title", groupBy: "ticket", estimate: "300", templateName: "Case (no steps)" };
  if (fs.existsSync(SETTINGS)) s = { ...s, ...Object.fromEntries(Object.entries(readSettings()).filter(([, v]) => v)) };
  const site = jiraSite() || "vitalliance.atlassian.net";
  const quote = (v) => '"' + String(v ?? "").replace(/\r?\n/g, "\r\n").replace(/"/g, '""') + '"';
  const estimate = String(Number(s.estimate) || 300);
  const rows = p.cases.map((c) => {
    const row = new Array(CSV_HEADER.length).fill("");
    row[CSV_COL.caseId] = c.testmo || c.id;
    row[CSV_COL.case] = caseName(s, c);
    row[CSV_COL.automation] = "No";
    row[CSV_COL.description] = numbered(c.steps).join("\n");
    row[CSV_COL.estimate] = estimate;
    row[CSV_COL.expected] = numbered(c.expected).join("\n");
    row[CSV_COL.folder] = p.front.folder || p.title || p.key;
    row[CSV_COL.forecast] = estimate;
    row[CSV_COL.issues] = p.key;
    row[CSV_COL.note] = c.proof === "manual" ? "Automation: Manual — " + c.manualReason : "Automation: To be automated";
    // The writer starts pre-conditions with "User: Guest." or "User: Logged In.", as QC's builder does.
    row[CSV_COL.preCondition] = c.preconditions.join("\n");
    row[CSV_COL.priority] = c.priority;
    row[CSV_COL.reference] = "https://" + site + "/browse/" + p.key;
    row[CSV_COL.state] = "Active";
    row[CSV_COL.tags] = p.key + "," + c.type;
    row[CSV_COL.template] = s.templateName || "Case (no steps)";
    row[CSV_COL.testType] = c.type === "smoke" ? "Functionality" : "Functionality,Regression test";
    return row.map(quote).join(",");
  });
  process.stdout.write("﻿" + [CSV_HEADER.map(quote).join(","), ...rows].join("\r\n") + "\r\n");
}

async function info(a) {
  if (!a.instance) fail(2, "info needs --instance <url>");
  const api = client(a.instance, "");
  if (!a.project) {
    const user = (await api.call("GET", "/user")).result;
    const projects = await api.all("/projects");
    console.log(JSON.stringify({ key_from: api.keyFrom, ...api.keyStatus, user: user.name, projects: projects.map((p) => ({ id: p.id, name: p.name, is_completed: p.is_completed })) }, null, 2));
    return;
  }
  const p = a.project;
  const project = (await api.call("GET", `/projects/${p}`)).result;
  const templates = (await api.call("GET", `/projects/${p}/templates`)).result;
  const fields = await api.all(`/projects/${p}/fields?entity=repository_case`);
  const states = (await api.call("GET", `/projects/${p}/states`)).result;
  const folders = await api.all(`/projects/${p}/folders`);
  let connections = [];
  try { connections = await api.all("/issues/connections?is_active=true"); } catch { /* older instances */ }
  console.log(JSON.stringify({
    key_from: api.keyFrom, ...api.keyStatus,
    project: { id: project.id, name: project.name },
    templates: templates.map((t) => ({ id: t.id, name: t.name, is_default: t.is_default, fields: (t.fields || []).map((f) => f.name) })),
    case_fields: fields.map((f) => ({ name: f.name, column_name: f.column_name, type: f.type, options: (f.options || []).flatMap((o) => (o.values || []).map((v) => ({ id: v.id, name: v.name }))) })),
    states: states.map((x) => ({ id: x.id, name: x.name, is_default: x.is_default })),
    folders: folders.filter((f) => !f.parent_id || String(f.id) === String(a.folder || "")).map((f) => ({ id: f.id, name: f.name })),
    issue_connections: connections.map((c) => ({ integration_id: c.integration_id, name: c.connection_name, project: c.connection_project_name })),
  }, null, 2));
}

async function check() {
  const s = readSettings();
  const api = client(s.instance, s.keyFile);
  const user = (await api.call("GET", "/user")).result;
  const project = (await api.call("GET", `/projects/${s.project}`)).result;
  console.log(JSON.stringify({ ok: true, key_from: api.keyFrom, ...api.keyStatus, user: user.name, project: { id: project.id, name: project.name } }, null, 2));
}

const a = parseArgs(process.argv.slice(2));
const [cmd, ...rest] = a._;
const commands = {
  info: () => info(a), check,
  sync: () => sync(rest, { apply: a.apply, noWriteback: a["no-writeback"] }),
  link: () => link(rest[0], a.apply), run: () => run(rest[0], a.all, a.apply), status: () => status(rest[0]), csv: () => csv(rest[0]),
};
if (!commands[cmd]) fail(2, "usage: testmo.mjs info|check|sync <files>|link <run-id>|run <KEY>|status <KEY>|csv <file> [--apply]");
await commands[cmd]();
