# Codex Session Notes

## Essence

This is a no-build, local-first prototype for fast tabletop scorekeeping. The user values quick visible progress, but not throwaway structure. Keep the app easy to open, easy to change, and hard to accidentally break during live play.

## Product Feel

- Clean, concise, tactile.
- Fun and comforting, but not childish.
- Phone-first by default, with a practical wide layout for desktop or horizontal phone use.
- The score sheet should feel lightly paper-like: columns, running totals, little marks, but not a fake notebook.
- Avoid overexplaining in the UI. Controls should do the work.

## User Preferences

- Branding should be swappable from one place.
- Active game state matters. Browsing history must never load an old game into the current session.
- Saving is opt-in by mode:
  - `Sessionless`: only save when the user chooses `Save Game` at the end.
  - `Save All Games`: finished games are archived automatically.
- Dangerous actions need a safe second step. Current pattern: `End Game` arms a `Keep Playing` / `End Now` choice.
- Recent player names and layout preference should make replays easy.

## Current Architecture

- `index.html`: no-build browser entry.
- `app.js`: DOM rendering, event handling, localStorage adapters, screen navigation.
- `core.js`: pure game logic for scoring, rounds, rankings, winner treatment, default players, and archive snapshots.
- `styles.css`: phone-first styling plus wide layout.
- `tests/core.test.js`: Node tests for core behavior.

## Important Behaviors

- Last Tile +6 ends the game and assigns winner treatment.
- Manual End Game locks scores, shows final scores, and does not assign a winner.
- Game History is a visual archive only.
- Photo upload is intentionally a placeholder until storage strategy is chosen.
- Old games store full score sheet data, notes, final scores, players, dates, status, and end reason.

## Future Touches

- Add delete/rename for saved games.
- Add true photo attachment only after deciding storage limits and backend direction.
- Consider export/import of saved game history.
- Revisit the table visualization after a few real uses; keep it low-fidelity and calm.
