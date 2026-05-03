"use strict";

const BRAND = {
  appName: "Q Companion",
  shortName: "Q!",
  subtitle: "Fast scorekeeping for live tabletop tile games.",
  storageKey: "q-companion.currentGame.v1",
  playerNamesKey: "q-companion.recentPlayers.v1",
  layoutPreferenceKey: "q-companion.layoutPreference.v1",
  saveModePreferenceKey: "q-companion.saveModePreference.v1",
  gameArchiveKey: "q-companion.gameArchive.v1",
  disclaimer:
    "Q Companion is an independent tabletop scorekeeping prototype. It is not affiliated with any game publisher.",
  showDisclaimer: false,
  labels: {
    lineBonus: "+6",
    standardLine: "+12",
    resetHand: "0 / Reset Hand",
    lastTile: "Last Tile +6",
  },
  layouts: {
    default: "Default Layout",
    wide: "Wide Layout",
  },
};

const PLAYER_COUNTS = [2, 3, 4];

const STORAGE_ADAPTER = {
  schemaVersion: 1,
  load() {
    try {
      const raw = window.localStorage.getItem(BRAND.storageKey);
      const saved = raw ? JSON.parse(raw) : null;
      if (!saved) return null;
      return saved.game || saved;
    } catch (error) {
      console.warn("Could not load saved game.", error);
      return null;
    }
  },
  save(data) {
    try {
      window.localStorage.setItem(
        BRAND.storageKey,
        JSON.stringify({
          schemaVersion: this.schemaVersion,
          savedAt: new Date().toISOString(),
          game: data,
        })
      );
    } catch (error) {
      console.warn("Could not save game.", error);
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(BRAND.storageKey);
    } catch (error) {
      console.warn("Could not clear saved game.", error);
    }
  },
};

const PLAYER_NAMES_ADAPTER = {
  load() {
    try {
      const raw = window.localStorage.getItem(BRAND.playerNamesKey);
      const saved = raw ? JSON.parse(raw) : null;
      return Array.isArray(saved?.names) ? saved.names : [];
    } catch (error) {
      console.warn("Could not load recent player names.", error);
      return [];
    }
  },
  save(names) {
    try {
      window.localStorage.setItem(
        BRAND.playerNamesKey,
        JSON.stringify({
          schemaVersion: 1,
          savedAt: new Date().toISOString(),
          names,
        })
      );
    } catch (error) {
      console.warn("Could not save recent player names.", error);
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(BRAND.playerNamesKey);
    } catch (error) {
      console.warn("Could not clear recent player names.", error);
    }
  },
};

const LAYOUT_ADAPTER = {
  load() {
    try {
      const raw = window.localStorage.getItem(BRAND.layoutPreferenceKey);
      const saved = raw ? JSON.parse(raw) : null;
      return saved?.layoutMode === "wide" ? "wide" : "default";
    } catch (error) {
      console.warn("Could not load layout preference.", error);
      return "default";
    }
  },
  save(layoutMode) {
    try {
      window.localStorage.setItem(
        BRAND.layoutPreferenceKey,
        JSON.stringify({
          schemaVersion: 1,
          savedAt: new Date().toISOString(),
          layoutMode,
        })
      );
    } catch (error) {
      console.warn("Could not save layout preference.", error);
    }
  },
};

const SAVE_MODE_ADAPTER = {
  load() {
    try {
      const raw = window.localStorage.getItem(BRAND.saveModePreferenceKey);
      const saved = raw ? JSON.parse(raw) : null;
      return saved?.saveMode === "saveAll" ? "saveAll" : "sessionless";
    } catch (error) {
      console.warn("Could not load save mode preference.", error);
      return "sessionless";
    }
  },
  save(saveMode) {
    try {
      window.localStorage.setItem(
        BRAND.saveModePreferenceKey,
        JSON.stringify({
          schemaVersion: 1,
          savedAt: new Date().toISOString(),
          saveMode,
        })
      );
    } catch (error) {
      console.warn("Could not save save mode preference.", error);
    }
  },
};

const GAME_ARCHIVE_ADAPTER = {
  load() {
    try {
      const raw = window.localStorage.getItem(BRAND.gameArchiveKey);
      const saved = raw ? JSON.parse(raw) : null;
      return Array.isArray(saved?.games) ? saved.games : [];
    } catch (error) {
      console.warn("Could not load game history.", error);
      return [];
    }
  },
  save(games) {
    try {
      window.localStorage.setItem(
        BRAND.gameArchiveKey,
        JSON.stringify({
          schemaVersion: 1,
          savedAt: new Date().toISOString(),
          games,
        })
      );
    } catch (error) {
      console.warn("Could not save game history.", error);
    }
  },
  upsert(game) {
    const games = this.load();
    const index = games.findIndex((item) => item.id === game.id);
    const nextGames = index >= 0 ? games.map((item) => (item.id === game.id ? game : item)) : [game, ...games];
    this.save(nextGames);
    return game;
  },
  find(id) {
    return this.load().find((game) => game.id === id) || null;
  },
  delete(id) {
    const nextGames = this.load().filter((game) => game.id !== id);
    this.save(nextGames);
  },
};

