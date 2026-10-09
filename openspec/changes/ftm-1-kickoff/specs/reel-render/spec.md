# Spec Delta

## Purpose

Produces the final reel from a planned shot sequence: a silent, cinematic 9:16 video with one shared colour grade and stylish lyrics, ready to post with the song added in Instagram.

## ADDED Requirements

### Requirement: Vertical silent video
The renderer SHALL output a 9:16 video of the planned sequence with no audio track.

#### Scenario: Vertical format
- **WHEN** a reel is rendered from landscape shots
- **THEN** the video is 9:16 and each shot is framed to fill it

#### Scenario: Silent export
- **WHEN** a reel is rendered
- **THEN** the video has no audio track

### Requirement: Frame-accurate cuts
The renderer SHALL cut between shots at the times in the reel plan, measured from the section start, to the nearest video frame, so cuts planned on the beat stay on the beat.

#### Scenario: Cut on time
- **WHEN** the plan puts a cut at a given time in the section
- **THEN** the cut happens in the video within one frame of that time

#### Scenario: Length matches the section
- **WHEN** a reel is rendered
- **THEN** the video lasts the length of the section, within one frame

### Requirement: Shared colour grade
The renderer SHALL apply one shared colour grade to every shot of a reel, so shots from different sources look like one film.

#### Scenario: One grade
- **WHEN** a reel mixes shots from different sources
- **THEN** the same grade is applied to all of them

### Requirement: Styled lyrics
The renderer SHALL burn the section's lyrics into the video in a stylish way, each line shown at its timing relative to the section start, with the key word of each line emphasised.

#### Scenario: Lyrics on time
- **WHEN** a lyric line starts at a given time in the section
- **THEN** it appears in the video at that time

#### Scenario: Key word emphasised
- **WHEN** a lyric line is shown
- **THEN** its key word is styled differently from the rest of the line

### Requirement: Start-time note
The renderer SHALL write a note next to each reel giving the time in the song where the Instagram audio must start for the lyrics to line up.

#### Scenario: Note with start time
- **WHEN** a reel is rendered
- **THEN** a note next to it gives the song, the artist and the start time in the song
