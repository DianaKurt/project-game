const socket = io();

const $ = (id) => document.getElementById(id);

const screenName = $("screenName");
const screenLobby = $("screenLobby");
const screenGame = $("screenGame");

const nameInput = $("nameInput");
const btnEnter = $("btnEnter");
const btnLogout = $("btnLogout");
const meBadge = $("meBadge");

const btnCreate = $("btnCreate");
const gamesList = $("gamesList");

const statsBox = $("statsBox");

const gameTitle = $("gameTitle");
const statusLine = $("statusLine");
const boardEl = $("board");
const btnLeave = $("btnLeave");
const gameFooter = $("gameFooter");

const toastEl = $("toast");

const EVENTS = {
  USER_SET_NAME: "user:set_name",
  LOBBY_SUBSCRIBE: "lobby:subscribe",
  GAME_CREATE: "game:create",
  GAME_JOIN: "game:join",
  GAME_MOVE: "game:move",
  GAME_LEAVE: "game:leave",

  LOBBY_UPDATE: "lobby:update",
  GAME_STATE: "game:state",
  USER_STATS: "user:stats",
  TOAST_ERROR: "toast:error",
  TOAST_INFO: "toast:info",
};

const state = {
  name: null,
  stats: null,
  lobbyGames: [],
  game: null,
};

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function setScreen(which) {
  hide(screenName); hide(screenLobby); hide(screenGame);
  show(which);
}

function setMeUI() {
  if (state.name) {
    meBadge.textContent = `@${state.name}`;
    meBadge.classList.remove("hidden");
    btnLogout.classList.remove("hidden");
  } else {
    meBadge.classList.add("hidden");
    btnLogout.classList.add("hidden");
  }
}

function toast(message, kind = "info") {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  toastEl.style.borderColor = kind === "error" ? "rgba(255,107,107,.35)" : "rgba(110,231,255,.35)";
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.add("hidden"), 2200);
}

function renderStats() {
  const s = state.stats || { wins: 0, losses: 0, draws: 0 };
  statsBox.innerHTML = `
    <div class="stat"><div class="muted small">Wins</div><div class="num">${s.wins}</div></div>
    <div class="stat"><div class="muted small">Losses</div><div class="num">${s.losses}</div></div>
    <div class="stat"><div class="muted small">Draws</div><div class="num">${s.draws}</div></div>
  `;
}

function renderLobby() {
  gamesList.innerHTML = "";

  const games = state.lobbyGames || [];
  if (!games.length) {
    gamesList.innerHTML = `<div class="muted">No games yet. Create one 🙂</div>`;
    return;
  }

  for (const g of games) {
    const pillClass = g.status === "waiting" ? "waiting" : "playing";
    const joinDisabled = g.status !== "waiting";

    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div>
        <div class="itemTitle">Game #${g.id}</div>
        <div class="muted small">Host: ${escapeHtml(g.host || "—")}</div>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <span class="pill ${pillClass}">${g.status}</span>
        <button class="btn btn-ghost" ${joinDisabled ? "disabled" : ""}>Join</button>
      </div>
    `;

    const btn = item.querySelector("button");
    btn.addEventListener("click", () => {
      socket.emit(EVENTS.GAME_JOIN, { gameId: g.id });
    });

    gamesList.appendChild(item);
  }
}

function myMark(game) {
  if (!state.name || !game) return null;
  if (game.players?.X === state.name) return "X";
  if (game.players?.O === state.name) return "O";
  return null;
}

function renderBoard(game) {
  boardEl.innerHTML = "";
  const mark = myMark(game);
  const myTurn = game.status === "playing" && mark && game.turn === mark;
  const clickable = myTurn && game.status === "playing" && !game.winner;

  for (let i = 0; i < 9; i++) {
    const v = game.board[i];
    const cell = document.createElement("button");
    cell.className = "cell";
    if (v) cell.classList.add(v);
    if (!clickable || v) cell.classList.add("disabled");
    cell.textContent = v || "";

    cell.addEventListener("click", () => {
      if (!clickable) return;
      if (game.board[i]) return;
      socket.emit(EVENTS.GAME_MOVE, { gameId: game.id, index: i });
    });

    boardEl.appendChild(cell);
  }
}

function renderGame() {
  const game = state.game;
  if (!game) return;

  const x = game.players?.X || "—";
  const o = game.players?.O || "—";

  gameTitle.textContent = `Game #${game.id}`;
  const mark = myMark(game);

  let status = "";
  if (game.status === "waiting") {
    status = `Waiting for opponent… You are X.`;
  } else if (game.status === "playing") {
    const turnName = game.turn === "X" ? x : o;
    const turnText = mark ? (game.turn === mark ? "Your turn." : "Opponent’s turn.") : "Spectating.";
    status = `X: ${x} • O: ${o} • Turn: ${turnName}. ${turnText}`;
  } else if (game.status === "finished") {
    if (game.winner === "draw") status = `Draw.`;
    else if (game.winner === "X") status = `Winner: ${x} (X).`;
    else if (game.winner === "O") status = `Winner: ${o} (O).`;
    else status = "Game finished.";
  }

  statusLine.textContent = status;

  renderBoard(game);

  const hint = game.status === "waiting"
    ? `Share this game id: ${game.id}`
    : `Tip: open another browser to join different games.`;
  gameFooter.textContent = hint;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

// --- UI events ---
btnEnter.addEventListener("click", () => {
  const name = nameInput.value.trim().slice(0, 24);
  if (!name) return toast("Enter a name.", "error");
  localStorage.setItem("tictac:name", name);
  state.name = name;
  setMeUI();
  socket.emit(EVENTS.USER_SET_NAME, { name });
  setScreen(screenLobby);
});

btnLogout.addEventListener("click", () => {
  localStorage.removeItem("tictac:name");
  state.name = null;
  state.stats = null;
  state.game = null;
  state.lobbyGames = [];
  setMeUI();
  nameInput.value = "";
  setScreen(screenName);
});

btnCreate.addEventListener("click", () => {
  socket.emit(EVENTS.GAME_CREATE);
});

btnLeave.addEventListener("click", () => {
  if (!state.game) return;
  socket.emit(EVENTS.GAME_LEAVE, { gameId: state.game.id });

});

// --- Socket handlers ---
socket.on(EVENTS.LOBBY_UPDATE, ({ games }) => {
  state.lobbyGames = games || [];
  renderLobby();
});

socket.on(EVENTS.GAME_STATE, ({ game }) => {
  state.game = game;

  if(!game || game.status === "finished"){
    setScreen(screenLobby);
  } else {
    setScreen(screenGame);
  }
  renderGame();
});

socket.on(EVENTS.USER_STATS, ({ stats }) => {
  state.stats = stats;
  renderStats();
});

socket.on(EVENTS.TOAST_ERROR, ({ message }) => toast(message || "Error", "error"));
socket.on(EVENTS.TOAST_INFO, ({ message }) => toast(message || "Info", "info"));

// --- Boot ---
(function init() {
  const saved = localStorage.getItem("tictac:name");
  if (saved) {
    state.name = saved;
    setMeUI();
    socket.emit(EVENTS.USER_SET_NAME, { name: saved });
    socket.emit(EVENTS.LOBBY_SUBSCRIBE, {});
    setScreen(screenLobby);
  } else {
    setScreen(screenName);
  }
  renderStats();
})();