const initialState = () =>
  QC.createInitialState({
    layoutMode: LAYOUT_ADAPTER.load(),
    saveMode: SAVE_MODE_ADAPTER.load(),
  });

let state = hydrateState(STORAGE_ADAPTER.load()) || initialState();

document.addEventListener("DOMContentLoaded", () => {
  document.title = BRAND.appName;
  render();
});

document.addEventListener("keydown", (event) => {
  if (state.screen !== "game" || state.gameOver) return;

  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault();
    appendDigit(event.key);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    submitTurn();
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    backspaceInput();
  }

  if (event.key === "Escape") {
    event.preventDefault();
    clearInput();
  }
});

function hydrateState(savedState) {
  return QC.hydrateState(savedState, initialState());
}

function persist() {
  STORAGE_ADAPTER.save(state);
}

function setState(partial) {
  state = { ...state, ...partial };
  persist();
  render();
}

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  app.className = state.screen === "game" && state.layoutMode === "wide" ? "app-shell app-wide" : "app-shell";

  if (state.screen === "start") renderStart(app);
  if (state.screen === "playerCount") renderPlayerCount(app);
  if (state.screen === "names") renderNames(app);
  if (state.screen === "order") renderOrder(app);
  if (state.screen === "game") renderGame(app);
  if (state.screen === "results") renderResults(app);
  if (state.screen === "recordGame") renderRecordGame(app);
  if (state.screen === "history") renderHistory(app);
  if (state.screen === "historyDetail") renderHistoryDetail(app);
}

function renderStart(app) {
  const hasSavedProgress = state.players.length > 0 || state.turnHistory.length > 0;
  app.innerHTML = `
    <section class="screen center-screen">
      <div class="brand-lockup">
        <span class="brand-mark" aria-hidden="true">${escapeHtml(BRAND.shortName)}</span>
        <div>
          <h1 class="brand-title">${escapeHtml(BRAND.appName)}</h1>
          <p class="subtitle">${escapeHtml(BRAND.subtitle)}</p>
        </div>
      </div>
      <div class="actions">
        <button class="primary" data-action="start">${hasSavedProgress ? "Continue Setup" : "Start Game"}</button>
        <button class="ghost" data-action="history">Game History</button>
        ${hasSavedProgress ? '<button class="ghost" data-action="new">New Game</button>' : ""}
      </div>
      ${renderSaveModePicker()}
      ${BRAND.showDisclaimer ? `<p class="disclaimer">${escapeHtml(BRAND.disclaimer)}</p>` : ""}
    </section>
  `;

  bind("[data-action='start']", "click", () => setState({ screen: nextStartScreen() }));
  bind("[data-action='history']", "click", () => setState({ screen: "history", returnScreen: "start" }));
  bind("[data-action='new']", "click", startFreshGame);
  bind("[data-save-mode]", "change", (event) => setSaveMode(event.currentTarget.value));
}

function renderSaveModePicker() {
  return `
    <div class="save-mode">
      <label for="save-mode">Game Saving</label>
      <select id="save-mode" data-save-mode>
        <option value="sessionless" ${state.saveMode === "sessionless" ? "selected" : ""}>Sessionless</option>
        <option value="saveAll" ${state.saveMode === "saveAll" ? "selected" : ""}>Save All Games</option>
      </select>
    </div>
  `;
}

function nextStartScreen() {
  if (!state.playerCount) return "playerCount";
  if (!state.players.length) return "names";
  if (state.gameOver) return "results";
  if (state.gameStartedAt) return "game";
  return "order";
}

function renderPlayerCount(app) {
  app.innerHTML = `
    <section class="screen">
      ${renderHeader("Choose Players", "Pick the number of people at the table.")}
      <div class="count-grid">
        ${PLAYER_COUNTS.map((count) => `<button data-count="${count}">${count}</button>`).join("")}
      </div>
    </section>
  `;

  document.querySelectorAll("[data-count]").forEach((button) => {
    button.addEventListener("click", () => {
      const playerCount = Number(button.dataset.count);
      const players = makeDefaultPlayers(playerCount);
      setState({ playerCount, players, screen: "names" });
    });
  });
}

function renderNames(app) {
  app.innerHTML = `
    <section class="screen">
      ${renderHeader("Player Names", "Use defaults or rename each player.")}
      <form class="stack" data-form="names">
        ${state.players
          .map(
            (player, index) => `
              <div class="field">
                <label for="player-${index}">Player ${index + 1}</label>
                <input id="player-${index}" name="player-${index}" value="${escapeAttribute(player.name)}" autocomplete="off">
              </div>
            `
          )
          .join("")}
        <div class="form-actions">
          <button class="ghost" type="button" data-action="clear-names">Clear Names</button>
          <button class="primary" type="submit">Continue</button>
        </div>
      </form>
    </section>
  `;

  bind("[data-form='names']", "submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const players = state.players.map((player, index) => ({
      ...player,
      name: normalizeName(form.get(`player-${index}`), index),
    }));
    rememberPlayerNames(players);
    setState({ players, screen: "order" });
  });
  bind("[data-action='clear-names']", "click", clearRecentPlayerNames);
}

