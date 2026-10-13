"""Requirement: Working folders from mood.toml (openspec mood-cli)."""

from __future__ import annotations

import pytest

from mood.config import FOLDERS, ConfigError, load_config
from tests.conftest import parse_json


def test_missing_config_uses_defaults(tmp_path):
    config = load_config(tmp_path)

    assert config.folders == {name: tmp_path.resolve() / name for name in FOLDERS}


def test_config_overrides_a_folder(tmp_path):
    other = tmp_path / "elsewhere" / "inbox"
    (tmp_path / "mood.toml").write_text(
        f'[folders]\ninbox = "{other.as_posix()}"\n', encoding="utf-8"
    )

    config = load_config(tmp_path)

    assert config.folders["inbox"] == other
    for name in FOLDERS:
        if name != "inbox":
            assert config.folders[name] == tmp_path.resolve() / name


def test_config_overrides_a_folder_relative_path(tmp_path):
    (tmp_path / "mood.toml").write_text('[folders]\nlibrary = "data/lib"\n', encoding="utf-8")

    assert load_config(tmp_path).folders["library"] == (tmp_path / "data" / "lib").resolve()


@pytest.mark.parametrize(
    "content, problem",
    [
        ("[folders\ninbox = 1", "not valid TOML"),
        ('[folders]\ninbx = "x"\n', "unknown folder inbx"),
        ("[render]\nfps = 30\n", "unknown setting render"),
    ],
)
def test_invalid_config_is_reported(tmp_path, content, problem):
    path = tmp_path / "mood.toml"
    path.write_text(content, encoding="utf-8")

    with pytest.raises(ConfigError) as error:
        load_config(tmp_path)

    assert str(path) in str(error.value)
    assert problem in str(error.value)


def test_invalid_config_is_reported_by_the_command(project, fake_probes, run_mood):
    (project / "mood.toml").write_text("[folders\n", encoding="utf-8")

    code, stdout, _ = run_mood("doctor", "--json")

    result = parse_json(stdout)
    assert code != 0
    assert result["ok"] is False
    assert "mood.toml" in result["error"]
    assert "not valid TOML" in result["error"]


def test_example_config_loads(tmp_path):
    from pathlib import Path

    example = Path(__file__).resolve().parents[1] / "mood.example.toml"
    (tmp_path / "mood.toml").write_text(example.read_text(encoding="utf-8"), encoding="utf-8")

    assert load_config(tmp_path).folders["inbox"] == tmp_path.resolve() / "inbox"
