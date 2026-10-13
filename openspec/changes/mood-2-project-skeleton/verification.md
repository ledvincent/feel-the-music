Verified: 2026-10-13 at 98db361 (uncommitted changes)

Tests: uv run pytest → 21/21 passed (0 failed, 0 skipped). Also ran `uv run ruff check .` (All checks passed) and `uv run ruff format --check .` (77 files already formatted).
OpenSpec: `openspec validate mood-2-project-skeleton --strict` → "Change 'mood-2-project-skeleton' is valid"

| Requirement | Scenario | Proven by | OK? | Note |
|---|---|---|---|---|
| JSON output on every command | Every command accepts json | tests/test_cli.py::test_every_command_accepts_json[doctor] (5.1) | Yes | Parametrised over registered commands; asserts the shared `--json` option is declared and stdout parses as one JSON document. Only `doctor` exists today. |
| JSON output on every command | Json flag in either position | tests/test_cli.py::test_json_flag_in_either_position (5.2) | Yes | Asserts both orders exit 0 and parse to equal JSON. |
| JSON output on every command | Unknown command in JSON mode | tests/test_cli.py::test_unknown_command_in_json_mode (5.3) | Yes | Asserts `ok` false, error names the command, non-zero exit. |
| Working folders from mood.toml | Missing config uses defaults | tests/test_config.py::test_missing_config_uses_defaults (5.4) | Yes | |
| Working folders from mood.toml | Config overrides a folder | tests/test_config.py::test_config_overrides_a_folder (5.5) | Yes | Absolute path; an extra test covers a relative path. |
| Working folders from mood.toml | Invalid config is reported | tests/test_config.py::test_invalid_config_is_reported (5.6) + `..._by_the_command` | Yes | Bad TOML, unknown folder key, unknown table; message names the file; command-level test asserts JSON error and non-zero exit. |
| Doctor checks the machine | Healthy machine | tests/test_doctor.py::test_healthy_machine (5.7) | Yes | Fake probes; asserts GPU name, VRAM, PyTorch+CUDA versions, FFmpeg, yt-dlp all ok, exit 0. Real hardware is task 4.2 (manual, not done). |
| Doctor checks the machine | Low VRAM is a warning | tests/test_doctor.py::test_low_vram_is_a_warning (5.8) | Yes | Parametrised 6144 and 7782 MiB; the code compares `vram_mib < 8*1024`, so the 7.5–7.99 GB edge is handled. Asserts warning, amount shown, exit 0. |
| Doctor checks the machine | CPU-only PyTorch fails the check | tests/test_doctor.py::test_cpu_only_pytorch_fails_the_check (5.9) | Yes | Both cases: CPU-only build gets the "CUDA build" hint, CUDA build with no GPU gets the "driver" hint, matching the updated scenario. Calls `run_doctor` directly. |
| Doctor checks the machine | Doctor shows the folders | tests/test_doctor.py::test_doctor_shows_the_folders (5.10) | Yes | All 6 folders, existence and path asserted. |
| Doctor reports every failure | Doctor reports every failure | tests/test_doctor.py::test_doctor_reports_every_failure (5.11) | Yes | Two distinct fix hints; GPU and PyTorch still run. Extra test covers a crashing probe. |
| Doctor reports every failure | Doctor exit code | tests/test_doctor.py::test_doctor_exit_code (5.12) | Yes | Non-zero with and without `--json`. |

Scope: matches the tasks. Changed files: pyproject.toml, uv.lock, src/mood/{__init__,cli,config,doctor}.py, tests/{__init__,conftest,test_cli,test_config,test_doctor,test_smoke}.py, mood.example.toml, .gitignore, .claude/CLAUDE.md (task 4.3), and the change artifacts. No unplanned code files. Unticked task: 4.2 (manual `mood doctor` / `mood doctor --json` / `mood --json doctor` on the RTX 3060 Ti PC, output pasted in the PR). All work is uncommitted.

Blocking findings:
- none. Task 4.2 remains before merge: no test can prove the real GPU, CUDA, FFmpeg and yt-dlp on the owner's PC.

Non-blocking findings:
- proposal.md has no "## Criteria coverage" section, which kit 1.7.2's openspec/config.yaml asks for; strict validate passes.
- The "## Jira acceptance criteria" snapshot changed in the working tree (13:54 → 15:03, PyTorch criterion reworded). Confirm it came from a sync and Jira holds the new wording.
  (Recorder's note: it did. MOOD-2's criterion was updated in Jira at 15:03 with the owner's approval, then the snapshot was refreshed to match.)
- The previous verification.md was stale (20/20 and the VRAM rounding finding); this file replaces it.
- `main()` decides JSON mode for errors by `"--json" in args`, so a literal `--json` option value would also turn it on. Harmless today; worth knowing for later commands.
- Design D2 asks for a decision record for the CLI library (Typer); D6 one if the CUDA version changes. They belong in okf/decisions/ at close-change.
- No secrets, debug leftovers, skipped/xfail tests or new TODOs. pyproject.toml matches D1, D6, D7, D8.
