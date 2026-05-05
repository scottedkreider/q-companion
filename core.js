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
      undoHistory: [],
      gameOver: false,
      gameEndReason: null,
      endGameArmed: false,
      recordedGameId: null,
      finalGameTitle: "",
      historySelectedId: null,
      deleteHistoryArmedId: null,
      editingTurnId: null,
      returnScreen: "start",
      layoutMode: options.layoutMode || "default",
      themeMode: options.themeMode || "cabin",
      saveMode: options.saveMode || "sessionless",
      hapticsEnabled: options.hapticsEnabled !== false,
      orderSelectedIndex: null,
    };
  }

  function hydrateState(savedState, fallbackState) {
    if (!savedState || typeof savedState !== "object") return null;
    return {
      ...fallbackState,
      ...savedState,
      players: Array.isArray(savedState.players) ? savedState.players : [],
      turnHistory: Array.isArray(savedState.turnHistory) ? savedState.turnHistory.map(ensureTurnId) : [],
      undoHistory: Array.isArray(savedState.undoHistory) ? savedState.undoHistory.slice(-5) : [],
      hapticsEnabled: savedState.hapticsEnabled !== false,
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
    const turnId = makeTurnId(gameState.turnNumber, currentPlayer.id, timestamp);
    const turnHistory = [
      ...gameState.turnHistory,
      {
        id: turnId,
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
    const undoHistory = [
      ...(Array.isArray(gameState.undoHistory) ? gameState.undoHistory : []),
      { turnId, turnNumber: gameState.turnNumber, playerId: currentPlayer.id },
    ].slice(-5);

    return {
      ...gameState,
      players,
      turnHistory,
      undoHistory,
      activePlayerIndex: gameOver ? gameState.activePlayerIndex : (gameState.activePlayerIndex + 1) % gameState.players.length,
      turnNumber: gameOver ? gameState.turnNumber : gameState.turnNumber + 1,
      inputValue: "",
      lineBonusApplied: false,
      lastTileBonusApplied: false,
      endGameArmed: false,
      gameOver,
      gameEndReason: gameOver ? "lastTile" : null,
      gameEndedAt: gameOver ? timestamp : null,
      editingTurnId: null,
      screen: gameOver ? "results" : "game",
    };
  }

  function undoLastTurn(gameState) {
    if (!Array.isArray(gameState.turnHistory) || !gameState.turnHistory.length) return gameState;
    const undoHistory = Array.isArray(gameState.undoHistory) ? [...gameState.undoHistory] : [];
    const action = undoHistory.pop();
    const targetId = action?.turnId || gameState.turnHistory[gameState.turnHistory.length - 1]?.id;
    const turnIndex = gameState.turnHistory.findIndex((turn) => turn.id === targetId);
    const removedTurn = turnIndex >= 0 ? gameState.turnHistory[turnIndex] : gameState.turnHistory[gameState.turnHistory.length - 1];
    if (!removedTurn) return gameState;

    const turnHistory = gameState.turnHistory.filter((turn) => turn.id !== removedTurn.id);
    const players = recomputePlayersFromTurns(gameState.players, turnHistory);
    const activePlayerIndex = Math.max(
      0,
      players.findIndex((player) => player.id === removedTurn.playerId)
    );

    return {
      ...gameState,
      players,
      turnHistory,
      undoHistory,
      activePlayerIndex,
      turnNumber: removedTurn.turnNumber,
      inputValue: "",
      lineBonusApplied: false,
      lastTileBonusApplied: false,
      endGameArmed: false,
      gameOver: false,
      gameEndReason: null,
      gameEndedAt: null,
      recordedGameId: null,
      editingTurnId: null,
      screen: "game",
    };
  }

  function editTurnScore(gameState, turnId, editedPreEndBonusTotal, timestamp) {
    const nextValue = Number(editedPreEndBonusTotal);
    if (!Number.isInteger(nextValue) || nextValue < 0) return gameState;
    if (!gameState.turnHistory.some((turn) => turn.id === turnId)) return gameState;

    const turnHistory = gameState.turnHistory.map((turn) => {
      if (turn.id !== turnId) return turn;
      const preEndBonusTotal = turn.turnTotal - turn.lastTileBonus;
      const originalPreEndBonusTotal = turn.originalPreEndBonusTotal ?? preEndBonusTotal;
      const lineBonus = nextValue >= turn.lineBonus ? turn.lineBonus : 0;
      return {
        ...turn,
        baseScore: Math.max(0, nextValue - lineBonus),
        lineBonus,
        turnTotal: nextValue + turn.lastTileBonus,
        manuallyEdited: true,
        originalPreEndBonusTotal,
        editedAt: timestamp,
      };
    });

    return {
      ...gameState,
      players: recomputePlayersFromTurns(gameState.players, turnHistory),
      turnHistory: recomputeRunningTotals(turnHistory),
      recordedGameId: null,
      editingTurnId: null,
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

  function makeTurnId(turnNumber, playerId, timestamp) {
    const source = `${turnNumber}-${playerId}-${timestamp || Date.now()}`;
    return `turn-${source.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function ensureTurnId(turn) {
    if (!turn || typeof turn !== "object") return turn;
    return turn.id ? turn : { ...turn, id: makeTurnId(turn.turnNumber, turn.playerId, turn.timestamp) };
  }

  function recomputePlayersFromTurns(players, turnHistory) {
    const nextPlayers = players.map((player) => ({ ...player, score: 0 }));
    for (const turn of recomputeRunningTotals(turnHistory)) {
      const player = nextPlayers.find((item) => item.id === turn.playerId);
      if (player) player.score = turn.runningTotal;
    }
    return nextPlayers;
  }

  function recomputeRunningTotals(turnHistory) {
    const totals = new Map();
    return turnHistory.map((turn) => {
      const previousTotal = totals.get(turn.playerId) || 0;
      const runningTotal = previousTotal + turn.turnTotal;
      totals.set(turn.playerId, runningTotal);
      return { ...turn, runningTotal };
    });
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
    undoLastTurn,
    editTurnScore,
    getRankings,
    doesAssignWinner,
    getScoreboardRounds,
    getPreviousRunningTotal,
    makeGameSnapshot,
  };
});
