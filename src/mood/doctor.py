"""mood doctor: checks that this PC can run the GPU and media passes (design D5).

Each check is independent and returns {name, status, value, hint}; status is
ok, warning or failed. Only failed checks make the exit code non-zero. The
probes are injectable so tests never need a GPU, FFmpeg or yt-dlp.
"""

from __future__ import annotations

import subprocess
from collections.abc import Callable
from dataclasses import dataclass

from mood.config import Config

OK, WARNING, FAILED = "ok", "warning", "failed"
VRAM_BUDGET_GB = 8  # okf/decisions/003-one-gpu-model-at-a-time.md


@dataclass
class GpuInfo:
    name: str
    vram_mib: int
    driver: str


@dataclass
class TorchInfo:
    version: str
    cuda: str | None
    cuda_available: bool
    device: str | None


def _run(cmd: list[str]) -> str | None:
    """stdout of a program, or None when it is missing or fails."""
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=True)
    except (OSError, subprocess.SubprocessError):
        return None
    return out.stdout.strip()


def _probe_gpu() -> GpuInfo | None:
    out = _run(
        [
            "nvidia-smi",
            "--query-gpu=name,memory.total,driver_version",
            "--format=csv,noheader,nounits",
        ]
    )
    if not out:
        return None
    name, vram, driver = (part.strip() for part in out.splitlines()[0].split(","))
    return GpuInfo(name=name, vram_mib=int(float(vram)), driver=driver)


def _probe_torch() -> TorchInfo | None:
    try:
        import torch  # imported here so `mood --help` stays fast
    except ImportError:
        return None
    available = bool(torch.cuda.is_available())
    return TorchInfo(
        version=torch.__version__,
        cuda=torch.version.cuda,
        cuda_available=available,
        device=torch.cuda.get_device_name(0) if available else None,
    )


def _probe_ffmpeg() -> str | None:
    out = _run(["ffmpeg", "-version"])
    return out.splitlines()[0] if out else None


def _probe_ytdlp() -> str | None:
    try:
        from yt_dlp.version import __version__
    except ImportError:
        return None
    return __version__


@dataclass
class Probes:
    gpu: Callable[[], GpuInfo | None] = _probe_gpu
    torch: Callable[[], TorchInfo | None] = _probe_torch
    ffmpeg: Callable[[], str | None] = _probe_ffmpeg
    ytdlp: Callable[[], str | None] = _probe_ytdlp

    @classmethod
    def default(cls) -> Probes:
        return cls()


def _check(name: str, status: str, value: str | None = None, hint: str | None = None) -> dict:
    return {"name": name, "status": status, "value": value, "hint": hint}


def check_gpu(gpu: GpuInfo | None) -> list[dict]:
    if gpu is None:
        hint = (
            "nvidia-smi not found: install the NVIDIA driver "
            "(nvidia-smi is usually in C:\\Windows\\System32)"
        )
        return [
            _check("gpu", FAILED, "no NVIDIA GPU found", hint),
            _check("vram", FAILED, "unknown", "needs the GPU check to pass first"),
        ]
    vram_gb = round(gpu.vram_mib / 1024, 1)
    checks = [_check("gpu", OK, f"{gpu.name}, driver {gpu.driver}")]
    if gpu.vram_mib < VRAM_BUDGET_GB * 1024:
        checks.append(
            _check(
                "vram",
                WARNING,
                f"{vram_gb} GB",
                f"below the {VRAM_BUDGET_GB} GB budget: larger models may not fit",
            )
        )
    else:
        checks.append(_check("vram", OK, f"{vram_gb} GB"))
    return checks


def check_torch(info: TorchInfo | None) -> dict:
    hint = "install the CUDA build of PyTorch: run `uv sync` (torch comes from the cu124 index)"
    if info is None:
        return _check("pytorch", FAILED, "PyTorch not installed", hint)
    if not info.cuda:
        return _check("pytorch", FAILED, f"{info.version}, CPU-only build", hint)
    if not info.cuda_available:
        return _check(
            "pytorch",
            FAILED,
            f"{info.version}, CUDA {info.cuda}, but no GPU visible",
            "PyTorch is the CUDA build but sees no GPU: "
            "check the NVIDIA driver (see the gpu check)",
        )
    return _check("pytorch", OK, f"{info.version}, CUDA {info.cuda}, {info.device}")


def check_ffmpeg(version: str | None) -> dict:
    if version is None:
        return _check(
            "ffmpeg",
            FAILED,
            "not found",
            "install FFmpeg (winget install Gyan.FFmpeg) and make sure it is on PATH",
        )
    return _check("ffmpeg", OK, version)


def check_ytdlp(version: str | None) -> dict:
    if version is None:
        return _check("yt-dlp", FAILED, "not found", "run `uv sync` to install yt-dlp")
    return _check("yt-dlp", OK, version)


def _safely(name: str, run: Callable[[], dict | list[dict]]) -> list[dict]:
    """Run one check; an unexpected error fails that check only."""
    try:
        result = run()
    except Exception as exc:  # noqa: BLE001 - one broken probe must not stop the others
        return [_check(name, FAILED, f"check crashed: {exc}", "report this as a bug")]
    return result if isinstance(result, list) else [result]


def run_doctor(config: Config, probes: Probes | None = None) -> dict:
    probes = probes or Probes.default()
    checks = [
        *_safely("gpu", lambda: check_gpu(probes.gpu())),
        *_safely("pytorch", lambda: check_torch(probes.torch())),
        *_safely("ffmpeg", lambda: check_ffmpeg(probes.ffmpeg())),
        *_safely("yt-dlp", lambda: check_ytdlp(probes.ytdlp())),
    ]
    folders = [
        {"name": name, "path": str(path), "exists": path.is_dir()}
        for name, path in config.folders.items()
    ]
    return {
        "ok": all(c["status"] != FAILED for c in checks),
        "checks": checks,
        "folders": folders,
    }


def doctor_text(result: dict) -> str:
    lines = []
    for c in result["checks"]:
        line = f"{c['name']:<8} {c['status']:<8} {c['value'] or ''}"
        if c["hint"] and c["status"] != OK:
            line += f"\n{'':<17}-> {c['hint']}"
        lines.append(line)
    lines.append("")
    lines.append("Folders:")
    for f in result["folders"]:
        state = "exists" if f["exists"] else "missing"
        lines.append(f"  {f['name']:<9} {state:<8} {f['path']}")
    return "\n".join(lines)
