# Spec Delta

## Purpose

Finds the shots in the moment library that fit one phase of a reel: right emotion and content, closest visual feel, and a consistent look across the sequence.

## ADDED Requirements

### Requirement: Filter by emotion and content
A search SHALL only return shots whose emotion and content tags fit the request, so a section never pulls a shot of the opposite mood.

#### Scenario: No party shot in heartbreak
- **WHEN** a search asks for heartbroken shots
- **THEN** no shot tagged as a party or a joyful emotion is returned

#### Scenario: No match
- **WHEN** no shot in the library fits the filters
- **THEN** the search says no shot was found instead of returning unrelated shots

### Requirement: Rank by visual feel
A search SHALL rank the shots that pass the filters by how close their look is to a visual description (what is seen, light, framing), not to emotion words.

#### Scenario: Closest look first
- **WHEN** a search gives the visual description "rain on a window at night, blue light"
- **THEN** shots whose look matches that description come before shots that do not

### Requirement: Keep the sequence consistent
A search SHALL use the measured brightness, warmth and motion of shots to keep the shots chosen for one reel visually consistent with the phase's colour and light palette.

#### Scenario: Palette respected
- **WHEN** a search asks for a warm, dim palette
- **THEN** cold or bright shots rank below warm, dim ones

### Requirement: Candidates with captions for the final choice
A search SHALL return its top candidates with their captions and tags, so Claude can read them and make the final choice for flow and variety.

#### Scenario: Candidates readable
- **WHEN** a search returns candidates
- **THEN** each candidate shows its shot id, caption, emotion, shot type and measured stats

### Requirement: Contact sheets
The system SHALL produce a contact sheet of a search's top results, a single image with one frame from each shot, to check search quality by eye.

#### Scenario: Contact sheet for a search
- **WHEN** a contact sheet is asked for a search
- **THEN** an image shows one frame of each top result, labelled with its shot id and rank
