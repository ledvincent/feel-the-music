Verified: 2026-10-14 at 5287ee9

Tests: uv run pytest → 21/21 passed (0 failed, 0 skipped)
OpenSpec: `openspec validate mood-2-project-skeleton --strict` → "Change 'mood-2-project-skeleton' is valid"

| Requirement | Scenario | Proven by | OK? | Note |
|---|---|---|---|---|
| JSON output on every command | Every command accepts json | tests/test_cli.py::test_every_command_accepts_json[doctor] (5.1) | Yes | Runs over every registered command. Checks the shared `--json` option is declared and that stdout parses as one JSON document. `doctor` is the only command today. |
| JSON output on every command | Json flag in either position | tests/test_cli.py::test_json_flag_in_either_position (5.2) | Yes | Both orders exit 0 and give the same parsed JSON. |
| JSON output on every command | Unknown command in JSON mode | tests/test_cli.py::test_unknown_command_in_json_mode (5.3) | Yes | Asserts `ok` is false, the error names the command, and the exit code is non-zero. |
| Working folders from mood.toml | Missing config uses defaults | tests/test_config.py::test_missing_config_uses_defaults (5.4) | Yes | All 6 folders are `<root>/<name>`. |
| Working folders from mood.toml | Config overrides a folder | tests/test_config.py::test_config_overrides_a_folder (5.5) | Yes | Absolute inbox path; the other folders keep their defaults. An extra test covers a relative path. |
| Working folders from mood.toml | Invalid config is reported | tests/test_config.py::test_invalid_config_is_reported (5.6), plus `..._by_the_command` | Yes | Covers bad TOML, an unknown folder key and an unknown table. The message names the file and the problem. The command-level test checks the JSON error and the non-zero exit. |
| Doctor checks the machine | Healthy machine | tests/test_doctor.py::test_healthy_machine (5.7) | Yes | Uses fake probes. Asserts the GPU name, 8.0 GB VRAM, PyTorch and CUDA versions, FFmpeg and yt-dlp, all ok, exit 0. Task 4.2 covers the real hardware: ticked, output said to be in PR #9 (not checked here). |
| Doctor checks the machine | Low VRAM is a warning | tests/test_doctor.py::test_low_vram_is_a_warning (5.8) | Yes | Runs with 6144 and 7782 MiB. Asserts warning status, the amount shown and exit 0. |
| Doctor checks the machine | CPU-only PyTorch fails the check | tests/test_doctor.py::test_cpu_only_pytorch_fails_the_check (5.9) | Yes | CPU-only build: failed with the "CUDA build" hint. CUDA build with no GPU: failed with the "driver" hint. Calls `run_doctor` directly, not through the CLI. |
| Doctor checks the machine | Doctor shows the folders | tests/test_doctor.py::test_doctor_shows_the_folders (5.10) | Yes | All 6 folders listed, with existence and path asserted. |
| Doctor reports every failure | Doctor reports every failure | tests/test_doctor.py::test_doctor_reports_every_failure (5.11) | Yes | Both failed, with two different hints; the GPU and PyTorch checks still run and pass. An extra test covers a probe that crashes. |
| Doctor reports every failure | Doctor exit code | tests/test_doctor.py::test_doctor_exit_code (5.12) | Yes | Non-zero exit with and without `--json`; JSON `ok` is false. |

Scope: in line with the tasks. The local `main` ref is out of date: it points at 60ee3d3, so `git diff main...HEAD` also lists files from PRs #4–#8 that are already merged. Against `origin/main` (4271474) the diff is only what was planned: pyproject.toml, uv.lock, src/mood/{__init__,cli,config,doctor}.py, tests/{__init__,conftest,test_cli,test_config,test_doctor,test_smoke}.py, mood.example.toml, .gitignore, .claude/CLAUDE.md (task 4.3) and the change files. There are no extra files, no planned work left undone and no unticked tasks. The working tree is clean.

Blocking findings:
- none

Non-blocking findings:
- openspec/changes/mood-2-project-skeleton/verification.md is out of date. It calls task 4.2 unticked, but tasks.md has it ticked (commit 5287ee9). It also says "All work is uncommitted", and the work is now committed. Refresh it, or let close-change replace it.
- openspec/changes/mood-2-project-skeleton/proposal.md has no "## Criteria coverage" section, which openspec/config.yaml (line 16) asks for. Strict validate still passes.
- Design D2 says the CLI library (Typer) needs a decision record. No file for it exists yet in okf/decisions/; it should be added at close-change.
- src/mood/cli.py `main()` turns on JSON error output whenever `"--json" in args`. A literal `--json` given as the value of another option would also turn it on. This is harmless with today's single command.
- src/mood/doctor.py `_safely("gpu", ...)` returns a single failed "gpu" entry when the GPU probe crashes, so the "vram" check is missing from the output in that case. This is minor; the other checks still run.
- No secrets, debug leftovers, skipped or xfail tests, or new TODOs were found in the diff. pyproject.toml matches D1, D6, D7 and D8.
