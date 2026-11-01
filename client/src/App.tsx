import { useState, useEffect } from 'react';
import { socketService } from './services/socket';
import { SOCKET_EVENTS } from './types/index';
import type { RoomState, PlayerProfile, PlayerColor, TimeControl } from './types/index';
import { MatchEntry } from './components/MatchEntry';
import { WaitingScreen } from './components/WaitingScreen';
import { ReadyConfirmation } from './components/ReadyConfirmation';
import { WalkoverScreen } from './components/WalkoverScreen';
import { GameScreen } from './components/GameScreen';
import { soundManager } from './utils/sound';

export function App() {
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [myColor, setMyColor] = useState<PlayerColor>('w');
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  // Setup real-time socket listeners
  useEffect(() => {
    const socket = socketService.getSocket();

    const handleRoomUpdated = (payload: { roomState: RoomState }) => {
      setRoomState(payload.roomState);
    };

    const handleOpponentJoined = () => {
      soundManager.playClick();
    };

    const handleMatchStarted = (payload: { fen: string; clocks: any; timeControl: any }) => {
      soundManager.playClick();
      setRoomState((prev) => (prev ? { ...prev, status: 'IN_PROGRESS', fen: payload.fen, clocks: payload.clocks } : prev));
    };

    const handleMoveMade = (payload: any) => {
      setRoomState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          fen: payload.fen,
          turn: payload.turn,
          clocks: payload.clocks,
          history: [...prev.history, payload.move],
          lastMove: { from: payload.move.from, to: payload.move.to, san: payload.move.san },
          capturedWhite: payload.capturedWhite,
          capturedBlack: payload.capturedBlack,
        };
      });
    };

    const handleMatchOver = (payload: { result: any }) => {
      setRoomState((prev) => (prev ? { ...prev, status: 'COMPLETED', result: payload.result } : prev));
    };

    socket.on(SOCKET_EVENTS.ROOM_UPDATED, handleRoomUpdated);
    socket.on(SOCKET_EVENTS.OPPONENT_JOINED, handleOpponentJoined);
    socket.on(SOCKET_EVENTS.MATCH_STARTED, handleMatchStarted);
    socket.on(SOCKET_EVENTS.MOVE_MADE, handleMoveMade);
    socket.on(SOCKET_EVENTS.MATCH_OVER, handleMatchOver);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_UPDATED, handleRoomUpdated);
      socket.off(SOCKET_EVENTS.OPPONENT_JOINED, handleOpponentJoined);
      socket.off(SOCKET_EVENTS.MATCH_STARTED, handleMatchStarted);
      socket.off(SOCKET_EVENTS.MOVE_MADE, handleMoveMade);
      socket.off(SOCKET_EVENTS.MATCH_OVER, handleMatchOver);
    };
  }, []);

  const handleJoin = async (params: {
    roomId: string;
    password: string;
    playerName: string;
    rating: number;
    timeControl: TimeControl;
  }): Promise<{ success: boolean; error?: string }> => {
    const res = await socketService.joinRoom({
      roomId: params.roomId,
      password: params.password,
      playerName: params.playerName,
      rating: params.rating,
    });

    if (res.success && res.data) {
      setRoomId(params.roomId);
      setPlayerName(params.playerName);
      setPlayerId(res.data.playerId);
      setMyColor(res.data.playerColor);
      setRoomState(res.data.roomState);
      setInRoom(true);
      return { success: true };
    }

    return { success: false, error: res.error || 'Failed to connect.' };
  };

  const handleConfirmReady = () => {
    if (roomId && playerId) {
      socketService.setReady(roomId, playerId);
    }
  };

  const handleMakeMove = async (move: { from: string; to: string; promotion?: string }) => {
    if (!roomId || !playerId) return;
    const res = await socketService.makeMove(roomId, playerId, move);
    if (!res.success) {
      console.warn('Move rejected by server:', res.error);
    }
  };

  const handleOfferDraw = () => {
    if (roomId && playerId) {
      socketService.offerDraw(roomId, playerId);
    }
  };

  const handleRespondDraw = (accept: boolean) => {
    if (roomId && playerId) {
      socketService.respondDraw(roomId, playerId, accept);
    }
  };

  const handleResign = () => {
    if (roomId && playerId) {
      socketService.resign(roomId, playerId);
    }
  };

  const handleExit = () => {
    socketService.disconnect();
    setInRoom(false);
    setRoomState(null);
    setRoomId('');
    setPlayerId('');
  };

  // 1. Initial State: Match Entry Screen (NO LANDING PAGE)
  if (!inRoom || !roomState) {
    return <MatchEntry onJoin={handleJoin} />;
  }

  // 2. Waiting for Opponent: 60-Second Countdown
  if (roomState.status === 'WAITING_FOR_OPPONENT') {
    const myProfile: PlayerProfile =
      (myColor === 'w' ? roomState.whitePlayer : roomState.blackPlayer) || {
        id: playerId,
        name: playerName,
        rating: 1600,
        connected: true,
        joinedAt: Date.now(),
      };

    return (
      <WaitingScreen
        roomId={roomId}
        player={myProfile}
        waitingDeadline={roomState.waitingDeadline}
        timeControl={roomState.timeControl}
        onCancel={handleExit}
      />
    );
  }

  // 3. Walkover Screen
  if (roomState.status === 'WALKOVER') {
    return (
      <WalkoverScreen
        roomId={roomId}
        playerName={playerName}
        onReturnToEntry={handleExit}
      />
    );
  }

  // 4. Opponent Connected: Ready Confirmation Screen
  if (roomState.status === 'READY_CONFIRMATION') {
    return (
      <ReadyConfirmation
        roomId={roomId}
        whitePlayer={roomState.whitePlayer}
        blackPlayer={roomState.blackPlayer}
        myId={playerId}
        myColor={myColor}
        timeControl={roomState.timeControl}
        onConfirmReady={handleConfirmReady}
      />
    );
  }

  // 5. In-Game & Result Screens
  return (
    <GameScreen
      roomState={roomState}
      myId={playerId}
      myColor={myColor}
      onMove={handleMakeMove}
      onOfferDraw={handleOfferDraw}
      onRespondDraw={handleRespondDraw}
      onResign={handleResign}
      onExit={handleExit}
    />
  );
}

export default App;
