# Tasks

Phase 2 of the kickoff (after the plan PR is approved). The kickoff writes no code, so there is no Proof group. Each OKF task is done when `node .github/scripts/okf-validate.mjs okf` reports 0 errors for the new file.

## 1. Architecture

- [ ] 1.1 Write `okf/architecture/overview.md` from design.md (overview, modules, data flow, connections, environments) and verify it validates
- [ ] 1.2 Write `okf/architecture/tech-stack.md` (Python 3.12, uv, PyTorch + CUDA, LanceDB, SigLIP, FFmpeg; 8 GB VRAM rule) and verify it validates

## 2. Decisions

Decisions D7 (shot splitter), D8 (vision-language model), D9 (renderer), D14 (beat tracker) and D16 (word aligner) are proposals; their backlog tickets record them at close.

- [ ] 2.1 Write `okf/decisions/001-claude-code-orchestrates-local-tools.md` (D1) and verify it validates
- [ ] 2.2 Write `okf/decisions/002-python-312-uv-windows-cuda.md` (D2) and verify it validates
- [ ] 2.3 Write `okf/decisions/003-one-gpu-model-at-a-time.md` (D3) and verify it validates
- [ ] 2.4 Write `okf/decisions/004-lancedb-one-row-per-shot.md` (D4) and verify it validates
- [ ] 2.5 Write `okf/decisions/005-siglip-embeddings-and-tags.md` (D5) and verify it validates
- [ ] 2.6 Write `okf/decisions/006-fixed-emotion-list.md` (D6, with the list as approved) and verify it validates
- [ ] 2.7 Write `okf/decisions/007-keeper-clips-as-library.md` (D10) and verify it validates
- [ ] 2.8 Write `okf/decisions/008-song-audio-from-youtube.md` (D13) and verify it validates
- [ ] 2.9 Write `okf/decisions/009-cuts-on-the-beat.md` (D15: ranked cut points, owner's exact section times) and verify it validates

## 3. Domain terms

- [ ] 3.1 Write `okf/domain/reel.md` and verify it validates
- [ ] 3.2 Write `okf/domain/moment-library.md` and verify it validates
- [ ] 3.3 Write `okf/domain/shot.md` (including the keeper rule and rejected shot) and verify it validates
- [ ] 3.4 Write `okf/domain/section.md` (the 20–30 seconds set by the owner with exact start and end times, and its start time in the song) and verify it validates
- [ ] 3.5 Write `okf/domain/emotional-arc.md` (phases with feeling, visual direction, palette) and verify it validates
- [ ] 3.6 Write `okf/domain/beat-grid.md` (tempo, beats, downbeats, word timings, song time, and the ranked cut points) and verify it validates
- [ ] 3.7 Write `okf/domain/palette.md` and `okf/domain/grade.md` and verify they validate
- [ ] 3.8 Write `okf/domain/cheap-pass.md` and `okf/domain/expensive-pass.md` and verify they validate
- [ ] 3.9 Write `okf/domain/contact-sheet.md` and verify it validates
- [ ] 3.10 Write `okf/domain/start-time-note.md` (and the sync risk) and verify it validates

## 4. Data and integrations

- [ ] 4.1 Write `okf/data/shot.md` (the LanceDB shot row and source row) and verify it validates
- [ ] 4.2 Write `okf/data/reel-plan.md` (the plan.json contract) and verify it validates
- [ ] 4.3 Write `okf/integrations/lrclib.md` and verify it validates
- [ ] 4.4 Write `okf/integrations/youtube-audio.md` (yt-dlp, duration check, terms-of-service note) and verify it validates

## 5. Link and index

- [ ] 5.1 Check that every `Knowledge:` link in the change's specs points to a concept written above, and verify `openspec validate mood-1-kickoff --strict` passes
- [ ] 5.2 Add the `okf/log.md` line, run `okf-validate.mjs okf --write` and verify it reports 0 errors

## 6. CLAUDE.md and owners

- [ ] 6.1 Fill `CLAUDE.md` "Project" (what it is, stack and versions) and verify it stays under 150 lines
- [ ] 6.2 Fill `CLAUDE.md` "Commands" (install, run, test, lint with uv) and verify each line names a real command from the tech stack
- [ ] 6.3 Fill `CLAUDE.md` "Project rules" (folders never committed, one GPU model at a time, cuts always on the beat, no paid APIs, fixed emotion list) and verify no TODO is left that the plan answers
- [ ] 6.4 Fill `.github/CODEOWNERS` with the reviewers named on the PR and verify no placeholder is left

## Workflow follow-up

- Archive the change (`/opsx:archive`) to create `openspec/specs/<capability>/spec.md` for the five capabilities.
- Run `openspec validate --all --strict --no-interactive` and `node .github/scripts/okf-validate.mjs okf`; both must pass.
- The PM creates the Jira tickets from the backlog table in `proposal.md`, or Claude does it on request.
