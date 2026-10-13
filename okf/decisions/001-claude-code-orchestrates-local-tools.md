---
type: Decision
title: Claude Code orchestrates local tools
description: Claude Code drives the mood CLI and does the creative judgement; Python tools do the heavy, deterministic and GPU work.
owner: ledvincent
status: stable
tags: [decision]
---
# Claude Code orchestrates local tools

Date: 2026-10-12 · Jira: MOOD-1 · Change: `openspec/changes/archive/mood-1-kickoff-2026-10-12/`

## Context
Making a reel needs taste (the emotional arc, which word of a line matters, which shot flows into which) and heavy computation (video analysis, search, rendering). The brief requires $0: Claude Code runs on the owner's subscription, with no paid API.

## Decision
"Reel for [song] by [artist]" is a Claude Code skill (`.claude/skills/reel/`). Claude does the judgement in the session: the emotional arc, the meaningful word of each line, the final shot choice, and section suggestions only when asked. Everything deterministic or on the GPU is a `mood` CLI command that prints JSON with `--json`. The owner sets the section times.

## Alternatives considered
- A local LLM as the director: costs VRAM next to the vision models and writes weaker arcs.
- The Claude API from Python: paid, excluded by the brief.

## Consequences
- No server and no scheduler: tools run when the owner asks.
- The reel plan (`/data/reel-plan.md`) is the contract between Claude and the renderer, so it must stay stable and documented.
- Each CLI command is testable on its own, without Claude.
