"""Shared test helpers. Tests run on CPU, with no network and no real GPU, FFmpeg or yt-dlp."""

from __future__ import annotations

import json

import pytest

from mood import cli, doctor
from mood.doctor import GpuInfo, Probes, TorchInfo


def healthy_probes() -> Probes:
    """Probes for the owner's PC with everything installed."""
    return Probes(
        gpu=lambda: GpuInfo(name="NVIDIA GeForce RTX 3060 Ti", vram_mib=8192, driver="560.94"),
        torch=lambda: TorchInfo(
            version="2.6.0+cu124",
            cuda="12.4",
            cuda_available=True,
            device="NVIDIA GeForce RTX 3060 Ti",
        ),
        ffmpeg=lambda: "ffmpeg version 7.1-full_build",
        ytdlp=lambda: "2026.08.19",
    )


@pytest.fixture
def project(tmp_path, monkeypatch):
    """A temporary project root, used by the config through MOOD_ROOT."""
    monkeypatch.setenv("MOOD_ROOT", str(tmp_path))
    return tmp_path


@pytest.fixture
def fake_probes(monkeypatch):
    """Replace the real probes used by `mood doctor` with fakes; returns a setter."""

    def use(probes: Probes) -> None:
        monkeypatch.setattr(doctor.Probes, "default", classmethod(lambda cls: probes))

    use(healthy_probes())
    return use


@pytest.fixture
def run_mood(capsys):
    """Run the CLI in-process; returns (exit code, stdout, stderr)."""

    def run(*args: str) -> tuple[int, str, str]:
        code = cli.main(list(args))
        out = capsys.readouterr()
        return code, out.out, out.err

    return run


def parse_json(stdout: str) -> dict:
    """The output must be exactly one JSON document."""
    return json.loads(stdout)
