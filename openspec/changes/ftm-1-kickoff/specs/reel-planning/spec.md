# Spec Delta

## Purpose

Takes a song request made in Claude Code and turns it into a planned reel: the timed lyrics of its strongest 20–30 seconds, an emotional arc of beats, and the sequence of shots that will be rendered.

## ADDED Requirements

### Requirement: Start from a song request
The workflow SHALL start when the owner asks Claude Code for "reel for [song] by [artist]" and SHALL end with a rendered reel without any manual editing.

#### Scenario: Request to reel
- **WHEN** the owner asks for "reel for [song] by [artist]"
- **THEN** the workflow runs through lyrics, section, arc, shot selection and render, and gives the reel and its start-time note

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
The workflow SHALL pick the strongest 20 to 30 seconds of the song, usually the chorus, and record where that section starts in the song.

#### Scenario: Section length
- **WHEN** a section is chosen
- **THEN** it lasts between 20 and 30 seconds and its start time in the song is known

### Requirement: Emotional arc
The workflow SHALL write an emotional arc for the section: a few beats, each with a feeling, a visual direction and one colour and light palette, based on the song's feeling rather than its literal words.

#### Scenario: Arc has beats
- **WHEN** the arc is written
- **THEN** it has a few beats covering the whole section, each with a feeling, a visual direction and a palette

#### Scenario: Feeling, not words
- **WHEN** a lyric line names a concrete object
- **THEN** the beat's visual direction follows the line's feeling and does not require that object on screen

### Requirement: Shot selection
The workflow SHALL search the moment library for each beat and pick a sequence of shots that fills the section and flows well, without reusing a shot in the same reel.

#### Scenario: Section filled
- **WHEN** shots are selected
- **THEN** their total length covers the whole section, beat by beat

#### Scenario: No repeated shot
- **WHEN** shots are selected for a reel
- **THEN** no shot appears twice
