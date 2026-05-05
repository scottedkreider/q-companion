# Q Companion

Q Companion is a simple browser-based scorekeeping prototype for live tabletop tile games with Q-style scoring.

## Run Locally

Open `index.html` in a browser. There is no build step and no external dependency.

For phone testing, run:

```sh
npm run phone
```

That starts a local static server, prints the same-Wi-Fi phone URL, and opens a temporary localtunnel URL. Use `npm run phone:lan` if you only want same-Wi-Fi testing without a public tunnel. Press `Ctrl+C` in that terminal when done.

## Test

Run:

```sh
npm test
```

Tests cover the pure scoring, ranking, round, winner, and archive snapshot logic in `core.js`.

## Branding

Branding is centralized in the `BRAND` object at the top of `app.js`. Update that object to change the app name, short mark, subtitle, storage keys, scoring button labels, and reserved disclaimer copy.

The current prototype name is `Q Companion`. A future public release can swap branding without changing each screen by hand.

## Themes

Themes are registered in `BRAND.themes` in `app.js` and applied through `data-theme` on the root HTML element. To add another theme, add its id and label to `BRAND.themes`, then add a matching `[data-theme="theme-id"]` CSS variable block in `styles.css`.

## Storage

Current game state is saved to `localStorage` through a small `STORAGE_ADAPTER` in `app.js`. Saved records include a schema version, saved timestamp, and game payload.

That adapter is intentionally isolated so a future backend or realtime sync provider can replace or extend local storage without rewriting the rendering and scoring flow.

Recent player names are saved separately from the active game, so starting a new game can prefill the last table while still allowing the names to be cleared or edited.

Finished games can be saved to a separate game history archive. The archive is read-only browsing: opening an old game never replaces the currently tracked active game.

The start screen offers two save modes:

- `Sessionless`: games are only saved if the user chooses `Save Game` on the final results screen.
- `Save All Games`: every finished game is automatically saved at the end.

## MVP Features

- 2-4 players
- Custom names
- Recent player names remembered for replay
- Player order setup
- Turn-by-turn scoring
- Turn-order visualization with player totals
- Line bonus
- Last tile bonus
- Two-step manual end game without assigning a winner
- Calculator-style numpad
- Keyboard input
- Running scoreboard
- Mobile and desktop scoring layouts
- Recent layout selection remembered
- Sessionless or Save All Games history mode
- Saved game history with notes
- Photo upload placeholder for future storage work
- Paper-style multi-column score grid
- Final score sheet in player-column format
- Score sheet
- Final rankings
- New game reset

## Scoring Flow

Enter the total base score for the current turn, then use bonus buttons if needed.

- `+6` adds a six-point bonus.
- `+12` sets the current turn score to 12.
- `0 / Reset Hand` records a zero-point turn.
- `Last Tile +6` adds six points and ends the game after submission.

## MVP Exclusions

- Undo
- Editing prior turns
- Multiplayer link sharing
- Cloud sync
- User accounts
- Completed game history
- Tile placement or board validation

## Future Extension Ideas

- Undo last turn
- Edit score sheet rows
- Save completed game history
- Shareable realtime game links
- Backend storage adapter
- Lightweight installable PWA support
