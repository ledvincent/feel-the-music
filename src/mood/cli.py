"""The `mood` command line (design D2, D3).

Every command accepts --json before or after its name. With it, the command
prints exactly one JSON document on stdout, errors included, so Claude Code can
read the result. Commands never print directly: they return a result dict and
`emit` renders it as JSON or as text for a person.
"""

from __future__ import annotations

import json
import sys
from collections.abc import Callable
from typing import Annotated

import typer
from typer.exceptions import TyperException

from mood import config as config_module
from mood import doctor as doctor_module

app = typer.Typer(
    help="Moodcut: turn indie love songs into silent, cinematic 9:16 reels.",
    no_args_is_help=True,
    add_completion=False,
    pretty_exceptions_enable=False,
)

# The shared option every command declares, so `mood <command> --json` works.
JsonOption = Annotated[
    bool, typer.Option("--json", help="Print one JSON document instead of text.")
]


@app.callback()
def _root(ctx: typer.Context, json_: JsonOption = False) -> None:
    """Moodcut command line. Run `mood doctor` first on a new machine."""
    ctx.obj = {"json": json_}


def json_mode(ctx: typer.Context, json_: bool) -> bool:
    return json_ or bool((ctx.obj or {}).get("json"))


def emit(
    ctx: typer.Context, json_: bool, result: dict, text: Callable[[dict], str], code: int = 0
) -> None:
    """Print a command's result as JSON or text, then exit with `code`."""
    if json_mode(ctx, json_):
        typer.echo(json.dumps(result, ensure_ascii=False))
    else:
        typer.echo(text(result))
    raise typer.Exit(code)


@app.command()
def doctor(ctx: typer.Context, json_: JsonOption = False) -> None:
    """Check the GPU, CUDA PyTorch, FFmpeg, yt-dlp and the working folders."""
    config = config_module.load_config()
    result = doctor_module.run_doctor(config, doctor_module.Probes.default())
    emit(ctx, json_, result, doctor_module.doctor_text, code=0 if result["ok"] else 1)


def _fail(message: str, as_json: bool, code: int) -> int:
    if as_json:
        typer.echo(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    else:
        typer.echo(f"Error: {message}", err=True)
    return code


def main(argv: list[str] | None = None) -> int:
    """Entry point of the `mood` script. Turns every error into a clean exit code."""
    args = list(sys.argv[1:] if argv is None else argv)
    as_json = "--json" in args
    command = typer.main.get_command(app)
    try:
        # Not standalone: typer returns the exit code instead of calling sys.exit,
        # and raises usage errors (unknown command, bad option) for us to render.
        code = command.main(args=args, prog_name="mood", standalone_mode=False)
    except typer.Exit as exc:
        return exc.exit_code
    except typer.Abort:
        return _fail("aborted", as_json, 1)
    except TyperException as exc:
        if not as_json and hasattr(exc, "show"):
            exc.show()
            return exc.exit_code
        return _fail(exc.format_message(), as_json, exc.exit_code or 2)
    except config_module.ConfigError as exc:
        return _fail(str(exc), as_json, 1)
    except Exception as exc:  # noqa: BLE001 - last resort: never a traceback in JSON mode
        if not as_json:
            raise
        return _fail(f"{type(exc).__name__}: {exc}", as_json, 1)
    return code if isinstance(code, int) else 0


def run() -> None:
    sys.exit(main())
