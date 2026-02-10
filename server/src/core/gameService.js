import { createId } from "../utils/id.js";
import { now } from "../utils/now.js";
import { checkWinner, isDraw, validateMove } from "./gameRules.js";

export function createGameService({ gameStore, statsRepo }) {
  const roomName = (gameId) => `game:${gameId}`;

  function publicState(game) {
    // do not leak socket ids
    return {
      id: game.id,
      createdAt: game.createdAt,
      status: game.status,
      players: { ...game.players },
      board: [...game.board],
      turn: game.turn,
      winner: game.winner,
      winningLine: game.winningLine || null,
      lastMoveAt: game.lastMoveAt,
    };
  }

  function getMarkForPlayer(game, playerName) {
    if (game.players.X === playerName) return "X";
    if (game.players.O === playerName) return "O";
    return null;
  }

  function getOpponentName(game, playerName) {
    const mark = getMarkForPlayer(game, playerName);
    if (!mark) return null;
    return mark === "X" ? game.players.O : game.players.X;
  }

  async function finishGameAndUpdateStats(game) {
    game.status = "finished";
    const xName = game.players.X;
    const oName = game.players.O;

    if (!xName || !oName) return; // unfinished match (e.g. left before start)

    if (game.winner === "draw") {
      await statsRepo.incDraw(xName);
      await statsRepo.incDraw(oName);
      return;
    }
    if (game.winner === "X") {
      await statsRepo.incWin(xName);
      await statsRepo.incLoss(oName);
      return;
    }
    if (game.winner === "O") {
      await statsRepo.incWin(oName);
      await statsRepo.incLoss(xName);
      return;
    }
  }

  return {
    roomName,
    publicState,

    getGame(gameId) {
      return gameStore.get(gameId);
    },

    createGame({ hostName, hostSocketId }) {
      const id = createId();
      const game = {
        id,
        createdAt: now(),
        status: "waiting",
        players: { X: hostName, O: null },
        socketsByName: { [hostName]: hostSocketId },
        board: Array(9).fill(""),
        turn: "X",
        winner: null,
        winningLine: null,
        lastMoveAt: null,
      };
      gameStore.set(id, game);
      return game;
    },

    joinGame({ gameId, guestName, guestSocketId }) {
      const game = gameStore.get(gameId);
      if (!game) throw new Error("Game not found.");
      if (game.status !== "waiting") throw new Error("This game is not available.");
      if (game.players.X === guestName) throw new Error("You cannot join your own game.");

      game.players.O = guestName;
      game.socketsByName[guestName] = guestSocketId;
      game.status = "playing";
      game.lastMoveAt = now();

      return { game, notices: ["Connected."] };
    },

    async makeMove({ gameId, playerName, index }) {
      const game = gameStore.get(gameId);
      if (!game) throw new Error("Game not found.");

      const playerMark = getMarkForPlayer(game, playerName);
      if (!playerMark) throw new Error("You are not a player in this game.");

      validateMove({ game, playerMark, index });

      game.board[index] = playerMark;
      game.lastMoveAt = now();

      const winner = checkWinner(game.board);
      if (winner) {
        game.winner = winner;
        game.status = "finished";
        await finishGameAndUpdateStats(game);
        return { game, finished: true };
      }

      if (isDraw(game.board)) {
        game.winner = "draw";
        game.status = "finished";
        await finishGameAndUpdateStats(game);
        return { game, finished: true };
      }

      game.turn = game.turn === "X" ? "O" : "X";
      return { game, finished: false };
    },

    async leaveGame({ gameId, playerName }) {
      const game = gameStore.get(gameId);
      if (!game) throw new Error("Game not found.");

      const mark = getMarkForPlayer(game, playerName);
      if (!mark) throw new Error("You are not a player in this game.");

      // If playing, forfeit: opponent wins
      if (game.status === "playing") {
        const opponent = getOpponentName(game, playerName);
        if (opponent) {
          game.winner = mark === "X" ? "O" : "X";
          await finishGameAndUpdateStats(game);
        } else {
          game.status = "finished";
        }
      } else {
        game.status = "finished";
      }

      return { game };
    },

    async handleDisconnect({ socketId }) {
      // Find games where this socket is a player
      const games = gameStore.list();
      const affected = [];

      for (const g of games) {
        if (g.status !== "playing") continue;

        const entries = Object.entries(g.socketsByName);
        const found = entries.find(([, sid]) => sid === socketId);
        if (!found) continue;

        const [playerName] = found;
        await this.leaveGame({ gameId: g.id, playerName });
        affected.push(g.id);
      }

      return affected;
    },
  };
}
