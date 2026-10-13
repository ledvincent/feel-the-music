# Spec Delta

## Purpose

Lets the owner look through shots in the moment library and reject bad ones, so search results get better over time.

## ADDED Requirements

### Requirement: Review page
The system SHALL offer a local review page that shows shots from the moment library with their caption and tags, and lets the owner reject a shot. Knowledge: `okf/domain/shot.md`

#### Scenario: Reject a shot
- **WHEN** the owner rejects a shot on the review page
- **THEN** the shot is recorded as rejected in the moment library

### Requirement: Rejections improve results
Rejected shots SHALL stop being used, so results improve over time. Knowledge: `okf/domain/shot.md`

#### Scenario: Rejected shot never returned
- **WHEN** a shot has been rejected
- **THEN** no search returns it and no reel uses it
