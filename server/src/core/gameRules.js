const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    const v = board[a];
    if (v && v === board[b] && v === board[c]) return v; // "X" or "O"
  }
  return null;
}

export function isDraw(board) {
  return board.every((c) => c === "X" || c === "O");
}

export function validateMove({ game, playerMark, index }) {
  if (!game) throw new Error("Game not found.");
  if (game.status !== "playing") throw new Error("Game is not in progress.");
  if (game.turn !== playerMark) throw new Error("Not your turn.");
  if (!Number.isInteger(index) || index < 0 || index > 8) throw new Error("Invalid cell.");
  if (game.board[index]) throw new Error("Cell is already taken.");
}
