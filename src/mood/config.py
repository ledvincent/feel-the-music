"""Working folders from mood.toml (design D4).

The project root is the folder holding pyproject.toml, or MOOD_ROOT when set.
mood.toml is optional: a missing file or key falls back to the folder of the
same name under the project root. Unknown keys are errors, so typos are caught.
"""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass
from pathlib import Path

FOLDERS = ("inbox", "processed", "library", "audio", "reels", "models")
CONFIG_NAME = "mood.toml"


class ConfigError(Exception):
    """mood.toml cannot be used. The message names the file and the problem."""


@dataclass(frozen=True)
class Config:
    root: Path
    folders: dict[str, Path]


def project_root() -> Path:
    env = os.environ.get("MOOD_ROOT")
    if env:
        return Path(env).resolve()
    here = Path.cwd().resolve()
    for folder in (here, *here.parents):
        if (folder / "pyproject.toml").is_file():
            return folder
    return here


def load_config(root: Path | None = None) -> Config:
    root = (root or project_root()).resolve()
    path = root / CONFIG_NAME
    folders = {name: root / name for name in FOLDERS}
    if not path.is_file():
        return Config(root=root, folders=folders)

    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as exc:
        raise ConfigError(f"{path}: not valid TOML ({exc})") from exc

    unknown = sorted(set(data) - {"folders"})
    if unknown:
        raise ConfigError(f"{path}: unknown setting {', '.join(unknown)} (only [folders] is known)")

    table = data.get("folders", {})
    if not isinstance(table, dict):
        raise ConfigError(f"{path}: [folders] must be a table")
    unknown = sorted(set(table) - set(FOLDERS))
    if unknown:
        raise ConfigError(
            f"{path}: unknown folder {', '.join(unknown)} (known: {', '.join(FOLDERS)})"
        )
    for name, value in table.items():
        if not isinstance(value, str) or not value.strip():
            raise ConfigError(f"{path}: folders.{name} must be a path in quotes")
        folder = Path(value).expanduser()
        folders[name] = folder if folder.is_absolute() else (root / folder).resolve()
    return Config(root=root, folders=folders)