function renderOrder(app) {
  const selectedIndex = Number.isInteger(state.orderSelectedIndex) ? state.orderSelectedIndex : null;
  app.innerHTML = `
    <section class="screen">
      ${renderHeader("Turn Order", "Put the first player at the top. Tap a card, then tap where it should move.")}
      <div class="order-list">
        ${state.players
          .map(
            (player, index) => `
              <div class="order-item ${selectedIndex === index ? "selected" : ""}" draggable="true" data-order-index="${index}">
                <div>
                  <strong>${escapeHtml(player.name)}</strong>
                  <p class="muted">${selectedIndex === index ? "Selected" : `Position ${index + 1}`}</p>
                </div>
                <div class="order-controls">
                  <button aria-label="Move ${escapeAttribute(player.name)} up" data-move="${index}" data-dir="-1" ${index === 0 ? "disabled" : ""}>Up</button>
                  <button aria-label="Move ${escapeAttribute(player.name)} down" data-move="${index}" data-dir="1" ${index === state.players.length - 1 ? "disabled" : ""}>Dn</button>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
      <button class="primary" data-action="start-play">Start Play</button>
    </section>
  `;

  document.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      movePlayer(Number(button.dataset.move), Number(button.dataset.dir));
    });
  });
  bindOrderInteractions();
  bind("[data-action='start-play']", "click", startPlay);
}

function renderGame(app) {
  const currentPlayer = state.players[state.activePlayerIndex];
  const layoutMode = state.layoutMode === "wide" ? "wide" : "default";
  app.innerHTML = `
    <section class="screen game-screen ${layoutMode === "wide" ? "wide-mode" : ""}">
      ${renderLayoutMenu(layoutMode)}
      ${
        layoutMode === "wide"
          ? `
            <div class="game-layout wide-layout">
              <div class="game-column controls-column">
                ${renderNumpad()}
                ${renderQuickControls()}
                ${renderLastTileButton()}
                ${renderEndGameButton()}
              </div>
              <div class="game-column focus-column">
                ${renderTurnCard(currentPlayer)}
                ${renderScoreDisplay()}
                ${renderTurnOrderViz()}
              </div>
              <div class="game-column scores-column">
                ${renderScoreboardPanel()}
              </div>
            </div>
          `
          : `
            ${renderTurnCard(currentPlayer)}
            ${renderScoreDisplay()}
            ${renderNumpad()}
            ${renderQuickControls()}
            ${renderLastTileButton()}
            ${renderEndGameButton()}
            ${renderScoreboardPanel()}
            ${renderTurnOrderViz()}
          `
      }
    </section>
  `;

  bind("[data-layout-mode]", "change", (event) => {
    setLayoutMode(event.currentTarget.value);
  });
  document.querySelectorAll("[data-digit]").forEach((button) => {
    button.addEventListener("click", () => appendDigit(button.dataset.digit));
  });
  bind("[data-action='clear']", "click", clearInput);
  bind("[data-action='enter']", "click", submitTurn);
  bind("[data-action='reset-hand']", "click", resetHand);
  bind("[data-action='line-bonus']", "click", toggleLineBonus);
  bind("[data-action='standard-line']", "click", standardLineScore);
  bind("[data-action='last-tile']", "click", toggleLastTileBonus);
  bind("[data-action='arm-end-game']", "click", armEndGame);
  bind("[data-action='cancel-end-game']", "click", cancelEndGame);
  bind("[data-action='confirm-end-game']", "click", endGameManually);
  setTimeout(scrollLiveScoreboardToBottom, 0);
}

function renderLayoutMenu(layoutMode) {
  return `
    <div class="layout-menu">
      <label for="layout-mode">Format</label>
      <select id="layout-mode" data-layout-mode>
        <option value="default" ${layoutMode === "default" ? "selected" : ""}>${escapeHtml(BRAND.layouts.default)}</option>
        <option value="wide" ${layoutMode === "wide" ? "selected" : ""}>${escapeHtml(BRAND.layouts.wide)}</option>
      </select>
    </div>
  `;
}

function renderTurnCard(currentPlayer) {
  return `
    <div class="turn-card">
      <p class="muted">Turn ${state.turnNumber}</p>
      <h1 class="turn-name">${escapeHtml(currentPlayer.name)}'s Turn</h1>
      <div class="turn-meta">
        <span>Total: ${currentPlayer.score}</span>
        <span>Round ${getRoundNumber(state.turnNumber)}</span>
      </div>
    </div>
  `;
}

function renderTurnOrderViz() {
  const currentPlayer = state.players[state.activePlayerIndex];
  return `
    <div class="table-map player-count-${state.players.length}" aria-label="Turn order and total scores">
      <div class="table-map-center">
        <span>${escapeHtml(currentPlayer.name)}</span>
        <strong>up now</strong>
      </div>
      ${state.players.map((player, index) => renderTurnSeat(player, index)).join("")}
    </div>
  `;
}

function renderTurnSeat(player, index) {
  const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
  return `
    <div class="table-person seat-${index + 1} ${index === state.activePlayerIndex ? "active" : ""} ${index === nextIndex && index !== state.activePlayerIndex ? "next" : ""}">
      <span class="person-icon" aria-hidden="true"></span>
      <strong>${escapeHtml(player.name)}</strong>
      <span>${player.score}</span>
    </div>
  `;
}

function renderScoreDisplay() {
  return `
    <div class="display" aria-live="polite">
      <span class="display-label">Current Turn</span>
      <span class="display-value">${getTurnTotal()}</span>
      ${renderBonusLines()}
    </div>
  `;
}

function renderQuickControls() {
  return `
    <div class="quick-grid">
      <button class="reset-control" data-action="reset-hand">${escapeHtml(BRAND.labels.resetHand)}</button>
      <div class="bonus-row">
        <button class="bonus-control ${state.lineBonusApplied ? "toggle-active" : "accent"}" data-action="line-bonus">${escapeHtml(BRAND.labels.lineBonus)}</button>
        <button class="bonus-control accent" data-action="standard-line">${escapeHtml(BRAND.labels.standardLine)}</button>
      </div>
    </div>
  `;
}

function renderLastTileButton() {
  return `<button class="${state.lastTileBonusApplied ? "toggle-active danger" : "ghost"}" data-action="last-tile">${escapeHtml(BRAND.labels.lastTile)}</button>`;
}

function renderEndGameButton() {
  if (!state.endGameArmed) {
    return `<button class="ghost end-game-control" data-action="arm-end-game">End Game</button>`;
  }

  return `
    <div class="end-game-confirm">
      <button class="ghost" data-action="cancel-end-game">Keep Playing</button>
      <button class="danger" data-action="confirm-end-game">End Now</button>
    </div>
  `;
}

function renderNumpad() {
  return `
    <div class="numpad">
      ${[7, 8, 9, 4, 5, 6, 1, 2, 3]
        .map((digit) => `<button data-digit="${digit}">${digit}</button>`)
        .join("")}
      <button data-digit="0">0</button>
      <button data-action="clear">Clear</button>
      <button class="enter" data-action="enter">Enter</button>
    </div>
  `;
}

function renderScoreboardPanel() {
  return `
    <div class="panel stack scoreboard-panel">
      <h2 class="section-title">Scoreboard</h2>
      <div class="scoreboard-stage">
        ${renderScoreboardGrid({ includeOpenRow: true })}
      </div>
      ${renderTotalsGrid(state.players)}
    </div>
  `;
}

function renderBonusLines() {
  const base = getBaseScore();
  const lineBonus = state.lineBonusApplied ? 6 : 0;
  const lastTileBonus = state.lastTileBonusApplied ? 6 : 0;

  if (!lineBonus && !lastTileBonus) {
    return `<div class="bonus-line"><span>Base</span><span>${base}</span></div>`;
  }

  return `
    <div class="bonus-line"><span>Base</span><span>${base}</span></div>
    ${lineBonus ? `<div class="bonus-line"><span>Line bonus</span><span>+${lineBonus}</span></div>` : ""}
    ${lastTileBonus ? `<div class="bonus-line"><span>Last tile</span><span>+${lastTileBonus}</span></div>` : ""}
  `;
}

function renderResults(app) {
  const rankings = getRankings();
  const assignsWinner = doesAssignWinner();
  const savedGame = state.recordedGameId ? GAME_ARCHIVE_ADAPTER.find(state.recordedGameId) : null;
  if (state.saveMode === "saveAll" && !state.recordedGameId) {
    setTimeout(() => autoSaveCompletedGame(), 0);
  }
  app.innerHTML = `
    <section class="screen results-screen">
      ${renderHeader("Score Sheet", "Scroll through the game history, or jump back to the final scores.")}
      <div class="panel stack">
        <h2 class="section-title">Final Score Sheet</h2>
        ${renderScoreSheet()}
      </div>

      <div id="final-scores" class="panel stack">
        <h2 class="screen-title">Final Scores</h2>
        ${!assignsWinner ? '<p class="muted">Game ended manually. No winner assigned.</p>' : ""}
        ${state.saveMode === "saveAll" ? '<p class="muted">Save All Games is on. This game will be kept in Game History.</p>' : ""}
        ${renderFinalScoresGrid(rankings, assignsWinner)}
        ${renderSavedNotes(savedGame)}
        <div class="button-row">
          <button class="ghost" data-action="record-game" data-return-screen="results">${state.recordedGameId ? "Edit Saved Notes" : "Save Game"}</button>
          <button class="ghost" data-action="history">History</button>
          <button class="ghost" data-action="new">Reset Game</button>
        </div>
      </div>

      <div class="sticky-actions" aria-label="Results navigation">
        <button data-action="history">History</button>
        <button class="primary" data-action="new">Reset Game</button>
      </div>
    </section>
  `;

  bind("[data-action='record-game']", "click", (event) => openRecordGame(event.currentTarget.dataset.returnScreen || "results"));
  bind("[data-action='history']", "click", () => setState({ screen: "history", returnScreen: "results" }));
  bind("[data-action='new']", "click", startFreshGame);
  setTimeout(scrollToFinalScores, 0);
}

function renderSavedNotes(savedGame) {
  if (!savedGame) return "";

  return `
    <div class="saved-notes">
      <h3 class="section-title">Notes</h3>
      ${savedGame.notes ? `<p>${escapeHtml(savedGame.notes)}</p>` : '<p class="muted">No notes yet.</p>'}
    </div>
  `;
}

function renderRecordGame(app) {
  const existingGame = state.recordedGameId ? GAME_ARCHIVE_ADAPTER.find(state.recordedGameId) : null;
  const defaultTitle = makeGameTitle(state);
  app.innerHTML = `
    <section class="screen">
      ${renderHeader("Save Game", "Save a snapshot without changing the active game.")}
      <form class="panel stack" data-form="record-game">
        <div class="field">
          <label for="game-title">Game name</label>
          <input id="game-title" name="title" value="${escapeAttribute(existingGame?.title || defaultTitle)}" autocomplete="off">
        </div>
        <div class="field">
          <label for="game-notes">Notes</label>
          <textarea id="game-notes" name="notes" rows="5" placeholder="Who played, where it happened, weird table moments, anything worth remembering.">${escapeHtml(existingGame?.notes || "")}</textarea>
        </div>
        <div class="photo-drop">
          <strong>Photo</strong>
          <p class="muted">Photo upload placeholder. Kept out for now to avoid local storage bloat.</p>
          <button type="button" disabled>Add Photo Later</button>
        </div>
        <div class="button-row">
          <button class="ghost" type="button" data-action="cancel-record">Cancel</button>
          <button class="primary" type="submit">${existingGame ? "Update Saved Game" : "Save Game"}</button>
        </div>
      </form>
    </section>
  `;

  bind("[data-form='record-game']", "submit", saveRecordedGame);
  bind("[data-action='cancel-record']", "click", () => setState({ screen: state.returnScreen || "game" }));
}

function renderHistory(app) {
  const games = GAME_ARCHIVE_ADAPTER.load();
  app.innerHTML = `
    <section class="screen">
      ${renderHeader("Game History", "Browse saved games. This does not change the active game.")}
      <div class="actions">
        <button class="ghost" data-action="back">Back</button>
      </div>
      <div class="history-list">
        ${
          games.length
            ? games.map(renderHistoryCard).join("")
            : '<div class="empty-history">No saved games yet.</div>'
        }
      </div>
    </section>
  `;

  bind("[data-action='back']", "click", () => setState({ screen: getHistoryBackScreen(), returnScreen: "start" }));
  document.querySelectorAll("[data-history-id]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ screen: "historyDetail", historySelectedId: button.dataset.historyId, deleteHistoryArmedId: null, returnScreen: "history" });
    });
  });
}

function renderHistoryCard(game) {
  const finalScores = [...game.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return `
    <button class="history-card" data-history-id="${escapeAttribute(game.id)}">
      <span>
        <strong>${escapeHtml(game.title)}</strong>
        <span class="muted">${formatDisplayDate(game.savedAt)} - ${game.players.map((player) => player.name).join(", ")}</span>
      </span>
      <span class="history-card-score">${finalScores.map((player) => `${escapeHtml(player.name)} ${player.score}`).join(" / ")}</span>
    </button>
  `;
}

function renderHistoryDetail(app) {
  const game = GAME_ARCHIVE_ADAPTER.find(state.historySelectedId);
  if (!game) {
    app.innerHTML = `
      <section class="screen">
        ${renderHeader("Saved Game", "That saved game could not be found.")}
        <button class="primary" data-action="history">Back to History</button>
      </section>
    `;
    bind("[data-action='history']", "click", () => setState({ screen: "history", historySelectedId: null }));
    return;
  }

  const rankings = [...game.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  app.innerHTML = `
    <section class="screen results-screen">
      ${renderHeader(game.title, "Saved game snapshot. Your active game is unchanged.")}
      <div class="panel stack">
        <div class="detail-meta">
          <span>${formatDisplayDate(game.savedAt)}</span>
          <span>${game.status}</span>
          <span>${game.players.length} players</span>
        </div>
        ${game.notes ? `<p>${escapeHtml(game.notes)}</p>` : '<p class="muted">No notes yet.</p>'}
        <div class="photo-drop compact">
          <strong>Photo</strong>
          <p class="muted">No photo attached. Upload is reserved for a later storage pass.</p>
        </div>
        ${renderHistoryDeleteControls(game)}
      </div>
      <div class="panel stack">
        <h2 class="section-title">Final Scores</h2>
        ${renderFinalScoresGrid(rankings, Boolean(game.assignsWinner))}
      </div>
      <div class="panel stack">
        <h2 class="section-title">Score Sheet</h2>
        ${renderArchivedScoreSheet(game)}
      </div>
      <div class="sticky-actions photo-actions" aria-label="Saved game photo">
        <button class="ghost" disabled>Upload Photo Later</button>
        <button class="primary" disabled>Photo Placeholder</button>
      </div>
    </section>
  `;

  bind("[data-action='history']", "click", () => setState({ screen: "history", historySelectedId: null }));
  bind("[data-action='arm-delete-history']", "click", () => setState({ deleteHistoryArmedId: game.id }));
  bind("[data-action='cancel-delete-history']", "click", () => setState({ deleteHistoryArmedId: null }));
  bind("[data-action='confirm-delete-history']", "click", () => deleteHistoryGame(game.id));
}

function renderHistoryDeleteControls(game) {
  if (state.deleteHistoryArmedId !== game.id) {
    return `<button class="ghost delete-history-control" data-action="arm-delete-history">Delete Saved Game</button>`;
  }

  return `
    <div class="end-game-confirm">
      <button class="ghost" data-action="cancel-delete-history">Keep Saved Game</button>
      <button class="danger" data-action="confirm-delete-history">Delete</button>
    </div>
  `;
}

function deleteHistoryGame(gameId) {
  GAME_ARCHIVE_ADAPTER.delete(gameId);
  setState({
    screen: "history",
    historySelectedId: null,
    deleteHistoryArmedId: null,
    recordedGameId: state.recordedGameId === gameId ? null : state.recordedGameId,
    returnScreen: "history",
  });
}

function renderScoreSheet() {
  if (!state.turnHistory.length) {
    return `<div class="empty-history">No turns were recorded.</div>`;
  }

  return `
    ${renderScoreboardGrid({ includeOpenRow: false })}
    ${renderTotalsGrid(state.players)}
  `;
}

function renderArchivedScoreSheet(game) {
  if (!game.turnHistory.length) {
    return `<div class="empty-history">No turns were recorded.</div>`;
  }

  const rounds = getArchivedRounds(game);
  return `
    <div class="score-paper rounds-paper" role="region" aria-label="Saved score sheet">
      <table class="score-paper-table">
        <thead>
          <tr>
            <th>Round</th>
            ${game.players.map((player) => `<th>${escapeHtml(player.name)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rounds
            .map(
              (round) => `
                <tr>
                  <th>${round}</th>
                  ${game.players.map((player) => renderArchivedScoreboardCell(game, round, player)).join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    ${renderTotalsGrid(game.players)}
  `;
}

function renderArchivedScoreboardCell(game, round, player) {
  const turn = game.turnHistory.find((item) => item.roundNumber === round && item.playerId === player.id);
  if (!turn) return `<td class="score-empty">-</td>`;
  const previousTotal = getArchivedPreviousRunningTotal(game, turn);
  const carry = turn.runningTotal >= 10 ? String(turn.runningTotal).slice(0, -1) : "";
  const preEndBonusTotal = turn.turnTotal - turn.lastTileBonus;
  return `
    <td>
      <div class="paper-entry">
        ${carry ? `<span class="paper-carry">${carry}</span>` : ""}
        <span class="paper-crossout">${previousTotal}</span>
        <strong class="paper-turn">+${preEndBonusTotal}</strong>
        ${turn.lastTileBonus ? `<span class="paper-end-bonus">+${turn.lastTileBonus} end</span>` : ""}
        <span class="paper-running">${turn.runningTotal}</span>
      </div>
    </td>
  `;
}

function getArchivedRounds(game) {
  const maxRound = Math.max(...game.turnHistory.map((turn) => turn.roundNumber), 1);
  return Array.from({ length: maxRound }, (_, index) => index + 1);
}

function getArchivedPreviousRunningTotal(game, turn) {
  const previousTurn = [...game.turnHistory]
    .reverse()
    .find((item) => item.playerId === turn.playerId && item.turnNumber < turn.turnNumber);
  return previousTurn ? previousTurn.runningTotal : 0;
}

function renderScoreboardGrid(options = {}) {
  const includeOpenRow = Boolean(options.includeOpenRow);
  const rounds = getScoreboardRounds(includeOpenRow);

  return `
    <div class="score-paper rounds-paper" data-score-rounds role="region" aria-label="Paper-style scoreboard">
      <table class="score-paper-table">
        <thead>
          <tr>
            <th>Round</th>
            ${state.players
              .map(
                (player, index) => `
                  <th class="${index === state.activePlayerIndex && !state.gameOver ? "active-player" : ""}">
                    ${escapeHtml(player.name)}
                    ${index === state.activePlayerIndex && !state.gameOver ? '<span class="current-pill">Current</span>' : ""}
                  </th>
                `
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${rounds
            .map(
              (round) => `
                <tr class="${isOpenRound(round) ? "open-round" : ""}">
                  <th>${round}</th>
                  ${state.players.map((player) => renderScoreboardCell(round, player)).join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderScoreboardCell(round, player) {
  const turn = state.turnHistory.find((item) => item.roundNumber === round && item.playerId === player.id);
  if (!turn) {
    const isCurrentOpenCell = !state.gameOver && round === getRoundNumber(state.turnNumber) && player.id === state.players[state.activePlayerIndex]?.id;
    return `<td class="${isCurrentOpenCell ? "score-open" : "score-empty"}">${isCurrentOpenCell ? "Next" : "-"}</td>`;
  }
  const previousTotal = getPreviousRunningTotal(turn);
  const carry = turn.runningTotal >= 10 ? String(turn.runningTotal).slice(0, -1) : "";
  const preEndBonusTotal = turn.turnTotal - turn.lastTileBonus;
  return `
    <td>
      <div class="paper-entry">
        ${carry ? `<span class="paper-carry">${carry}</span>` : ""}
        <span class="paper-crossout">${previousTotal}</span>
        <strong class="paper-turn">+${preEndBonusTotal}</strong>
        ${turn.lastTileBonus ? `<span class="paper-end-bonus">+${turn.lastTileBonus} end</span>` : ""}
        <span class="paper-running">${turn.runningTotal}</span>
      </div>
    </td>
  `;
}

function renderTotalsGrid(players) {
  return `
    <div class="score-paper totals-paper" role="region" aria-label="Current totals">
      <table class="score-paper-table">
        <tbody>
          <tr class="score-total-row">
            <th>Total</th>
            ${players
              .map(
                (player) => `
                  <td>
                    <span class="paper-running">${player.score}</span>
                  </td>
                `
              )
              .join("")}
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderFinalScoresGrid(rankings, assignsWinner = true) {
  return `
    <div class="score-paper final-score-grid" role="region" aria-label="Final scores">
      <table class="score-paper-table">
        <thead>
          <tr>
            <th>Final</th>
            ${rankings
              .map(
                (player, index) => `
                  <th class="${assignsWinner && index === 0 ? "winner-col" : ""}">
                    ${escapeHtml(player.name)}
                    ${assignsWinner && index === 0 ? '<span class="current-pill">Winner</span>' : ""}
                  </th>
                `
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Rank</th>
            ${rankings.map((player, index) => `<td class="${assignsWinner && index === 0 ? "winner-col" : ""}"><strong>${index + 1}</strong></td>`).join("")}
          </tr>
          <tr class="score-total-row">
            <th>Score</th>
            ${rankings.map((player, index) => `<td class="${assignsWinner && index === 0 ? "winner-col" : ""}"><span class="paper-running">${player.score}</span></td>`).join("")}
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function getScoreboardRounds(includeOpenRow = true) {
  return QC.getScoreboardRounds(state, includeOpenRow);
}

function isOpenRound(round) {
  return !state.gameOver && round === getRoundNumber(state.turnNumber);
}

function getPreviousRunningTotal(turn) {
  return QC.getPreviousRunningTotal(state.turnHistory, turn);
}

function renderHeader(title, subtitle) {
  return `
    <header class="topbar">
      <div>
        <h1 class="screen-title">${escapeHtml(title)}</h1>
        <p class="subtitle">${escapeHtml(subtitle)}</p>
      </div>
      <span class="brand-mark" aria-hidden="true">${escapeHtml(BRAND.shortName)}</span>
    </header>
  `;
}

function makeDefaultPlayers(count) {
  const rememberedNames = PLAYER_NAMES_ADAPTER.load();
  return QC.makeDefaultPlayers(count, rememberedNames);
}

function makeFallbackPlayers(count) {
  return QC.makeDefaultPlayers(count);
}

function rememberPlayerNames(players) {
  PLAYER_NAMES_ADAPTER.save(players.map((player) => player.name));
}

function clearRecentPlayerNames() {
  PLAYER_NAMES_ADAPTER.clear();
  setState({ players: makeFallbackPlayers(state.playerCount) });
}

function setLayoutMode(layoutMode) {
  const nextLayout = layoutMode === "wide" ? "wide" : "default";
  LAYOUT_ADAPTER.save(nextLayout);
  setState({ layoutMode: nextLayout });
}

function setSaveMode(saveMode) {
  const nextSaveMode = saveMode === "saveAll" ? "saveAll" : "sessionless";
  SAVE_MODE_ADAPTER.save(nextSaveMode);
  setState({ saveMode: nextSaveMode });
}

function getHistoryBackScreen() {
  if (state.returnScreen === "results" && state.gameOver) return "results";
  if (state.returnScreen === "game" && state.gameStartedAt && !state.gameOver) return "game";
  return "start";
}

function openRecordGame(returnScreen) {
  if (!state.players.length) return;
  setState({ screen: "recordGame", returnScreen });
}

function saveRecordedGame(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const title = String(form.get("title") || "").trim() || makeGameTitle(state);
  const notes = String(form.get("notes") || "").trim();
  const savedGame = makeGameSnapshot({ title, notes });
  GAME_ARCHIVE_ADAPTER.upsert(savedGame);
  setState({ recordedGameId: savedGame.id, screen: state.returnScreen || "results" });
}

function autoSaveCompletedGame() {
  if (!state.gameOver || state.recordedGameId || !state.players.length) return;
  const savedGame = makeGameSnapshot({ title: makeGameTitle(state), notes: "" });
  GAME_ARCHIVE_ADAPTER.upsert(savedGame);
  setState({ recordedGameId: savedGame.id });
}

function makeGameSnapshot({ title, notes }) {
  const existingGame = state.recordedGameId ? GAME_ARCHIVE_ADAPTER.find(state.recordedGameId) : null;
  const now = new Date().toISOString();
  return QC.makeGameSnapshot(state, { existingGame, now, title, notes });
}

function makeGameTitle(gameState) {
  const date = formatDisplayDate(gameState.gameStartedAt || new Date().toISOString());
  const names = gameState.players.map((player) => player.name).join(", ");
  return names ? `${date} - ${names}` : `${date} Game`;
}

function normalizeName(value, index) {
  return QC.normalizeName(value, index);
}

function movePlayer(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.players.length) return;
  movePlayerToIndex(index, nextIndex);
}

function movePlayerToIndex(fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= state.players.length || toIndex >= state.players.length) return;
  const players = [...state.players];
  const [player] = players.splice(fromIndex, 1);
  players.splice(toIndex, 0, player);
  setState({ players, orderSelectedIndex: null });
}

function bindOrderInteractions() {
  document.querySelectorAll("[data-order-index]").forEach((item) => {
    item.addEventListener("click", () => {
      const clickedIndex = Number(item.dataset.orderIndex);
      const selectedIndex = Number.isInteger(state.orderSelectedIndex) ? state.orderSelectedIndex : null;

      if (selectedIndex === null) {
        setState({ orderSelectedIndex: clickedIndex });
        return;
      }

      if (selectedIndex === clickedIndex) {
        setState({ orderSelectedIndex: null });
        return;
      }

      movePlayerToIndex(selectedIndex, clickedIndex);
    });

    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.dataset.orderIndex);
      item.classList.add("dragging");
    });

    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      item.classList.add("drag-over");
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });

    item.addEventListener("drop", (event) => {
      event.preventDefault();
      const fromIndex = Number(event.dataTransfer.getData("text/plain"));
      const toIndex = Number(item.dataset.orderIndex);
      item.classList.remove("drag-over");
      movePlayerToIndex(fromIndex, toIndex);
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging", "drag-over");
    });
  });
}

function startPlay() {
  const players = state.players.map((player, index) => ({
    ...player,
    id: player.id || `p${index + 1}`,
    score: 0,
  }));
  rememberPlayerNames(players);
  setState({
    players,
    activePlayerIndex: 0,
    turnNumber: 1,
    inputValue: "",
    lineBonusApplied: false,
    lastTileBonusApplied: false,
    gameStartedAt: new Date().toISOString(),
    gameEndedAt: null,
    turnHistory: [],
    gameOver: false,
    gameEndReason: null,
    endGameArmed: false,
    recordedGameId: null,
    orderSelectedIndex: null,
    screen: "game",
  });
}

function startFreshGame() {
  state = initialState();
  STORAGE_ADAPTER.clear();
  render();
}

function appendDigit(digit) {
  const nextValue = state.inputValue === "0" ? digit : `${state.inputValue}${digit}`;
  setState({ inputValue: nextValue.replace(/^0+(?=\d)/, ""), endGameArmed: false });
}

function backspaceInput() {
  setState({ inputValue: state.inputValue.slice(0, -1), endGameArmed: false });
}

function clearInput() {
  setState({ inputValue: "", endGameArmed: false });
}

function resetHand() {
  setState({ inputValue: "0", lineBonusApplied: false, endGameArmed: false });
}

function toggleLineBonus() {
  setState({ lineBonusApplied: !state.lineBonusApplied, endGameArmed: false });
}

function standardLineScore() {
  setState({ inputValue: "12", lineBonusApplied: false, endGameArmed: false });
}

function toggleLastTileBonus() {
  setState({ lastTileBonusApplied: !state.lastTileBonusApplied, endGameArmed: false });
}

function armEndGame() {
  setState({ endGameArmed: true });
}

function cancelEndGame() {
  setState({ endGameArmed: false });
}

function endGameManually() {
  if (state.gameOver) return;
  setState({
    inputValue: "",
    lineBonusApplied: false,
    lastTileBonusApplied: false,
    endGameArmed: false,
    gameOver: true,
    gameEndReason: "manual",
    gameEndedAt: new Date().toISOString(),
    screen: "results",
  });
}

function submitTurn() {
  state = QC.submitTurn(state, new Date().toISOString());
  persist();
  render();
}

function getBaseScore() {
  return QC.getBaseScore(state.inputValue);
}

function getTurnTotal() {
  return QC.calculateTurnScore(state).turnTotal;
}

function getRoundNumber(turnNumber) {
  return QC.getRoundNumber(turnNumber, state.playerCount);
}

function getRankings() {
  return QC.getRankings(state.players);
}

function doesAssignWinner() {
  return QC.doesAssignWinner(state);
}

function formatBonuses(turn) {
  const bonuses = [];
  if (turn.lineBonus) bonuses.push("+6 line");
  if (turn.lastTileBonus) bonuses.push("+6 last");
  return bonuses.length ? bonuses.join(", ") : `base ${turn.baseScore}`;
}

function formatDisplayDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Saved game";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scrollToFinalScores() {
  document.getElementById("final-scores")?.scrollIntoView({ behavior: "smooth", block: "end" });
}

function scrollLiveScoreboardToBottom() {
  const scoreSheet = document.querySelector("[data-score-rounds]");
  if (scoreSheet) scoreSheet.scrollTop = scoreSheet.scrollHeight;
}

function bind(selector, eventName, handler) {
  document.querySelector(selector)?.addEventListener(eventName, handler);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
