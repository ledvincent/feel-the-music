---
okf_version: "0.2"
---
# Project knowledge

* [Log](log.md) - what changed in this knowledge, newest first

# Architecture

* [Architecture overview](architecture/overview.md) - Local Python CLI tools (mood) do ingest, search and rendering on one GPU PC; Claude Code drives them and does the creative judgement.
* [Tech stack](architecture/tech-stack.md) - Python 3.12 managed with uv, PyTorch with CUDA on an 8 GB RTX 3060 Ti, LanceDB, SigLIP and FFmpeg; local and free only.

# Domain

* [Beat grid](domain/beat-grid.md) - The song's tempo, beat times and downbeat times, with word timings, all in song time: the clock every cut is placed on.
* [Cheap pass](domain/cheap-pass.md) - The first analysis every shot gets: a look embedding, zero-shot tags and measured stats, plus junk deletion.
* [Contact sheet](domain/contact-sheet.md) - One image showing a frame from each top search result, labelled with shot id and rank, to check search quality by eye.
* [Emotional arc](domain/emotional-arc.md) - The few phases a reel goes through, each with a feeling, a visual direction and a palette, written by Claude for the section.
* [Expensive pass](domain/expensive-pass.md) - The second analysis, only for shots that survived the cheap pass: a vision-language model writes a caption and structured details.
* [Grade](domain/grade.md) - The one colour treatment applied to every shot of a reel at render time, so shots from different sources look like one film.
* [Moment library](domain/moment-library.md) - The searchable collection of analysed shots built from every video placed in the inbox, grown over time.
* [Palette](domain/palette.md) - The colour and light a phase of the emotional arc asks for, used to pick shots that look right together.
* [Reel](domain/reel.md) - A silent 9:16 video of 20 to 30 seconds, made of short shots that match one section of a song, with the lyrics styled on screen.
* [Section](domain/section.md) - The 20 to 30 seconds of a song a reel covers, set by the owner with exact start and end times in song time.
* [Shot](domain/shot.md) - One continuous take cut out of a source video, the unit the library stores, searches and puts in reels.
* [Start-time note](domain/start-time-note.md) - The note written next to each reel giving the song, the artist and where the Instagram audio must start for the lyrics to line up.

# Decisions

* [A fixed emotion list](decisions/006-fixed-emotion-list.md) - One list of 12 emotions, defined once in code, is shared by zero-shot tagging, the vision-language model and search.
* [Claude Code orchestrates local tools](decisions/001-claude-code-orchestrates-local-tools.md) - Claude Code drives the mood CLI and does the creative judgement; Python tools do the heavy, deterministic and GPU work.
* [Cuts on beats, placed by the lyrics](decisions/009-cuts-on-the-beat.md) - Every cut after the first shot lands on a beat, preferably the beat after a lyric line ends or the beat at a line's meaningful word.
* [Keeper clips as the long-term library](decisions/007-keeper-clips-as-library.md) - Keeper shots are exported as small clips and reels render from them, so source films can be deleted.
* [LanceDB, one row per shot](decisions/004-lancedb-one-row-per-shot.md) - The moment library is a LanceDB table with one row per shot, its embedding stored next to its metadata.
* [One large GPU model at a time, pass by pass](decisions/003-one-gpu-model-at-a-time.md) - Ingest and song analysis run in passes, each loading one model, processing a batch and freeing GPU memory before the next.
* [Python 3.12 with uv on Windows and CUDA](decisions/002-python-312-uv-windows-cuda.md) - The project is a Python 3.12 package managed with uv, using the CUDA build of PyTorch on Windows.
* [SigLIP for look embeddings and zero-shot tags](decisions/005-siglip-embeddings-and-tags.md) - One SigLIP model gives every shot its look embedding and its zero-shot emotion, content and shot-type tags, and embeds search text.
* [Song audio from YouTube with yt-dlp](decisions/008-song-audio-from-youtube.md) - The song's audio is downloaded with yt-dlp for analysis only, unless the owner gives a file, and checked by duration.

# Data

* [Reel plan](data/reel-plan.md) - The plan.json for one reel: the contract between Claude's planning and the renderer, with every time in song time.
* [Shot and Source tables](data/shot.md) - One LanceDB row per shot with its analysis and lifecycle, and one Source row per ingested video file.

# Integrations

* [Jira](integrations/jira.md) - How this project's Jira is set up - project key, where acceptance criteria live, issue types and the status for each stage; read by /dirox-kit:jira and the other commands
* [LRCLIB](integrations/lrclib.md) - Free lyrics service that gives each song's lyrics text and the recording's duration.
* [YouTube audio through yt-dlp](integrations/youtube-audio.md) - The song's audio is downloaded from YouTube with yt-dlp for beat and word analysis only, never exported.
