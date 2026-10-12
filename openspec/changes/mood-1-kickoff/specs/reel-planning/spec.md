# Spec Delta

## Purpose

Takes a song request made in Claude Code and turns it into a planned reel: the song's lyrics, audio, beat grid and word timings, the 20–30 second section the owner sets, an emotional arc of phases, and the sequence of shots, cut on the beat, that will be rendered. Every time in the plan is song time (seconds from the start of the recording), the same clock as Instagram's audio start.

## ADDED Requirements

### Requirement: Start from a song request
The workflow SHALL start when the owner asks Claude Code for "reel for [song] by [artist]" and SHALL end with a rendered reel without any manual editing.

#### Scenario: Request to reel
- **WHEN** the owner asks for "reel for [song] by [artist]"
- **THEN** the workflow asks for the section times if they were not given, and runs through lyrics, audio, beats, word timings, section, arc, shot selection and render, and gives the reel and its start-time note

### Requirement: Song lyrics
The workflow SHALL get the song's lyrics and the recording's duration from LRCLIB, or use lyrics pasted by the owner.

#### Scenario: Lyrics from LRCLIB
- **WHEN** LRCLIB has the song
- **THEN** the workflow uses its lyrics and its duration

#### Scenario: Pasted lyrics
- **WHEN** the owner pastes lyrics
- **THEN** the workflow uses the pasted lyrics instead of LRCLIB

#### Scenario: Lyrics not found
- **WHEN** LRCLIB does not have the song
- **THEN** the workflow asks the owner to paste the lyrics

### Requirement: Song audio
The workflow SHALL get the song's audio by downloading it with yt-dlp from the song and artist, or use an audio file given by the owner. The audio is used only for analysis: it stays local and is never part of the exported reel. Its duration SHALL be checked against the recording's duration, so all timings come from the same recording Instagram plays and not a live version, remix or edit. Knowledge: `okf/integrations/youtube-audio.md`

#### Scenario: Audio downloaded
- **WHEN** no audio file is given for the song
- **THEN** the workflow downloads the song's audio with yt-dlp

#### Scenario: Audio given by the owner
- **WHEN** the owner gives an audio file for the song
- **THEN** the workflow uses that file and downloads nothing

#### Scenario: Wrong version
- **WHEN** the audio's duration differs from the LRCLIB duration by more than 2 seconds
- **THEN** the workflow says so, shows both durations, and asks the owner for another link or a file instead of continuing

#### Scenario: No reference duration
- **WHEN** the lyrics were pasted, so there is no LRCLIB duration
- **THEN** the workflow shows the audio's duration and asks the owner to confirm it matches the song on Instagram

### Requirement: Beat grid
The workflow SHALL detect the song's tempo, beats and downbeats (the first beat of each bar) from the audio and store them in the reel plan. Knowledge: `okf/domain/beat-grid.md`

#### Scenario: Beats detected
- **WHEN** the audio is analysed
- **THEN** the reel plan holds the tempo and the song time of every beat and downbeat

#### Scenario: Unsteady beat
- **WHEN** the detected beats are irregular in the section (for example a free-time intro)
- **THEN** the workflow shows the tempo and warns the owner before planning shots

### Requirement: Word timings
The workflow SHALL align the lyrics to the audio, giving the song time at which every word starts and ends and every line ends. LRCLIB's line timings are not trusted for this. Knowledge: `okf/domain/beat-grid.md`

#### Scenario: Words aligned
- **WHEN** the lyrics are aligned to the audio
- **THEN** every lyric word in the section has a start and an end in song time

### Requirement: Owner sets the section
The owner SHALL set the section of the song the reel uses, by giving its exact start and end times. The workflow uses those times exactly, never moving them (not even to a beat), and never chooses the section itself. When asked, Claude can suggest sections with their lyrics, but the owner sets the times. Before planning shots, the workflow shows the section (times, length, lyrics) and the owner confirms it. Knowledge: `okf/domain/section.md`

#### Scenario: Times used exactly
- **WHEN** the owner gives a start and an end time
- **THEN** the section starts and ends at exactly those times, even when they fall between beats

#### Scenario: Section confirmed
- **WHEN** the section is set
- **THEN** the workflow shows its times, length and lyrics and waits for the owner to confirm before planning shots

#### Scenario: No times given
- **WHEN** the owner asks for a reel without giving section times
- **THEN** the workflow asks for them, and offers to suggest sections; it does not pick one itself

#### Scenario: Unusual length
- **WHEN** the section the owner sets is shorter than 20 or longer than 30 seconds
- **THEN** the workflow says so and continues only if the owner confirms

### Requirement: Emotional arc
The workflow SHALL write an emotional arc for the section: a few phases, each with a feeling, a visual direction and one colour and light palette, based on the song's feeling rather than its literal words. Phases change on downbeats. For each lyric line, the arc names its meaningful word: the word that carries the line's feeling. Knowledge: `okf/domain/emotional-arc.md`

#### Scenario: Arc has phases
- **WHEN** the arc is written
- **THEN** it has a few phases covering the whole section, each with a feeling, a visual direction and a palette

#### Scenario: Feeling, not words
- **WHEN** a lyric line names a concrete object
- **THEN** the phase's visual direction follows the line's feeling and does not require that object on screen

#### Scenario: Phases change on downbeats
- **WHEN** one phase ends and the next begins
- **THEN** the change falls on a downbeat

#### Scenario: Meaningful word per line
- **WHEN** the arc is written
- **THEN** every lyric line in the section has one meaningful word

### Requirement: Shot selection
The workflow SHALL search the moment library for each phase and pick a sequence of shots that fills the section and flows well, without reusing a shot in the same reel.

#### Scenario: Section filled
- **WHEN** shots are selected
- **THEN** their total length covers the whole section, phase by phase

#### Scenario: No repeated shot
- **WHEN** shots are selected for a reel
- **THEN** no shot appears twice

#### Scenario: Shot long enough
- **WHEN** a shot is planned to fill a stretch of time
- **THEN** the shot's usable length in the library is at least that long, so it is never frozen or looped

### Requirement: Cuts on the beat
The reel's first shot SHALL start at the section start. Every later cut SHALL fall on a beat, so scene changes never lag behind the music. Cuts are placed, in order of preference: on the first beat after a lyric line ends; on the beat closest to the start of a line's meaningful word; on another beat when needed to keep shots within their usable length or the phase's pace. Calm phases hold shots for more beats than intense phases. Knowledge: `okf/domain/beat-grid.md`

#### Scenario: Cut on a beat
- **WHEN** the shot sequence is planned
- **THEN** every cut after the first shot is at the song time of a beat

#### Scenario: Cut after a line
- **WHEN** a lyric line ends and the plan cuts before the next line's meaningful word
- **THEN** the cut is on the first beat after the line ends

#### Scenario: Cut on a meaningful word
- **WHEN** the plan cuts within a lyric line
- **THEN** the cut is on the beat closest to the start of that line's meaningful word

#### Scenario: Pace follows the phase
- **WHEN** a phase is calm
- **THEN** its shots last more beats on average than the shots of an intense phase in the same reel
