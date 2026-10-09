# Spec Delta

## Purpose

Takes a song request made in Claude Code and turns it into a planned reel: the song's audio and beat grid, the timed lyrics of its strongest 20–30 seconds, an emotional arc of phases, and the sequence of shots, cut on the beat, that will be rendered.

## ADDED Requirements

### Requirement: Start from a song request
The workflow SHALL start when the owner asks Claude Code for "reel for [song] by [artist]" and SHALL end with a rendered reel without any manual editing.

#### Scenario: Request to reel
- **WHEN** the owner asks for "reel for [song] by [artist]"
- **THEN** the workflow runs through audio, beats, lyrics, section, arc, shot selection and render, and gives the reel and its start-time note

### Requirement: Song audio
The workflow SHALL get the song's audio by downloading it with yt-dlp from the song and artist, or use an audio file given by the owner. The audio is used only for analysis: it stays local and is never part of the exported reel. The downloaded version SHALL be checked against the song's duration from LRCLIB, so a live version, remix or edit is not used by mistake.

#### Scenario: Audio downloaded
- **WHEN** no audio file is given for the song
- **THEN** the workflow downloads the song's audio with yt-dlp

#### Scenario: Audio given by the owner
- **WHEN** the owner gives an audio file for the song
- **THEN** the workflow uses that file and downloads nothing

#### Scenario: Wrong version
- **WHEN** the downloaded audio's duration differs from the LRCLIB duration by more than 2 seconds
- **THEN** the workflow says so, shows both durations, and asks the owner for another link or a file instead of continuing

### Requirement: Beat grid
The workflow SHALL detect the song's beats and downbeats (the first beat of each bar) and its tempo from the audio, and store them in the reel plan. Knowledge: `okf/domain/beat-grid.md`

#### Scenario: Beats detected
- **WHEN** the audio is analysed
- **THEN** the reel plan holds the tempo and the time of every beat and downbeat in the song

#### Scenario: No clear beat
- **WHEN** no steady beat is found (for example a free-time ballad)
- **THEN** the workflow says so and falls back to cutting on lyric line starts

### Requirement: Timed lyrics
The workflow SHALL get the song's timed lyrics from LRCLIB, or use timed lyrics pasted by the owner.

#### Scenario: Lyrics from LRCLIB
- **WHEN** LRCLIB has timed lyrics for the song
- **THEN** the workflow uses them

#### Scenario: Pasted lyrics
- **WHEN** the owner pastes timed lyrics
- **THEN** the workflow uses the pasted lyrics instead of LRCLIB

#### Scenario: Lyrics not found
- **WHEN** LRCLIB has no timed lyrics for the song
- **THEN** the workflow asks the owner to paste them

### Requirement: Choose the strongest section
The workflow SHALL pick the strongest 20 to 30 seconds of the song, usually the chorus, starting on a downbeat, and record where that section starts in the song.

#### Scenario: Section length
- **WHEN** a section is chosen
- **THEN** it lasts between 20 and 30 seconds and its start time in the song is known

#### Scenario: Section starts on a downbeat
- **WHEN** a section is chosen and the song has a beat grid
- **THEN** the section starts on a downbeat

### Requirement: Emotional arc
The workflow SHALL write an emotional arc for the section: a few phases, each with a feeling, a visual direction and one colour and light palette, based on the song's feeling rather than its literal words. Phases change on downbeats. Knowledge: `okf/domain/emotional-arc.md`

#### Scenario: Arc has phases
- **WHEN** the arc is written
- **THEN** it has a few phases covering the whole section, each with a feeling, a visual direction and a palette

#### Scenario: Feeling, not words
- **WHEN** a lyric line names a concrete object
- **THEN** the phase's visual direction follows the line's feeling and does not require that object on screen

#### Scenario: Phases change on downbeats
- **WHEN** one phase ends and the next begins
- **THEN** the change falls on a downbeat

### Requirement: Shot selection
The workflow SHALL search the moment library for each phase and pick a sequence of shots that fills the section and flows well, without reusing a shot in the same reel.

#### Scenario: Section filled
- **WHEN** shots are selected
- **THEN** their total length covers the whole section, phase by phase

#### Scenario: No repeated shot
- **WHEN** shots are selected for a reel
- **THEN** no shot appears twice

### Requirement: Cuts on the beat
Every cut between two shots SHALL fall on a beat of the beat grid, so scene changes never lag behind the music. Lyrics are a hint, not the rule: when a lyric line starts close to a beat, the cut may be placed on that beat. The pace follows the phase: calm phases hold shots for several beats, intense phases cut faster. Knowledge: `okf/domain/beat-grid.md`

#### Scenario: Cut on a beat
- **WHEN** the shot sequence is planned
- **THEN** every cut time is a beat time from the beat grid

#### Scenario: Lyric line as a hint
- **WHEN** a lyric line starts within a quarter of a beat of a beat
- **THEN** a cut may be placed on that beat, and never off the beat to match the line

#### Scenario: Pace follows the phase
- **WHEN** a phase is calm
- **THEN** its shots last more beats on average than the shots of an intense phase in the same reel

#### Scenario: Shot long enough
- **WHEN** a shot is planned for a number of beats
- **THEN** the shot's usable length in the library is at least that long, so it is never frozen or looped to fill the time
