"use strict";

const assert = require("node:assert/strict");
const QC = require("../core.js");

function makeStartedState(playerCount = 2) {
  return {
    ...QC.createInitialState(),
    screen: "game",
    playerCount,
    players: QC.makeDefaultPlayers(playerCount, ["Sam", "Alex", "Jordan", "Taylor"]),
    gameStartedAt: "2026-05-03T20:00:00.000Z",
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("normal turns advance player, round, and running totals", () => {
  let state = makeStartedState(2);
  state = QC.submitTurn({ ...state, inputValue: "5" }, "2026-05-03T20:01:00.000Z");
  state = QC.submitTurn({ ...state, inputValue: "7" }, "2026-05-03T20:02:00.000Z");
  state = QC.submitTurn({ ...state, inputValue: "0" }, "2026-05-03T20:03:00.000Z");
  state = QC.submitTurn({ ...state, inputValue: "10" }, "2026-05-03T20:04:00.000Z");

  assert.equal(state.players[0].score, 5);
  assert.equal(state.players[1].score, 17);
  assert.equal(state.turnNumber, 5);
  assert.equal(state.activePlayerIndex, 0);
  assert.deepEqual(
    state.turnHistory.map((turn) => turn.roundNumber),
    [1, 1, 2, 2]
  );
});

test("line bonus records base, bonus, and total", () => {
  const state = QC.submitTurn(
    { ...makeStartedState(2), inputValue: "6", lineBonusApplied: true },
    "2026-05-03T20:01:00.000Z"
  );
  const turn = state.turnHistory[0];

  assert.equal(turn.baseScore, 6);
  assert.equal(turn.lineBonus, 6);
  assert.equal(turn.turnTotal, 12);
  assert.equal(state.players[0].score, 12);
});

test("last tile bonus ends the game and assigns winner treatment", () => {
  const state = QC.submitTurn(
    { ...makeStartedState(2), inputValue: "8", lastTileBonusApplied: true },
    "2026-05-03T20:01:00.000Z"
  );

  assert.equal(state.gameOver, true);
  assert.equal(state.gameEndReason, "lastTile");
  assert.equal(state.screen, "results");
  assert.equal(state.turnHistory[0].lastTileBonus, 6);
  assert.equal(state.players[0].score, 14);
  assert.equal(QC.doesAssignWinner(state), true);
});

test("undo last turn removes the entry and restores active player", () => {
  let state = makeStartedState(2);
  state = QC.submitTurn({ ...state, inputValue: "5" }, "2026-05-03T20:01:00.000Z");
  state = QC.submitTurn({ ...state, inputValue: "7" }, "2026-05-03T20:02:00.000Z");

  state = QC.undoLastTurn(state);

  assert.equal(state.players[0].score, 5);
  assert.equal(state.players[1].score, 0);
  assert.equal(state.turnHistory.length, 1);
  assert.equal(state.activePlayerIndex, 1);
  assert.equal(state.turnNumber, 2);
  assert.equal(state.gameOver, false);
});

test("undo after last tile reopens the game without an edited marker", () => {
  let state = makeStartedState(2);
  state = QC.submitTurn(
    { ...state, inputValue: "8", lastTileBonusApplied: true },
    "2026-05-03T20:01:00.000Z"
  );

  state = QC.undoLastTurn(state);

  assert.equal(state.gameOver, false);
  assert.equal(state.gameEndReason, null);
  assert.equal(state.screen, "game");
  assert.equal(state.players[0].score, 0);
  assert.equal(state.turnHistory.length, 0);
});

test("manual score edit marks a turn and recomputes later running totals", () => {
  let state = makeStartedState(2);
  state = QC.submitTurn({ ...state, inputValue: "5" }, "2026-05-03T20:01:00.000Z");
  state = QC.submitTurn({ ...state, inputValue: "7" }, "2026-05-03T20:02:00.000Z");
  state = QC.submitTurn({ ...state, inputValue: "4" }, "2026-05-03T20:03:00.000Z");

  state = QC.editTurnScore(state, state.turnHistory[0].id, 9, "2026-05-03T20:04:00.000Z");

  assert.equal(state.turnHistory[0].turnTotal, 9);
  assert.equal(state.turnHistory[0].manuallyEdited, true);
  assert.equal(state.turnHistory[2].runningTotal, 13);
  assert.deepEqual(state.players.map((player) => player.score), [13, 7]);
});

test("manual end does not assign winner", () => {
  const state = {
    ...makeStartedState(2),
    gameOver: true,
    gameEndReason: "manual",
  };

  assert.equal(QC.doesAssignWinner(state), false);
});

test("rankings sort by score descending then name", () => {
  const rankings = QC.getRankings([
    { name: "Zoe", score: 10 },
    { name: "Ann", score: 10 },
    { name: "Max", score: 12 },
  ]);

  assert.deepEqual(
    rankings.map((player) => player.name),
    ["Max", "Ann", "Zoe"]
  );
});

test("remembered names fill defaults and blank names fall back", () => {
  const players = QC.makeDefaultPlayers(3, ["Scott", "Nichole"]);

  assert.equal(players[0].name, "Scott");
  assert.equal(players[1].name, "Nichole");
  assert.equal(players[2].name, "Player 3");
  assert.equal(QC.normalizeName("   ", 1), "Player 2");
});

test("cabin is the default theme and explicit theme options are preserved", () => {
  assert.equal(QC.createInitialState().themeMode, "cabin");
  assert.equal(QC.createInitialState({ themeMode: "default" }).themeMode, "default");
});

test("scoreboard rounds include open row only for active games", () => {
  let state = makeStartedState(2);
  state = QC.submitTurn({ ...state, inputValue: "4" }, "2026-05-03T20:01:00.000Z");
  state = QC.submitTurn({ ...state, inputValue: "5" }, "2026-05-03T20:02:00.000Z");
  state = QC.submitTurn({ ...state, inputValue: "6" }, "2026-05-03T20:03:00.000Z");

  assert.deepEqual(QC.getScoreboardRounds(state, true), [1, 2]);
  assert.deepEqual(QC.getScoreboardRounds(state, false), [1, 2]);
});

test("game snapshots preserve active game data as archive data", () => {
  const state = QC.submitTurn(
    { ...makeStartedState(2), inputValue: "8", lastTileBonusApplied: true },
    "2026-05-03T20:01:00.000Z"
  );
  const snapshot = QC.makeGameSnapshot(state, {
    now: "2026-05-03T20:05:00.000Z",
    title: "Sunday table",
    notes: "Quick replay.",
  });

  assert.equal(snapshot.title, "Sunday table");
  assert.equal(snapshot.notes, "Quick replay.");
  assert.equal(snapshot.status, "finished");
  assert.equal(snapshot.assignsWinner, true);
  assert.notEqual(snapshot.players, state.players);
  assert.deepEqual(snapshot.players.map((player) => player.score), [14, 0]);
});
