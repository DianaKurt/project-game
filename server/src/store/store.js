export function createGameStore() {
  const games = new Map(); // gameId -> game

  return {
    get(id) {
      return games.get(id);
    },
    set(id, game) {
      games.set(id, game);
    },
    delete(id) {
      games.delete(id);
    },
    list() {
      return Array.from(games.values());
    },
  };
}
