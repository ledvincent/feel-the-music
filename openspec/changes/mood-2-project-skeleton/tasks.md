# Tasks

## 1. Package and tooling

- [ ] 1.1 Create `pyproject.toml` (Python 3.12, package `mood` in `src/mood/`, console script `mood`, dependencies typer, torch from the cu124 index, yt-dlp; dev group pytest and ruff; ruff and pytest settings from design D6–D8) and verify `uv sync` succeeds and writes `uv.lock`
- [ ] 1.2 Add the working folders (`inbox/`, `processed/`, `library/`, `audio/`, `reels/`, `models/`) and `mood.toml` to `.gitignore`, and verify `git status` ignores a file placed in each
- [ ] 1.3 Add an empty `tests/` with a smoke test importing `mood`, and verify `uv run pytest` and `uv run ruff check .` pass

## 2. CLI shell and JSON output

- [ ] 2.1 Create `mood.cli` with Typer, the global `--json` option and the shared result renderer (design D2, D3); verify `uv run mood --help` lists the commands
- [ ] 2.2 Print errors (unknown command, any uncaught error) as one JSON document with a non-zero exit when `--json` is set; verify with the tests in group 5

## 3. Config

- [ ] 3.1 Create `mood.config`: project root (pyproject or `MOOD_ROOT`), `[folders]` from `mood.toml` with defaults, unknown keys and bad TOML rejected with the file named (design D4); verify with the tests in group 5
- [ ] 3.2 Add a commented `mood.example.toml` and verify it loads without error

## 4. mood doctor

- [ ] 4.1 Create `mood.doctor` with independent checks for GPU and VRAM, PyTorch CUDA, FFmpeg, yt-dlp and folders, injectable probes, a fix hint per failure and a non-zero exit on any failure (design D5); verify with the tests in group 5
- [ ] 4.2 Run `uv run mood doctor` and `uv run mood doctor --json` on the RTX 3060 Ti PC and verify every check is ok (manual; paste the output in the PR)
- [ ] 4.3 Update the Commands section of `CLAUDE.md` (remove "Planned") and verify each listed command runs as written

## 5. Proof

- [ ] 5.1 Test `Every command accepts json` in `tests/test_cli.py`
- [ ] 5.2 Test `Unknown command in JSON mode` in `tests/test_cli.py`
- [ ] 5.3 Test `Missing config uses defaults` in `tests/test_config.py`
- [ ] 5.4 Test `Config overrides a folder` in `tests/test_config.py`
- [ ] 5.5 Test `Invalid config is reported` in `tests/test_config.py`
- [ ] 5.6 Test `Healthy machine` in `tests/test_doctor.py`
- [ ] 5.7 Test `CPU-only PyTorch fails the check` in `tests/test_doctor.py`
- [ ] 5.8 Test `Doctor shows the folders` in `tests/test_doctor.py`
- [ ] 5.9 Test `Doctor reports every failure` in `tests/test_doctor.py`
- [ ] 5.10 Test `Doctor exit code` in `tests/test_doctor.py`
