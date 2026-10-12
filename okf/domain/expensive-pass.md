---
type: Glossary Term
title: Expensive pass
description: "The second analysis, only for shots that survived the cheap pass: a vision-language model writes a caption and structured details."
owner: ledvincent
status: stable
tags: [domain]
---
# Expensive pass

## Definition
A small vision-language model describes each surviving shot: a caption, one emotion from the fixed list, the number of people, the shot type, the setting and the time of day.

## Not to be confused with
- [Cheap pass](/domain/cheap-pass.md): every shot, fast, no captions.

## Rules
- The emotion is always one of the [fixed list](/decisions/006-fixed-emotion-list.md).
- A shot with its expensive pass, not rejected, is a keeper ([/domain/shot.md](/domain/shot.md)).

## Where it is used
Specs: `openspec/specs/footage-ingest/spec.md`.
