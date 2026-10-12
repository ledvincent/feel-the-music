# Spec Delta

## Purpose

The `mood` command line every Moodcut tool runs through: machine-readable output for Claude Code, the working folders from one config file, and a check that the PC can run the GPU and media passes.

## ADDED Requirements

### Requirement: JSON output on every command
Every `mood` command SHALL accept `--json`, before or after the command name. With it, the command SHALL print exactly one JSON document on standard output, errors included, so Claude Code can read the result. Without it, the command prints text for a person. Knowledge: `okf/decisions/001-claude-code-orchestrates-local-tools.md`

#### Scenario: Every command accepts json
- **WHEN** any registered `mood` command runs with `--json`
- **THEN** its standard output parses as one JSON document

#### Scenario: Json flag in either position
- **WHEN** `mood --json doctor` and `mood doctor --json` run on the same machine
- **THEN** both succeed and print the same JSON document

#### Scenario: Unknown command in JSON mode
- **WHEN** `mood --json` is given a command that does not exist
- **THEN** it prints one JSON document with an error message and exits non-zero

### Requirement: Working folders from mood.toml
The `mood` CLI SHALL read the working folders (inbox, processed, library, audio, reels, models) from `mood.toml` in the project root. A folder missing from the file, or a missing file, SHALL fall back to the folder of the same name under the project root. Relative paths are resolved from the project root.

#### Scenario: Missing config uses defaults
- **WHEN** there is no `mood.toml`
- **THEN** each working folder is the folder of the same name under the project root

#### Scenario: Config overrides a folder
- **WHEN** `mood.toml` sets the inbox folder to another path and sets nothing else
- **THEN** the inbox is that path and the other folders keep their defaults

#### Scenario: Invalid config is reported
- **WHEN** `mood.toml` is not valid TOML or names an unknown setting
- **THEN** the command stops with a message naming the file and the problem, and exits non-zero

### Requirement: Doctor checks the machine
`mood doctor` SHALL check that an NVIDIA GPU is visible with its total VRAM, that PyTorch is a CUDA build that can use that GPU, that FFmpeg runs, and that yt-dlp runs. It SHALL mark each check ok, warning or failed, with the version or value found. VRAM below the 8 GB budget is a warning, not a failure. Knowledge: `okf/architecture/tech-stack.md`, `okf/decisions/002-python-312-uv-windows-cuda.md`, `okf/decisions/003-one-gpu-model-at-a-time.md`

#### Scenario: Healthy machine
- **WHEN** `mood doctor` runs on a machine where every check passes
- **THEN** it lists the GPU name and VRAM, the PyTorch and CUDA versions, the FFmpeg version and the yt-dlp version, each marked ok, and exits 0

#### Scenario: Low VRAM is a warning
- **WHEN** the GPU has less than 8 GB of VRAM and every other check passes
- **THEN** the VRAM check is marked warning with the amount found, and `mood doctor` exits 0

#### Scenario: CPU-only PyTorch fails the check
- **WHEN** the installed PyTorch has no CUDA support or sees no GPU
- **THEN** the PyTorch check is marked failed with a hint to install the CUDA build

#### Scenario: Doctor shows the folders
- **WHEN** `mood doctor` runs
- **THEN** it lists the working folders in use and whether each exists

### Requirement: Doctor reports every failure
`mood doctor` SHALL run every check even when an earlier one fails, SHALL give a fix hint for each failed check, and SHALL exit non-zero when any check fails. Warnings alone do not change the exit code.

#### Scenario: Doctor reports every failure
- **WHEN** FFmpeg is missing and yt-dlp is missing
- **THEN** both checks are marked failed, each with its own fix hint, and the other checks still run

#### Scenario: Doctor exit code
- **WHEN** at least one check fails
- **THEN** `mood doctor` exits with a non-zero code, also with `--json`
