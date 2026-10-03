# Credits and endless mode

State: done.

Done: Campaign victory displays a 24-second credits roll with four placeholder authors and a host thank-you. Button or Escape skips directly to endless play. Random existing layouts retain their goals; all tools unlock. Final-stage rain and heat rise by 20% each round, including beyond the usual heat-rate cap. Consecutive identical layouts still reset correctly. Hats and campaign completion remain; retries preserve round and route. Co-op entry is leader-only, with shared round transitions and entry checkpoints.

Checks: 131 unit tests passed, including difficulty growth and authoritative co-op entry/retry. Production build and document check passed. All seven campaign/credits browser checks passed, including natural completion, Escape skip, reduced motion, campaign-to-endless flow and repeated random rounds. The briefing audio test now isolates narration from intentional ambient gameplay voices.

Next: None. Tuning and credit text live in config/endless.ts.
