# Spec Delta

## Purpose

Turns any video file placed in the inbox into individual, analysed shots stored in the moment library, so scenes can later be found by feeling, content and look.

## ADDED Requirements

### Requirement: Ingest videos from the inbox
The system SHALL take every video file placed in the `inbox/` folder (films, compilations, stock footage, home movies) as input to the moment library, whatever its source.

#### Scenario: Video in inbox is ingested
- **WHEN** a video file is in `inbox/` and ingest runs
- **THEN** the video's shots are added to the moment library

#### Scenario: Same file twice
- **WHEN** ingest runs on a video that was already ingested
- **THEN** no duplicate shots are added to the moment library

#### Scenario: Processed file leaves inbox
- **WHEN** a video has been ingested
- **THEN** it is no longer in `inbox/`

### Requirement: Split videos into shots
The system SHALL split each ingested video into individual shots, each with its source file and its start and end time in that file.

#### Scenario: Shots follow cuts
- **WHEN** a video with several cuts is ingested
- **THEN** the library holds one shot per continuous take, with its source file, start time and end time

### Requirement: Cheap pass on every shot
The system SHALL compute for every shot: an embedding of its look, zero-shot tags for emotion, content and shot type, and measured brightness, warmth and motion.

#### Scenario: Every shot is measured
- **WHEN** a video's shots are stored
- **THEN** each shot has a look embedding, emotion, content and shot-type tags, and brightness, warmth and motion values

### Requirement: Remove unusable shots
The system SHALL remove shots that are credits, shots with burned-in subtitles and black frames, so they never reach the expensive pass or a reel.

#### Scenario: Credits removed
- **WHEN** a video's end credits are ingested
- **THEN** no credits shot is kept in the moment library

#### Scenario: Subtitles removed
- **WHEN** a shot shows burned-in subtitles
- **THEN** the shot is not kept in the moment library

#### Scenario: Black frames removed
- **WHEN** a shot is black frames
- **THEN** the shot is not kept in the moment library

### Requirement: Expensive pass on surviving shots
The system SHALL describe every shot that survives the cheap pass with a caption, one emotion from the fixed emotion list, the number of people, the shot type, the setting and the time of day.

#### Scenario: Surviving shot is described
- **WHEN** a shot survives the cheap pass
- **THEN** it has a caption, an emotion from the fixed list, a people count, a shot type, a setting and a time of day

#### Scenario: Emotion stays in the list
- **WHEN** the description of a shot names an emotion
- **THEN** the stored emotion is one of the fixed emotion list

### Requirement: One row per shot
The moment library SHALL store exactly one record per shot, holding everything the cheap and expensive passes produced for it.

#### Scenario: One record per shot
- **WHEN** a video is fully ingested
- **THEN** each of its kept shots appears exactly once in the moment library with all its analysis

### Requirement: Fit the GPU
Every model used by ingest SHALL run within 8 GB of VRAM, with only one large model loaded at a time, and without any paid API.

#### Scenario: Runs on an 8 GB GPU
- **WHEN** ingest runs on an RTX 3060 Ti with 8 GB of VRAM
- **THEN** it completes without running out of GPU memory and without calling a paid service

### Requirement: Export keeper shots as small clips
The system SHALL be able to export keeper shots as small clips so the library stays around 5–15 GB and source videos are not needed to render a reel.

#### Scenario: Keeper exported
- **WHEN** a shot is a keeper and export runs
- **THEN** a small clip of that shot exists and a reel can use it without the source video
