"""Requirement: JSON output on every command (openspec mood-cli)."""

from __future__ import annotations

import pytest
import typer

from mood import cli
from tests.conftest import parse_json

COMMANDS = sorted(typer.main.get_command(cli.app).commands)


@pytest.mark.parametrize("name", COMMANDS)
def test_every_command_accepts_json(name, project, fake_probes, run_mood):
    command = typer.main.get_command(cli.app).commands[name]
    assert any("--json" in p.opts for p in command.params), f"{name} lacks the shared --json option"

    _, stdout, _ = run_mood(name, "--json")

    parse_json(stdout)


def test_json_flag_in_either_position(project, fake_probes, run_mood):
    code_before, before, _ = run_mood("--json", "doctor")
    code_after, after, _ = run_mood("doctor", "--json")

    assert code_before == code_after == 0
    assert parse_json(before) == parse_json(after)


def test_unknown_command_in_json_mode(project, run_mood):
    code, stdout, _ = run_mood("--json", "no-such-command")

    result = parse_json(stdout)
    assert result["ok"] is False
    assert "no-such-command" in result["error"]
    assert code != 0
