export const EVENTS = {
  // client -> server
  USER_SET_NAME: "user:set_name",
  LOBBY_SUBSCRIBE: "lobby:subscribe",
  GAME_CREATE: "game:create",
  GAME_JOIN: "game:join",
  GAME_MOVE: "game:move",
  GAME_LEAVE: "game:leave",

  // server -> client
  LOBBY_UPDATE: "lobby:update",
  GAME_STATE: "game:state",
  USER_STATS: "user:stats",
  TOAST_ERROR: "toast:error",
  TOAST_INFO: "toast:info",
};
