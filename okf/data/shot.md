---
type: Data Entity
title: Shot and Source tables
description: One LanceDB row per shot with its analysis and lifecycle, and one Source row per ingested video file.
owner: ledvincent
status: stable
tags: [data, lancedb]
---
# Shot and Source tables

Stored in LanceDB under `library/` ([/decisions/004-lancedb-one-row-per-shot.md](/decisions/004-lancedb-one-row-per-shot.md)). Term: [/domain/shot.md](/domain/shot.md).

# Schema
**Shot**
| Field | Type | Meaning | Notes |
|---|---|---|---|
| shot_id | string | Unique id | primary key |
| source_file, source_hash | string | Where the shot comes from | links to Source |
| start_s, end_s, duration_s | float | Position in the source, seconds | |
| embedding | vector | SigLIP look embedding | cheap pass |
| emotion_tags, content_tags, shot_type_tag | list / string | Zero-shot tags | cheap pass |
| brightness, warmth, motion | float | Measured stats | cheap pass |
| caption, emotion, people_count, shot_type, setting, time_of_day | mixed | Description | expensive pass; emotion from the fixed list |
| keeper | bool | Survived junk removal, described, not rejected | |
| clip_path | string | Exported clip under `library/clips/` | |
| rejected, rejected_at | bool, datetime | Owner rejected it on the review page | |
| ingested_at, pipeline_version | datetime, int | When and by which pipeline version | |

**Source**
| Field | Type | Meaning | Notes |
|---|---|---|---|
| source_hash | string | Content hash of the file | primary key; ingest skips a known hash |
| path | string | Current place of the file | updated when it moves to `processed/` |
| ingested_at, shot_count | datetime, int | | |

## Relations
Many Shots per Source. Reel plans ([/data/reel-plan.md](/data/reel-plan.md)) reference `shot_id`s.

## Lifecycle
Created by `mood ingest`; junk shots are deleted before they are stored. Passes fill columns; raising `pipeline_version` re-processes older rows. Rejection is set by `mood review`. No personal data, apart from people appearing in home movies.
