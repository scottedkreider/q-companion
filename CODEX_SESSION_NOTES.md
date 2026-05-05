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
- Starting a new game from the Start screen should always be possible through `Start Game`; if an active game is in progress, it must ask before abandoning that game.
- Recent player names and layout preference should make replays easy.
- History should feel archival: note editing and deletion are intentionally low-priority controls near the bottom of saved-game detail.

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
- Quick undo is for recent mistakes only and is bounded to five submitted turns.
- Manual score edits are explicitly marked with an edited indicator; quick undo must not create that marker.
- The final game name is read-only by default on results, with an explicit edit/save/cancel flow.
- Table active-player affordance is CSS-only right now; it may become a theme/user option later if the styling keeps evolving.
- The `Last Tile +6` flow is intentionally guarded by a second step before submitting the final turn.
- The Start screen intentionally says `Start Game` even when there is saved/in-progress state. Return-to-current-game is a secondary option after using the Q/main-screen affordance.
- Avoid adding explicit game-name/rules branding to UI copy. It can be optimized for the current scoring rules, but keep the surface brand-generic.
- The user rejected the collapsed line-helper calculator because it made simple mental scoring feel heavier. Keep score entry fast and direct.

## Refactor Notes

- Keep game-state derivations in `core.js` when they can be pure and tested. Recent examples: `isGameInProgress` and `getGameSummary`.
- `app.js` should stay mostly as rendering/event wiring. If a behavior needs branching tests, consider moving the predicate/summary logic into `core.js`.
- Continue using focused Node tests in `tests/core.test.js`; the app is no-build and local-first, so pure tests are the cheapest safety net.
- `next-notes.txt` has been used as task input and is intentionally untracked unless the user says otherwise.

## Future Touches

- Add rename for saved games if archived titles need post-save editing.
- Add true photo attachment only after deciding storage limits and backend direction.
- Consider export/import of saved game history.
- Revisit the table visualization after a few real uses; keep it low-fidelity and calm.
- Consider different game flavors: same/similar scorekeeping shell, but tuned labels, setup, scoring shortcuts, and end-game flows for games such as word-tile games, card games, and party/table games. Keep this as a product direction rather than hard-coding one ruleset into the app.
