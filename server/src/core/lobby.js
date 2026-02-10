export function createLobbyService({ gameStore }) {
  return {
    listLobbyGames() {
      const games = gameStore.list();
      return games
        .map((g) => ({
          id: g.id,
          host: g.players.X,
          status: g.status,
          createdAt: g.createdAt,
        }))
        .filter((g) => g.status === "waiting" || g.status === "playing")
        .sort((a, b) => b.createdAt - a.createdAt);
    },
  };
}
