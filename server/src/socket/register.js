import { EVENTS } from "./events.js";

export function registerHandlers(io, { lobbyService, gameService, statsRepo }) {
  io.on("connection", (socket) => {
    // helper: send lobby to all
    const broadcastLobby = () => {
      const games = lobbyService.listLobbyGames();
      io.emit(EVENTS.LOBBY_UPDATE, { games });
    };

    const sendStatsTo = async (name) => {
      const stats = await statsRepo.getOrCreate(name);
      socket.emit(EVENTS.USER_STATS, { name, stats });
    };

    socket.on(EVENTS.USER_SET_NAME, async ({ name }) => {
      const clean = (name || "").trim().slice(0, 24);
      if (!clean) {
        socket.emit(EVENTS.TOAST_ERROR, { message: "Name is required." });
        return;
      }
      socket.data.name = clean;

      await sendStatsTo(clean);
      socket.emit(EVENTS.LOBBY_UPDATE, { games: lobbyService.listLobbyGames() });
    });

    socket.on(EVENTS.LOBBY_SUBSCRIBE, () => {
      socket.emit(EVENTS.LOBBY_UPDATE, { games: lobbyService.listLobbyGames() });
    });

    socket.on(EVENTS.GAME_CREATE, async () => {
      try {
        const name = socket.data.name;
        if (!name) throw new Error("Set your name first.");

        const game = gameService.createGame({ hostName: name, hostSocketId: socket.id });
        socket.join(gameService.roomName(game.id));

        socket.emit(EVENTS.GAME_STATE, { game: gameService.publicState(game, name) });
        broadcastLobby();
      } catch (e) {
        socket.emit(EVENTS.TOAST_ERROR, { message: e.message || "Create failed." });
      }
    });

    socket.on(EVENTS.GAME_JOIN, async ({ gameId }) => {
      try {
        const name = socket.data.name;
        if (!name) throw new Error("Set your name first.");

        const { game, notices } = gameService.joinGame({
          gameId,
          guestName: name,
          guestSocketId: socket.id,
        });

        socket.join(gameService.roomName(game.id));

        // notify room
        io.to(gameService.roomName(game.id)).emit(EVENTS.GAME_STATE, {
          game: gameService.publicState(game),
        });

        // optional: info to joiner
        if (notices?.length) {
          socket.emit(EVENTS.TOAST_INFO, { message: notices.join(" ") });
        }

        broadcastLobby();
      } catch (e) {
        socket.emit(EVENTS.TOAST_ERROR, { message: e.message || "Join failed." });
      }
    });

    socket.on(EVENTS.GAME_MOVE, async ({ gameId, index }) => {
      try {
        const name = socket.data.name;
        if (!name) throw new Error("Set your name first.");

        const result = await gameService.makeMove({
          gameId,
          playerName: name,
          index,
        });

        io.to(gameService.roomName(gameId)).emit(EVENTS.GAME_STATE, {
          game: gameService.publicState(result.game),
        });

        if (result.finished) {
          // send updated stats to both players (if present)
          const players = Object.values(result.game.players).filter(Boolean);
          for (const playerName of players) {
            const stats = await statsRepo.getOrCreate(playerName);
            io.to(result.game.socketsByName[playerName] ?? "").emit(EVENTS.USER_STATS, {
              name: playerName,
              stats,
            });
          }
          broadcastLobby();
        }
      } catch (e) {
        socket.emit(EVENTS.TOAST_ERROR, { message: e.message || "Move failed." });
      }
    });

    socket.on(EVENTS.GAME_LEAVE, async ({ gameId }) => {
      try {
        const name = socket.data.name;
        if (!name) throw new Error("Set your name first.");

        const result = await gameService.leaveGame({ gameId, playerName: name });

        if (result?.game) {
          io.to(gameService.roomName(gameId)).emit(EVENTS.GAME_STATE, {
            game: gameService.publicState(result.game),
          });
        }

        socket.leave(gameService.roomName(gameId));
        broadcastLobby();
      } catch (e) {
        socket.emit(EVENTS.TOAST_ERROR, { message: e.message || "Leave failed." });
      }
    });

    socket.on("disconnect", async () => {
      try {
        const name = socket.data.name;
        if (!name) return;

        // If user was in an active game, treat as leave/forfeit
        const affected = await gameService.handleDisconnect({ socketId: socket.id });

        if (affected?.length) {
          for (const gameId of affected) {
            const game = gameService.getGame(gameId);
            if (game) {
              io.to(gameService.roomName(gameId)).emit(EVENTS.GAME_STATE, {
                game: gameService.publicState(game),
              });
            }
          }
          broadcastLobby();
        }
      } catch {
        // ignore disconnect errors
      }
    });
  });
}
