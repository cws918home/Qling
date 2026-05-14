# Qling Matching Algorithm

This document describes the implemented PRD matching policy. `docs/PRD.md` remains the product source of truth; this file is the operational summary for engineers.

## Initial Publication

Publishing a non-example worry creates exactly 5 human deliveries:

- 4 matched slots.
- 1 random slot.
- 0 AI replies at publication time.

Eligible recipients must satisfy all of these constraints:

- Not the worry author.
- Not deleted or inactive.
- Has a valid profile with gender and interests.
- `activeDeliveryCount < 10`.
- Has not previously received, passed, or replied to the same worry.
- Push token is not required.

Matched slots rank eligible users by:

1. Category overlap with the worry matching categories, descending.
2. `helpedCount`, descending.
3. Same gender as the author before other genders.
4. Random tie breaker for otherwise equal candidates.

The random slot uses the same eligibility constraints but ignores category overlap, `helpedCount`, and gender ranking. It is selected from users not already selected for the matched slots.

If fewer than 5 eligible users exist, publication fails with a clear server error. The server writes no partial worry, delivery batch, delivery, counter, moderation, or push state for that failed publication.

## Pass Replacement

Passing an active delivery is a server-owned mutation. It marks the delivery passed, decrements the passer's `activeDeliveryCount`, and attempts one immediate replacement when an eligible recipient exists.

Pass replacement does not create Round 1 or Round 2 rematch batches. It is separate from the scheduled additive rematch job.

## Scheduled Rematch

The internal rematch job runs after the configured 8-hour delay and is additive:

- Round 0 is the initial publication batch.
- Round 1 may be created from Round 0.
- Round 2 may be created from Round 1.
- There is no Round 3.
- Historical earlier batches do not branch into independent rematches.
- Existing active deliveries remain answerable.
- Human deliveries never exceed the worry's cap of 15.

Rematch keeps the same recipient eligibility constraints as initial publication, including no duplicate same-worry delivery and `activeDeliveryCount < 10`.

Replacement batch sizing is based on the previous round source batch. If the source batch's random-slot recipient has already answered, replacement slots are matched-only. If that random-slot recipient has not answered, the replacement batch includes one random slot when capacity allows.

## AI Fallback

AI fallback is not part of initial publication or human rematching. It is a separate 24-hour internal job.

The AI fallback job may create one AI reply only when:

- The human delivery cap has been exhausted.
- The worry has zero human replies.
- No AI reply already exists.

AI replies are moderated before save and are stored as AI-generated replies internally.
