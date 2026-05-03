(function initCore(root, factory) {
  const core = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = core;
  }
  root.QC = core;
})(typeof globalThis !== "undefined" ? globalThis : window, function buildCore() {
  "use strict";

  function createInitialState(options = {}) {
    return {
      screen: "start",
      playerCount: 0,
      players: [],
      activePlayerIndex: 0,
      turnNumber: 1,
      inputValue: "",
      lineBonusApplied: false,
      lastTileBonusApplied: false,
      gameStartedAt: null,
      gameEndedAt: null,
      turnHistory: [],
      gameOver: false,
      gameEndReason: null,
      endGameArmed: false,
      recordedGameId: null,
      historySelectedId: null,
      returnScreen: "start",
      layoutMode: options.layoutMode || "default",
      saveMode: options.saveMode || "sessionless",
      orderSelectedIndex: null,
    };
  }

  function hydrateState(savedState, fallbackState) {
    if (!savedState || typeof savedState !== "object") return null;
    return {
      ...fallbackState,
      ...savedState,
      players: Array.isArray(savedState.players) ? savedState.players : [],
      turnHistory: Array.isArray(savedState.turnHistory) ? savedState.turnHistory : [],
    };
  }

  function makeDefaultPlayers(count, rememberedNames = []) {
    return Array.from({ length: count }, (_, index) => ({
      id: `p${index + 1}`,
      name: rememberedNames[index] || `Player ${index + 1}`,
      score: 0,
    }));
  }

  function normalizeName(value, index) {
    const name = String(value || "").trim();
    return name || `Player ${index + 1}`;
  }

  function getRoundNumber(turnNumber, playerCount) {
    return Math.floor((turnNumber - 1) / playerCount) + 1;
  }

  function getBaseScore(inputValue) {
    return Number(inputValue || 0);
  }

  function calculateTurnScore(gameState) {
    const baseScore = getBaseScore(gameState.inputValue);
    const lineBonus = gameState.lineBonusApplied ? 6 : 0;
    const lastTileBonus = gameState.lastTileBonusApplied ? 6 : 0;
    return {
      baseScore,
      lineBonus,
      lastTileBonus,
      turnTotal: baseScore + lineBonus + lastTileBonus,
    };
  }

  function submitTurn(gameState, timestamp) {
    if (!gameState.players.length || gameState.gameOver) return gameState;

    const { baseScore, lineBonus, lastTileBonus, turnTotal } = calculateTurnScore(gameState);
    const players = gameState.players.map((player) => ({ ...player }));
    const currentPlayer = players[gameState.activePlayerIndex];
    currentPlayer.score += turnTotal;

    const gameOver = Boolean(gameState.lastTileBonusApplied);
    const turnHistory = [
      ...gameState.turnHistory,
      {
        turnNumber: gameState.turnNumber,
        roundNumber: getRoundNumber(gameState.turnNumber, gameState.playerCount),
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        baseScore,
        lineBonus,
        lastTileBonus,
        turnTotal,
        runningTotal: currentPlayer.score,
        isLastTile: gameState.lastTileBonusApplied,
        timestamp,
      },
    ];

    return {
      ...gameState,
      players,
      turnHistory,
      activePlayerIndex: gameOver ? gameState.activePlayerIndex : (gameState.activePlayerIndex + 1) % gameState.players.length,
      turnNumber: gameOver ? gameState.turnNumber : gameState.turnNumber + 1,
      inputValue: "",
      lineBonusApplied: false,
      lastTileBonusApplied: false,
      endGameArmed: false,
      gameOver,
      gameEndReason: gameOver ? "lastTile" : null,
      gameEndedAt: gameOver ? timestamp : null,
      screen: gameOver ? "results" : "game",
    };
  }

  function getRankings(players) {
    return [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  function doesAssignWinner(gameState) {
    return gameState.gameEndReason === "lastTile" || (gameState.gameEndReason === null && gameState.turnHistory.some((turn) => turn.isLastTile));
  }

  function getScoreboardRounds(gameState, includeOpenRow = true) {
    const completedRounds = gameState.turnHistory.map((turn) => turn.roundNumber);
    const currentRound = gameState.gameOver || !includeOpenRow ? 0 : getRoundNumber(gameState.turnNumber, gameState.playerCount);
    const maxRound = Math.max(currentRound, ...completedRounds, 1);
    return Array.from({ length: maxRound }, (_, index) => index + 1);
  }

  function getPreviousRunningTotal(turnHistory, turn) {
    const previousTurn = [...turnHistory]
      .reverse()
      .find((item) => item.playerId === turn.playerId && item.turnNumber < turn.turnNumber);
    return previousTurn ? previousTurn.runningTotal : 0;
  }

  function makeGameSnapshot(gameState, options) {
    const existingGame = options.existingGame || null;
    const now = options.now;
    return {
      id: existingGame?.id || `game-${Date.parse(now) || Date.now()}`,
      title: options.title,
      notes: options.notes,
      savedAt: existingGame?.savedAt || now,
      updatedAt: now,
      status: gameState.gameOver ? "finished" : "in progress",
      photoStatus: "placeholder",
      playerCount: gameState.playerCount,
      players: gameState.players.map((player) => ({ ...player })),
      turnHistory: gameState.turnHistory.map((turn) => ({ ...turn })),
      gameStartedAt: gameState.gameStartedAt,
      gameEndedAt: gameState.gameEndedAt,
      gameEndReason: gameState.gameEndReason,
      assignsWinner: doesAssignWinner(gameState),
    };
  }

  return {
    createInitialState,
    hydrateState,
    makeDefaultPlayers,
    normalizeName,
    getRoundNumber,
    getBaseScore,
    calculateTurnScore,
    submitTurn,
    getRankings,
    doesAssignWinner,
    getScoreboardRounds,
    getPreviousRunningTotal,
    makeGameSnapshot,
  };
});
