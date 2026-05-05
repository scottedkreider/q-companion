"use strict";

const BRAND = {
  appName: "Q Companion",
  shortName: "Q!",
  subtitle: "Fast scorekeeping for live tabletop tile games.",
  storageKey: "q-companion.currentGame.v1",
  playerNamesKey: "q-companion.recentPlayers.v1",
  layoutPreferenceKey: "q-companion.layoutPreference.v1",
  themePreferenceKey: "q-companion.themePreference.v1",
  saveModePreferenceKey: "q-companion.saveModePreference.v1",
  hapticsPreferenceKey: "q-companion.hapticsPreference.v1",
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
    default: "Mobile Layout",
    wide: "Desktop Layout",
  },
  themes: {
    default: "Default",
    cabin: "Cabin",
    royale: "Royale",
    toyShop: "Toy Shop",
    ti95: "TI-95",
  },
};

const PLAYER_COUNTS = [2, 3, 4];
const DEFAULT_THEME_MODE = "cabin";

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

const THEME_ADAPTER = {
  load() {
    try {
      const raw = window.localStorage.getItem(BRAND.themePreferenceKey);
      const saved = raw ? JSON.parse(raw) : null;
      return normalizeThemeMode(saved?.themeMode);
    } catch (error) {
      console.warn("Could not load theme preference.", error);
      return DEFAULT_THEME_MODE;
    }
  },
  save(themeMode) {
    try {
      window.localStorage.setItem(
        BRAND.themePreferenceKey,
        JSON.stringify({
          schemaVersion: 1,
          savedAt: new Date().toISOString(),
          themeMode,
        })
      );
    } catch (error) {
      console.warn("Could not save theme preference.", error);
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

const HAPTICS_ADAPTER = {
  load() {
    try {
      const raw = window.localStorage.getItem(BRAND.hapticsPreferenceKey);
      const saved = raw ? JSON.parse(raw) : null;
      return saved?.hapticsEnabled !== false;
    } catch (error) {
      console.warn("Could not load haptics preference.", error);
      return true;
    }
  },
  save(hapticsEnabled) {
    try {
      window.localStorage.setItem(
        BRAND.hapticsPreferenceKey,
        JSON.stringify({
          schemaVersion: 1,
          savedAt: new Date().toISOString(),
          hapticsEnabled: Boolean(hapticsEnabled),
        })
      );
    } catch (error) {
      console.warn("Could not save haptics preference.", error);
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
    themeMode: THEME_ADAPTER.load(),
    saveMode: SAVE_MODE_ADAPTER.load(),
    hapticsEnabled: HAPTICS_ADAPTER.load(),
  });

let state = hydrateState(STORAGE_ADAPTER.load()) || initialState();
let activePressButton = null;
const PRESS_TIMERS = new WeakMap();

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

document.addEventListener("click", (event) => {
  const button = getEventButton(event);
  if (!button || button.disabled) return;
  pulseButtonPress(button);
  triggerHaptic();
});

document.addEventListener("pointerdown", handleButtonPointerDown);
document.addEventListener("pointerup", releaseActiveButtonPress, true);
document.addEventListener("pointercancel", releaseActiveButtonPress, true);

function hydrateState(savedState) {
  return QC.hydrateState(savedState, initialState());
}

function persist() {
  STORAGE_ADAPTER.save(state);
}

function setState(partial, options = {}) {
  const scoreScrollTop = options.skipScoreScroll ? getLiveScoreboardScrollTop() : null;
  state = { ...state, ...partial };
  persist();
  render({ ...options, scoreScrollTop });
}

function render(options = {}) {
  const app = document.getElementById("app");
  if (!app) return;
  document.documentElement.dataset.theme = normalizeThemeMode(state.themeMode);
  app.className = state.screen === "game" && state.layoutMode === "wide" ? "app-shell app-wide" : "app-shell";

  if (state.screen === "start") renderStart(app);
  if (state.screen === "playerCount") renderPlayerCount(app);
  if (state.screen === "names") renderNames(app);
  if (state.screen === "order") renderOrder(app);
  if (state.screen === "game") renderGame(app, options);
  if (state.screen === "results") renderResults(app);
  if (state.screen === "recordGame") renderRecordGame(app);
  if (state.screen === "history") renderHistory(app);
  if (state.screen === "historyDetail") renderHistoryDetail(app);
  if (state.screen === "editHistoryNotes") renderEditHistoryNotes(app);
  document.querySelectorAll("[data-action='main-menu']").forEach((button) => {
    button.addEventListener("click", goToMainMenu);
  });
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
      <div class="settings-row">
        ${renderSaveModePicker()}
        ${renderThemeMenu()}
        ${renderHapticsToggle()}
      </div>
      ${BRAND.showDisclaimer ? `<p class="disclaimer">${escapeHtml(BRAND.disclaimer)}</p>` : ""}
    </section>
  `;

  bind("[data-action='start']", "click", () => setState({ screen: nextStartScreen() }));
  bind("[data-action='history']", "click", () => setState({ screen: "history", returnScreen: "start" }));
  bind("[data-action='new']", "click", startFreshGame);
  bind("[data-save-mode]", "change", (event) => setSaveMode(event.currentTarget.value));
  bind("[data-theme-mode]", "change", (event) => setThemeMode(event.currentTarget.value));
  bind("[data-haptics-enabled]", "change", (event) => setHapticsEnabled(event.currentTarget.checked));
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

function renderThemeMenu() {
  const themeMode = normalizeThemeMode(state.themeMode);
  return `
    <div class="theme-menu">
      <label for="theme-mode">Theme</label>
      <select id="theme-mode" data-theme-mode>
        ${Object.entries(BRAND.themes)
          .map(([value, label]) => `<option value="${escapeAttribute(value)}" ${themeMode === value ? "selected" : ""}>${escapeHtml(label)}</option>`)
          .join("")}
      </select>
    </div>
  `;
}

function renderHapticsToggle() {
  return `
    <label class="haptics-toggle">
      <input type="checkbox" data-haptics-enabled ${state.hapticsEnabled ? "checked" : ""}>
      <span>Haptics</span>
    </label>
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
      <button class="ghost" data-action="main-menu">Main Menu</button>
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
              <div class="field name-field">
                <label for="player-${index}">Player ${index + 1}</label>
                <div class="name-input-wrap">
                  <input id="player-${index}" name="player-${index}" value="${escapeAttribute(player.name)}" autocomplete="off" data-name-input>
                  <button class="clear-name-control" type="button" data-clear-name="${index}" aria-label="Clear Player ${index + 1} name">Clear</button>
                </div>
              </div>
            `
          )
          .join("")}
        <div class="form-actions">
          <button class="ghost" type="button" data-action="back-player-count">Back</button>
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
      name: normalizeName(capitalizeFirstAlphabetical(form.get(`player-${index}`)), index),
    }));
    rememberPlayerNames(players);
    setState({ players, screen: "order" });
  });
  bind("[data-action='back-player-count']", "click", () => setState({ screen: "playerCount" }));
  document.querySelectorAll("[data-name-input]").forEach((input) => {
    input.addEventListener("blur", () => {
      input.value = capitalizeFirstAlphabetical(input.value);
    });
  });
  document.querySelectorAll("[data-clear-name]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(`player-${button.dataset.clearName}`);
      if (!input) return;
      input.value = "";
      input.focus();
    });
  });
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

function renderGame(app, options = {}) {
  const currentPlayer = state.players[state.activePlayerIndex];
  const layoutMode = state.layoutMode === "wide" ? "wide" : "default";
  app.innerHTML = `
    <section class="screen game-screen ${layoutMode === "wide" ? "wide-mode" : ""}">
      ${renderGameSettings(layoutMode)}
      ${
        layoutMode === "wide"
          ? `
            <div class="game-layout wide-layout">
              <div class="game-column controls-column">
                ${renderEntryPad()}
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
            ${renderMobileScoreSummary()}
            ${renderScoreDisplay()}
            ${renderEntryPad(false)}
            ${renderTurnOrderViz()}
            ${renderScoreboardPanel()}
            ${renderMobileEndGameControl()}
          `
      }
      ${renderScoreEditDialog()}
    </section>
  `;

  bind("[data-layout-mode]", "change", (event) => {
    setLayoutMode(event.currentTarget.value);
  });
  bind("[data-theme-mode]", "change", (event) => setThemeMode(event.currentTarget.value));
  bind("[data-haptics-enabled]", "change", (event) => setHapticsEnabled(event.currentTarget.checked));
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
  bind("[data-action='undo-last']", "click", undoLastEntry);
  bindScoreEditing();
  if (!options.skipScoreScroll) {
    setTimeout(scrollLiveScoreboardToBottom, 0);
  } else if (options.scoreScrollTop !== null) {
    setTimeout(() => restoreLiveScoreboardScroll(options.scoreScrollTop), 0);
  }
}

function renderGameSettings(layoutMode) {
  return `
    <details class="game-settings" data-game-settings ${layoutMode === "wide" ? "open" : ""}>
      <summary>Options</summary>
      <div class="settings-row">
        <div class="layout-menu">
          <label for="layout-mode">Format</label>
          <select id="layout-mode" data-layout-mode>
            <option value="default" ${layoutMode === "default" ? "selected" : ""}>${escapeHtml(BRAND.layouts.default)}</option>
            <option value="wide" ${layoutMode === "wide" ? "selected" : ""}>${escapeHtml(BRAND.layouts.wide)}</option>
          </select>
        </div>
        ${renderThemeMenu()}
        ${renderHapticsToggle()}
      </div>
    </details>
  `;
}

function renderMobileScoreSummary() {
  return `
    <div class="mobile-score-summary" aria-label="Current player scores">
      ${state.players
        .map(
          (player, index) => `
            <button class="score-summary-chip ${index === state.activePlayerIndex ? "active" : ""}" type="button" disabled>
              <span>${escapeHtml(player.name)}</span>
              <strong>${player.score}${index === state.activePlayerIndex ? renderPendingScorePreview() : ""}</strong>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPendingScorePreview() {
  const pendingTotal = getTurnTotal();
  const hasPendingInput = state.inputValue !== "" || state.lineBonusApplied || state.lastTileBonusApplied;
  return hasPendingInput ? `<span class="pending-score">+${pendingTotal}</span>` : "";
}

function renderEntryPad(includeEndGame = true) {
  return `
    <div class="entry-pad">
      ${renderNumpad()}
      ${renderQuickControls()}
      ${includeEndGame ? renderEndGameButton() : ""}
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
      <strong class="person-label">${escapeHtml(player.name)}</strong>
      ${renderTableScore(player, index)}
    </div>
  `;
}

function renderTableScore(player, index) {
  const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
  return `
    <span class="table-score score-${index + 1} ${index === state.activePlayerIndex ? "active" : ""} ${index === nextIndex && index !== state.activePlayerIndex ? "next" : ""}">
      ${player.score}
    </span>
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
        ${renderLastTileButton()}
      </div>
      <button class="ghost undo-control" data-action="undo-last" ${state.turnHistory.length ? "" : "disabled"}>Undo Last Entry</button>
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

function renderMobileEndGameControl() {
  return `
    <div class="mobile-end-game-control">
      ${renderEndGameButton()}
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
      ${renderHeader("Game Complete", "Review the score sheet, final scores, and game notes.")}
      ${renderFinalTitleEditor()}
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
          <button class="ghost" data-action="record-game" data-return-screen="results">Edit Notes</button>
        </div>
      </div>

      <div class="sticky-actions" aria-label="Results navigation">
        <button class="primary icon-button" data-action="new"><span class="button-icon icon-reset" aria-hidden="true"></span><span>New Game</span></button>
        <button class="ghost icon-button" data-action="history"><span class="button-icon icon-history" aria-hidden="true"></span><span>History</span></button>
      </div>
    </section>
    ${renderScoreEditDialog()}
  `;

  bind("[data-action='record-game']", "click", (event) => openRecordGame(event.currentTarget.dataset.returnScreen || "results"));
  bind("[data-action='history']", "click", () => setState({ screen: "history", returnScreen: "results" }));
  bind("[data-action='new']", "click", startFreshGame);
  bind("[data-form='final-title']", "submit", saveFinalTitle);
  bind("[data-action='edit-final-title']", "click", () => setState({ editingFinalTitle: true }));
  bind("[data-action='cancel-final-title']", "click", () => setState({ editingFinalTitle: false }));
  bindScoreEditing();
}

function renderFinalTitleEditor() {
  const title = state.finalGameTitle || makeGameTitle(state);
  if (!state.editingFinalTitle) {
    return `
      <div class="final-title-editor final-title-view">
        <div>
          <p class="muted">Game name</p>
          <h2 class="section-title">${escapeHtml(title)}</h2>
          <p class="muted">Date: ${escapeHtml(formatDisplayDate(state.gameStartedAt || state.gameEndedAt))}</p>
        </div>
        <button class="ghost" type="button" data-action="edit-final-title">Edit Name</button>
      </div>
    `;
  }

  return `
    <form class="final-title-editor" data-form="final-title">
      <div class="field">
        <label for="final-game-title">Game name</label>
        <input id="final-game-title" name="title" value="${escapeAttribute(title)}" autocomplete="off">
      </div>
      <p class="muted">Date: ${escapeHtml(formatDisplayDate(state.gameStartedAt || state.gameEndedAt))}</p>
      <div class="button-row">
        <button class="primary" type="submit">Save Name</button>
        <button class="ghost" type="button" data-action="cancel-final-title">Cancel</button>
      </div>
    </form>
  `;
}

function renderSavedNotes(savedGame) {
  return `
    <div class="saved-notes">
      <h3 class="section-title">Notes</h3>
      ${savedGame?.notes ? `<p>${escapeHtml(savedGame.notes)}</p>` : '<p class="muted">No notes yet.</p>'}
    </div>
  `;
}

function renderRecordGame(app) {
  const existingGame = state.recordedGameId ? GAME_ARCHIVE_ADAPTER.find(state.recordedGameId) : null;
  app.innerHTML = `
    <section class="screen">
      ${renderHeader("Edit Notes", "Keep table memories without changing the active game.")}
      <form class="panel stack" data-form="record-game">
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
          <button class="primary" type="submit">Save Notes</button>
          <button class="ghost" type="button" data-action="cancel-record">Cancel</button>
        </div>
      </form>
    </section>
  `;

  bind("[data-form='record-game']", "submit", saveRecordedGame);
  bind("[data-action='cancel-record']", "click", () => setState({ screen: state.returnScreen || "game" }));
}

function renderHistory(app) {
  const games = GAME_ARCHIVE_ADAPTER.load();
  const backLabel = getReturnToGameLabel();
  app.innerHTML = `
    <section class="screen results-screen">
      ${renderHeader("Game History", "Browse saved games. This does not change the active game.")}
      <div class="history-list">
        ${
          games.length
            ? games.map(renderHistoryCard).join("")
            : '<div class="empty-history">No saved games yet.</div>'
        }
      </div>
      <div class="sticky-actions single-action" aria-label="History navigation">
        <button class="primary" data-action="back">${escapeHtml(backLabel)}</button>
      </div>
    </section>
  `;

  bind("[data-action='back']", "click", () => setState({ screen: getHistoryBackScreen(), returnScreen: "start" }));
  document.querySelectorAll("[data-history-id]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ screen: "historyDetail", historySelectedId: button.dataset.historyId, deleteHistoryArmedId: null });
    });
  });
}

function renderHistoryCard(game) {
  const finalScores = [...game.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const savedDate = formatCompactDate(game.savedAt);
  return `
    <button class="history-card" data-history-id="${escapeAttribute(game.id)}">
      <span class="history-card-main">
        <span class="history-card-date">${escapeHtml(savedDate)}</span>
        <strong>${escapeHtml(game.title)}</strong>
      </span>
      <span class="history-card-score">${escapeHtml(formatInitialScores(finalScores))}</span>
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
  const backLabel = getReturnToGameLabel();
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
      </div>
      <div class="panel stack">
        <h2 class="section-title">Final Scores</h2>
        ${renderFinalScoresGrid(rankings, Boolean(game.assignsWinner))}
      </div>
      <div class="panel stack">
        <h2 class="section-title">Score Sheet</h2>
        ${renderArchivedScoreSheet(game)}
      </div>
      <div class="history-maintenance">
        <button class="subtle-history-action" data-action="edit-history-notes">Edit Notes</button>
        ${renderHistoryDeleteControls(game)}
      </div>
      <div class="sticky-actions" aria-label="Saved game navigation">
        <button class="ghost" data-action="history">Back to History</button>
        <button class="primary" data-action="return-to-game">${escapeHtml(backLabel)}</button>
      </div>
    </section>
  `;

  bind("[data-action='history']", "click", () => setState({ screen: "history", historySelectedId: null }));
  bind("[data-action='return-to-game']", "click", () => setState({ screen: getHistoryBackScreen(), historySelectedId: null, deleteHistoryArmedId: null }));
  bind("[data-action='edit-history-notes']", "click", () => setState({ screen: "editHistoryNotes", historySelectedId: game.id, deleteHistoryArmedId: null }));
  bind("[data-action='arm-delete-history']", "click", () => setState({ deleteHistoryArmedId: game.id }));
  bind("[data-action='cancel-delete-history']", "click", () => setState({ deleteHistoryArmedId: null }));
  bind("[data-action='confirm-delete-history']", "click", () => deleteHistoryGame(game.id));
}

function renderEditHistoryNotes(app) {
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

  app.innerHTML = `
    <section class="screen">
      ${renderHeader("Edit Notes", game.title)}
      <form class="panel stack" data-form="history-notes">
        <div class="field">
          <label for="history-notes">Notes</label>
          <textarea id="history-notes" name="notes" rows="7" placeholder="Who played, where it happened, weird table moments, anything worth remembering.">${escapeHtml(game.notes || "")}</textarea>
        </div>
        <div class="button-row">
          <button class="primary" type="submit">Update Notes</button>
          <button class="ghost" type="button" data-action="cancel-history-notes">Cancel</button>
        </div>
      </form>
    </section>
  `;

  bind("[data-form='history-notes']", "submit", saveHistoryNotes);
  bind("[data-action='cancel-history-notes']", "click", () => setState({ screen: "historyDetail" }));
}

function renderHistoryDeleteControls(game) {
  if (state.deleteHistoryArmedId !== game.id) {
    return `<button class="subtle-history-action delete-history-control" data-action="arm-delete-history">Delete Saved Game</button>`;
  }

  return `
    <div class="end-game-confirm history-delete-confirm">
      <button class="ghost" data-action="cancel-delete-history">Keep Saved Game</button>
      <button class="danger" data-action="confirm-delete-history">Delete</button>
    </div>
  `;
}

function renderScoreEditDialog() {
  if (!state.editingTurnId) return "";
  const turn = state.turnHistory.find((item) => item.id === state.editingTurnId);
  if (!turn) return "";
  const player = state.players.find((item) => item.id === turn.playerId);
  const preEndBonusTotal = turn.turnTotal - turn.lastTileBonus;
  return `
    <div class="dialog-backdrop" role="presentation">
      <form class="edit-score-dialog" data-form="edit-score" role="dialog" aria-modal="true" aria-labelledby="edit-score-title">
        <h2 id="edit-score-title" class="section-title">Edit Score</h2>
        <p class="muted">${escapeHtml(player?.name || "Player")} &middot; Round ${turn.roundNumber}</p>
        <div class="field">
          <label for="edit-score-value">Score</label>
          <input id="edit-score-value" name="score" inputmode="numeric" pattern="[0-9]*" value="${escapeAttribute(preEndBonusTotal)}" autocomplete="off">
        </div>
        ${turn.lastTileBonus ? `<p class="muted">Last Tile +${turn.lastTileBonus} stays attached to this entry.</p>` : ""}
        <div class="button-row">
          <button class="primary" type="submit">Save</button>
          <button class="ghost" type="button" data-action="cancel-edit-score">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function bindScoreEditing() {
  document.querySelectorAll("[data-edit-turn]").forEach((button) => {
    button.addEventListener("click", () => setState({ editingTurnId: button.dataset.editTurn }));
  });
  bind("[data-form='edit-score']", "submit", saveScoreEdit);
  bind("[data-action='cancel-edit-score']", "click", () => setState({ editingTurnId: null }));
}

function saveScoreEdit(event) {
  event.preventDefault();
  if (!state.editingTurnId) return;
  const form = new FormData(event.currentTarget);
  const score = Number(String(form.get("score") || "").trim());
  if (!Number.isInteger(score) || score < 0) return;
  state = QC.editTurnScore(state, state.editingTurnId, score, new Date().toISOString());
  persist();
  render();
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
    ${hasEditedScores(state.turnHistory) ? '<p class="edited-legend">* edited score</p>' : ""}
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
    ${hasEditedScores(game.turnHistory) ? '<p class="edited-legend">* edited score</p>' : ""}
    ${renderTotalsGrid(game.players)}
  `;
}

function renderArchivedScoreboardCell(game, round, player) {
  const turn = game.turnHistory.find((item) => item.roundNumber === round && item.playerId === player.id);
  if (!turn) return `<td class="score-empty">-</td>`;
  const previousTotal = getArchivedPreviousRunningTotal(game, turn);
  const preEndBonusTotal = turn.turnTotal - turn.lastTileBonus;
  return `
    <td>
      <div class="paper-entry">
        <span class="paper-crossout">${previousTotal}</span>
        <strong class="paper-turn">+${preEndBonusTotal}</strong>
        ${turn.lastTileBonus ? `<span class="paper-end-bonus">+${turn.lastTileBonus} end</span>` : ""}
        <span class="paper-running">${turn.runningTotal}</span>
        ${turn.manuallyEdited ? '<span class="edited-mark" title="Edited score">*</span>' : ""}
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
  const preEndBonusTotal = turn.turnTotal - turn.lastTileBonus;
  return `
    <td>
      <button class="score-edit-button" type="button" data-edit-turn="${escapeAttribute(turn.id)}" aria-label="Edit ${escapeAttribute(player.name)} round ${round} score">
        <span class="paper-entry">
          <span class="paper-crossout">${previousTotal}</span>
          <strong class="paper-turn">+${preEndBonusTotal}</strong>
          ${turn.lastTileBonus ? `<span class="paper-end-bonus">+${turn.lastTileBonus} end</span>` : ""}
          <span class="paper-running">${turn.runningTotal}</span>
          ${turn.manuallyEdited ? '<span class="edited-mark" title="Edited score">*</span>' : ""}
        </span>
      </button>
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

function hasEditedScores(turnHistory) {
  return turnHistory.some((turn) => turn.manuallyEdited);
}

function renderHeader(title, subtitle) {
  return `
    <header class="topbar">
      <div>
        <h1 class="screen-title">${escapeHtml(title)}</h1>
        <p class="subtitle">${escapeHtml(subtitle)}</p>
      </div>
      <button class="brand-mark brand-button" type="button" data-action="main-menu" aria-label="Main menu">${escapeHtml(BRAND.shortName)}</button>
    </header>
  `;
}

function makeDefaultPlayers(count) {
  const rememberedNames = PLAYER_NAMES_ADAPTER.load();
  return QC.makeDefaultPlayers(count, rememberedNames);
}

function rememberPlayerNames(players) {
  PLAYER_NAMES_ADAPTER.save(players.map((player) => player.name));
}

function setLayoutMode(layoutMode) {
  const nextLayout = layoutMode === "wide" ? "wide" : "default";
  LAYOUT_ADAPTER.save(nextLayout);
  setState({ layoutMode: nextLayout });
}

function setThemeMode(themeMode) {
  const nextTheme = normalizeThemeMode(themeMode);
  THEME_ADAPTER.save(nextTheme);
  setState({ themeMode: nextTheme });
}

function normalizeThemeMode(themeMode) {
  return Object.prototype.hasOwnProperty.call(BRAND.themes, themeMode) ? themeMode : DEFAULT_THEME_MODE;
}

function setSaveMode(saveMode) {
  const nextSaveMode = saveMode === "saveAll" ? "saveAll" : "sessionless";
  SAVE_MODE_ADAPTER.save(nextSaveMode);
  setState({ saveMode: nextSaveMode });
}

function setHapticsEnabled(hapticsEnabled) {
  HAPTICS_ADAPTER.save(Boolean(hapticsEnabled));
  setState({ hapticsEnabled: Boolean(hapticsEnabled) });
}

function triggerHaptic() {
  if (!state.hapticsEnabled) return;
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(10);
  }
}

function getEventButton(event) {
  return event.target instanceof Element ? event.target.closest("button") : null;
}

function handleButtonPointerDown(event) {
  const button = getEventButton(event);
  if (!button || button.disabled) return;
  activePressButton = button;
  button.classList.add("is-pressing");
}

function releaseActiveButtonPress() {
  if (!activePressButton) return;
  releaseButtonPress(activePressButton);
  activePressButton = null;
}

function pulseButtonPress(button) {
  button.classList.add("is-pressing");
  releaseButtonPress(button, 120);
}

function releaseButtonPress(button, delay = 70) {
  window.clearTimeout(PRESS_TIMERS.get(button));
  const timer = window.setTimeout(() => {
    button.classList.remove("is-pressing");
  }, delay);
  PRESS_TIMERS.set(button, timer);
}

function goToMainMenu() {
  setState({
    screen: "start",
    historySelectedId: null,
    deleteHistoryArmedId: null,
    editingTurnId: null,
    returnScreen: "start",
  });
}

function getHistoryBackScreen() {
  if (state.returnScreen === "results" && state.gameOver) return "results";
  if (state.returnScreen === "game" && state.gameStartedAt && !state.gameOver) return "game";
  return "start";
}

function getReturnToGameLabel() {
  const screen = getHistoryBackScreen();
  if (screen === "start") return "Start Screen";
  return "Return to Game";
}

function openRecordGame(returnScreen) {
  if (!state.players.length) return;
  setState({ screen: "recordGame", returnScreen });
}

function saveRecordedGame(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const title = state.finalGameTitle || makeGameTitle(state);
  const notes = String(form.get("notes") || "").trim();
  const savedGame = makeGameSnapshot({ title, notes });
  GAME_ARCHIVE_ADAPTER.upsert(savedGame);
  setState({ recordedGameId: savedGame.id, screen: state.returnScreen || "results" });
}

function saveHistoryNotes(event) {
  event.preventDefault();
  const game = GAME_ARCHIVE_ADAPTER.find(state.historySelectedId);
  if (!game) return;
  const form = new FormData(event.currentTarget);
  const notes = String(form.get("notes") || "").trim();
  GAME_ARCHIVE_ADAPTER.upsert({ ...game, notes });
  setState({ screen: "historyDetail" });
}

function saveFinalTitle(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const finalGameTitle = String(form.get("title") || "").trim() || makeGameTitle(state);
  if (state.recordedGameId) {
    const game = GAME_ARCHIVE_ADAPTER.find(state.recordedGameId);
    if (game) GAME_ARCHIVE_ADAPTER.upsert({ ...game, title: finalGameTitle, updatedAt: new Date().toISOString() });
  }
  setState({ finalGameTitle, editingFinalTitle: false });
}

function autoSaveCompletedGame() {
  if (!state.gameOver || state.recordedGameId || !state.players.length) return;
  const savedGame = makeGameSnapshot({ title: state.finalGameTitle || makeGameTitle(state), notes: "" });
  GAME_ARCHIVE_ADAPTER.upsert(savedGame);
  setState({ recordedGameId: savedGame.id });
}

function makeGameSnapshot({ title, notes }) {
  const existingGame = state.recordedGameId ? GAME_ARCHIVE_ADAPTER.find(state.recordedGameId) : null;
  const now = new Date().toISOString();
  return QC.makeGameSnapshot(state, { existingGame, now, title, notes });
}

function makeGameTitle(gameState) {
  if (gameState.finalGameTitle) return gameState.finalGameTitle;
  const date = formatCompactDate(gameState.gameStartedAt || new Date().toISOString());
  const initials = formatPlayerInitials(gameState.players);
  const winner = getDefaultTitleWinner(gameState);
  const titleBase = initials ? `${date} ${initials}` : `${date} Game`;
  return winner ? `${titleBase} - ${winner} Wins` : titleBase;
}

function normalizeName(value, index) {
  return QC.normalizeName(value, index);
}

function capitalizeFirstAlphabetical(value) {
  return String(value || "").replace(/[A-Za-z]/, (letter) => letter.toUpperCase());
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
    undoHistory: [],
    gameOver: false,
    gameEndReason: null,
    endGameArmed: false,
    recordedGameId: null,
    finalGameTitle: "",
    editingFinalTitle: false,
    editingTurnId: null,
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
  setState({ inputValue: nextValue.replace(/^0+(?=\d)/, ""), endGameArmed: false }, { skipScoreScroll: true });
}

function backspaceInput() {
  setState({ inputValue: state.inputValue.slice(0, -1), endGameArmed: false }, { skipScoreScroll: true });
}

function clearInput() {
  setState({ inputValue: "", endGameArmed: false }, { skipScoreScroll: true });
}

function resetHand() {
  setState({ inputValue: "0", lineBonusApplied: false, endGameArmed: false }, { skipScoreScroll: true });
}

function toggleLineBonus() {
  setState({ lineBonusApplied: !state.lineBonusApplied, endGameArmed: false }, { skipScoreScroll: true });
}

function standardLineScore() {
  setState({ inputValue: "12", lineBonusApplied: false, endGameArmed: false }, { skipScoreScroll: true });
}

function toggleLastTileBonus() {
  setState({ lastTileBonusApplied: !state.lastTileBonusApplied, endGameArmed: false }, { skipScoreScroll: true });
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

function undoLastEntry() {
  state = QC.undoLastTurn(state);
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

function formatCompactDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Saved Game";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year} ${month} ${day}`;
}

function formatPlayerInitials(players) {
  return players.map((player) => getPlayerInitial(player.name)).join("");
}

function formatInitialScores(players) {
  return players.map((player) => `${getPlayerInitial(player.name)} ${player.score}`).join(" / ");
}

function getDefaultTitleWinner(gameState) {
  if (!QC.doesAssignWinner(gameState) || !gameState.players.length) return "";
  const winner = QC.getRankings(gameState.players)[0];
  return winner ? getPlayerInitial(winner.name) : "";
}

function getPlayerInitial(name) {
  const trimmed = String(name || "").trim();
  return (trimmed[0] || "?").toUpperCase();
}

function scrollToFinalScores() {
  document.getElementById("final-scores")?.scrollIntoView({ behavior: "smooth", block: "end" });
}

function scrollLiveScoreboardToBottom() {
  const scoreSheet = document.querySelector("[data-score-rounds]");
  if (scoreSheet) scoreSheet.scrollTop = scoreSheet.scrollHeight;
}

function getLiveScoreboardScrollTop() {
  const scoreSheet = document.querySelector("[data-score-rounds]");
  return scoreSheet ? scoreSheet.scrollTop : null;
}

function restoreLiveScoreboardScroll(scrollTop) {
  const scoreSheet = document.querySelector("[data-score-rounds]");
  if (scoreSheet) scoreSheet.scrollTop = scrollTop;
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
