import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import { registerHandlers } from "./socket/register.js";
import { createGameStore } from "./store/store.js";
import { createLobbyService } from "./core/lobby.js";
import { createGameService } from "./core/gameService.js";
import { JsonStatsRepository } from "./repo/json.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 4000;

//Static client 
const clientDir = path.join(__dirname, "..", "..", "client");
app.use(express.static(clientDir));
app.get("/health", (_, res) => res.json({ ok: true }));

//Core singletons
const gameStore = createGameStore();
const statsRepo = new JsonStatsRepository({
  filePath: path.join(__dirname, "..", "data", "stats.json"),
});

await statsRepo.init();

const lobbyService = createLobbyService({ gameStore });
const gameService = createGameService({ gameStore, statsRepo });

//Socket handlers
registerHandlers(io, { lobbyService, gameService, statsRepo });

//Start
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
