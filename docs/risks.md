Remaining Phase 9 operational risks:
1. Candidate scan uses bounded over-scan, not full pagination. If more than 500 old under-cap active worries precede eligible worries, eligible candidates may still be delayed.
2. The new Firestore query may require a production composite index for status + createdAt. Verify once against the deployed Firebase project before relying on the scheduled job.