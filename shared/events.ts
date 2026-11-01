export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  SET_READY: 'player:set_ready',
  MAKE_MOVE: 'game:move',
  OFFER_DRAW: 'game:offer_draw',
  RESPOND_DRAW: 'game:respond_draw',
  RESIGN: 'game:resign',
  SYNC_REQUEST: 'game:sync_request',

  // Server -> Client
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',
  ROOM_UPDATED: 'room:updated',
  WAITING_TICK: 'room:waiting_tick',
  OPPONENT_JOINED: 'room:opponent_joined',
  OPPONENT_DISCONNECTED: 'room:opponent_disconnected',
  OPPONENT_RECONNECTED: 'room:opponent_reconnected',
  PLAYER_READY_STATUS: 'player:ready_status',
  MATCH_STARTED: 'match:started',
  MOVE_MADE: 'game:move_made',
  CLOCK_SYNC: 'game:clock_sync',
  DRAW_OFFERED: 'game:draw_offered',
  DRAW_RESOLVED: 'game:draw_resolved',
  MATCH_OVER: 'match:over',
  ERROR: 'system:error',
} as const;

