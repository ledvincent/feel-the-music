"""Requirements: Doctor checks the machine, Doctor reports every failure (openspec mood-cli)."""

from __future__ import annotations

from dataclasses import replace

import pytest

from mood.config import load_config
from mood.doctor import FAILED, OK, WARNING, GpuInfo, TorchInfo, run_doctor
from tests.conftest import healthy_probes, parse_json


def by_name(result: dict) -> dict:
    return {c["name"]: c for c in result["checks"]}


def test_healthy_machine(project, fake_probes, run_mood):
    code, stdout, _ = run_mood("doctor", "--json")

    result = parse_json(stdout)
    checks = by_name(result)
    assert code == 0
    assert result["ok"] is True
    assert all(c["status"] == OK for c in result["checks"])
    assert "RTX 3060 Ti" in checks["gpu"]["value"]
    assert checks["vram"]["value"] == "8.0 GB"
    assert "2.6.0" in checks["pytorch"]["value"] and "12.4" in checks["pytorch"]["value"]
    assert "ffmpeg version 7.1" in checks["ffmpeg"]["value"]
    assert checks["yt-dlp"]["value"] == "2026.08.19"


def test_healthy_machine_text_output(project, fake_probes, run_mood):
    code, stdout, _ = run_mood("doctor")

    assert code == 0
    assert "RTX 3060 Ti" in stdout and "8.0 GB" in stdout


@pytest.mark.parametrize("vram_mib, shown", [(6144, "6.0 GB"), (7782, "7.6 GB")])
def test_low_vram_is_a_warning(project, fake_probes, run_mood, vram_mib, shown):
    probes = healthy_probes()
    probes.gpu = lambda: GpuInfo(name="NVIDIA GeForce RTX", vram_mib=vram_mib, driver="560.94")
    fake_probes(probes)

    code, stdout, _ = run_mood("doctor", "--json")

    vram = by_name(parse_json(stdout))["vram"]
    assert vram["status"] == WARNING
    assert vram["value"] == shown
    assert code == 0


def test_cpu_only_pytorch_fails_the_check(project):
    probes = healthy_probes()
    cpu_build = TorchInfo(version="2.6.0+cpu", cuda=None, cuda_available=False, device=None)
    no_gpu = TorchInfo(version="2.6.0+cu124", cuda="12.4", cuda_available=False, device=None)

    for info in (cpu_build, no_gpu):
        probes.torch = lambda info=info: info
        pytorch = by_name(run_doctor(load_config(project), probes))["pytorch"]

        assert pytorch["status"] == FAILED
        assert pytorch["hint"]
    probes.torch = lambda: cpu_build
    assert "CUDA build" in by_name(run_doctor(load_config(project), probes))["pytorch"]["hint"]
    probes.torch = lambda: no_gpu
    assert "driver" in by_name(run_doctor(load_config(project), probes))["pytorch"]["hint"]


def test_doctor_shows_the_folders(project, fake_probes, run_mood):
    (project / "inbox").mkdir()

    _, stdout, _ = run_mood("doctor", "--json")

    folders = {f["name"]: f for f in parse_json(stdout)["folders"]}
    assert set(folders) == {"inbox", "processed", "library", "audio", "reels", "models"}
    assert folders["inbox"]["exists"] is True
    assert folders["library"]["exists"] is False
    assert folders["inbox"]["path"] == str(project.resolve() / "inbox")


def test_doctor_reports_every_failure(project):
    probes = replace(healthy_probes(), ffmpeg=lambda: None, ytdlp=lambda: None)

    checks = by_name(run_doctor(load_config(project), probes))

    assert checks["ffmpeg"]["status"] == FAILED and checks["ffmpeg"]["hint"]
    assert checks["yt-dlp"]["status"] == FAILED and checks["yt-dlp"]["hint"]
    assert checks["ffmpeg"]["hint"] != checks["yt-dlp"]["hint"]
    assert checks["gpu"]["status"] == OK and checks["pytorch"]["status"] == OK


def test_doctor_reports_every_failure_when_a_probe_crashes(project):
    def broken():
        raise RuntimeError("driver exploded")

    probes = replace(healthy_probes(), gpu=broken, ffmpeg=lambda: None)

    checks = by_name(run_doctor(load_config(project), probes))

    assert checks["gpu"]["status"] == FAILED
    assert checks["ffmpeg"]["status"] == FAILED
    assert checks["yt-dlp"]["status"] == OK


def test_doctor_exit_code(project, fake_probes, run_mood):
    fake_probes(replace(healthy_probes(), ffmpeg=lambda: None))

    code_json, stdout, _ = run_mood("doctor", "--json")
    code_text, _, _ = run_mood("doctor")

    assert parse_json(stdout)["ok"] is False
    assert code_json != 0
    assert code_text != 0
