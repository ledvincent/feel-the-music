# Decisions

* [A fixed emotion list](006-fixed-emotion-list.md) - One list of 12 emotions, defined once in code, is shared by zero-shot tagging, the vision-language model and search.
* [Claude Code orchestrates local tools](001-claude-code-orchestrates-local-tools.md) - Claude Code drives the mood CLI and does the creative judgement; Python tools do the heavy, deterministic and GPU work.
* [Cuts on beats, placed by the lyrics](009-cuts-on-the-beat.md) - Every cut after the first shot lands on a beat, preferably the beat after a lyric line ends or the beat at a line's meaningful word.
* [Keeper clips as the long-term library](007-keeper-clips-as-library.md) - Keeper shots are exported as small clips and reels render from them, so source films can be deleted.
* [LanceDB, one row per shot](004-lancedb-one-row-per-shot.md) - The moment library is a LanceDB table with one row per shot, its embedding stored next to its metadata.
* [One large GPU model at a time, pass by pass](003-one-gpu-model-at-a-time.md) - Ingest and song analysis run in passes, each loading one model, processing a batch and freeing GPU memory before the next.
* [Python 3.12 with uv on Windows and CUDA](002-python-312-uv-windows-cuda.md) - The project is a Python 3.12 package managed with uv, using the CUDA build of PyTorch on Windows.
* [SigLIP for look embeddings and zero-shot tags](005-siglip-embeddings-and-tags.md) - One SigLIP model gives every shot its look embedding and its zero-shot emotion, content and shot-type tags, and embeds search text.
* [Song audio from YouTube with yt-dlp](008-song-audio-from-youtube.md) - The song's audio is downloaded with yt-dlp for analysis only, unless the owner gives a file, and checked by duration.
