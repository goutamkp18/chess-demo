import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { ChessPiece } from '../chess/ChessPiece';
import type { PieceType, PieceColor } from '../chess/ChessPiece';
import { PromotionModal } from './PromotionModal';
import { soundManager } from '../utils/sound';

interface ChessboardProps {
  fen: string;
  orientation: 'w' | 'b';
  myColor: 'w' | 'b';
  interactive: boolean;
  lastMove: { from: string; to: string } | null;
  onMove: (move: { from: string; to: string; promotion?: string }) => void;
}

interface PendingMove {
  from: string;
  to: string;
}

export const Chessboard: React.FC<ChessboardProps> = ({
  fen,
  orientation,
  myColor,
  interactive,
  lastMove,
  onMove,
}) => {
  const [chessInstance, setChessInstance] = useState<Chess>(() => new Chess(fen));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<{ to: Square; captured: boolean }[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<PendingMove | null>(null);
  const [draggingSquare, setDraggingSquare] = useState<Square | null>(null);

  // Sync internal chess validation with incoming fen
  useEffect(() => {
    try {
      const c = new Chess(fen);
      setChessInstance(c);
      setSelectedSquare(null);
      setLegalMoves([]);
    } catch (e) {
      console.error('Invalid FEN passed to board:', e);
    }
  }, [fen]);

  // Determine ranks and files according to orientation
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = orientation === 'w' ? files : [...files].reverse();
  const displayRanks = orientation === 'w' ? ranks : [...ranks].reverse();

  // Find King square if in check
  const inCheckSquare: Square | null = React.useMemo(() => {
    if (!chessInstance.inCheck()) return null;
    const turn = chessInstance.turn();
    const board = chessInstance.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const file = files[c];
          const rank = ranks[r];
          return `${file}${rank}` as Square;
        }
      }
    }
    return null;
  }, [chessInstance, fen]);

  // Compute legal moves for clicked square
  const handleSquareClick = (square: Square) => {
    if (!interactive) return;

    const piece = chessInstance.get(square);
    const isCurrentTurn = chessInstance.turn() === myColor;

    // If already selected, check if clicking a destination square
    if (selectedSquare) {
      if (selectedSquare === square) {
        // Deselect
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      const isLegal = legalMoves.some((m) => m.to === square);
      if (isLegal) {
        executeMove(selectedSquare, square);
        return;
      }
    }

    // Selecting a new square
    if (piece && piece.color === myColor && isCurrentTurn) {
      setSelectedSquare(square);
      soundManager.playClick();

      // Query legal moves from chess.js
      const moves = chessInstance.moves({ square, verbose: true });
      setLegalMoves(
        moves.map((m) => ({
          to: m.to as Square,
          captured: !!m.captured,
        }))
      );
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const executeMove = (from: Square, to: Square) => {
    const piece = chessInstance.get(from);
    if (!piece) return;

    // Check for Pawn Promotion (rank 8 for white, rank 1 for black)
    const isPromotion =
      piece.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPromotion) {
      setPendingPromotion({ from, to });
      return;
    }

    // Play local audio feedback immediately
    const targetPiece = chessInstance.get(to);
    if (targetPiece) {
      soundManager.playCapture();
    } else if (piece.type === 'k' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2) {
      soundManager.playCastle();
    } else {
      soundManager.playMove();
    }

    setSelectedSquare(null);
    setLegalMoves([]);
    onMove({ from, to });
  };

  const handlePromotionSelect = (promotedPiece: PieceType) => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);

    soundManager.playMove();
    setSelectedSquare(null);
    setLegalMoves([]);
    onMove({ from, to, promotion: promotedPiece });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, square: Square) => {
    if (!interactive) {
      e.preventDefault();
      return;
    }
    const piece = chessInstance.get(square);
    if (!piece || piece.color !== myColor || chessInstance.turn() !== myColor) {
      e.preventDefault();
      return;
    }

    setDraggingSquare(square);
    setSelectedSquare(square);
    const moves = chessInstance.moves({ square, verbose: true });
    setLegalMoves(
      moves.map((m) => ({
        to: m.to as Square,
        captured: !!m.captured,
      }))
    );

    // Set drag ghost image / data
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSquare: Square) => {
    e.preventDefault();
    const fromSquare = (e.dataTransfer.getData('text/plain') || draggingSquare) as Square;
    setDraggingSquare(null);

    if (fromSquare && fromSquare !== targetSquare) {
      const isLegal = legalMoves.some((m) => m.to === targetSquare);
      if (isLegal) {
        executeMove(fromSquare, targetSquare);
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Outer Luxury Wooden Frame with Inlay and Corner Brackets */}
      <div className="wood-board-bevel rounded-xl p-3 md:p-4 shadow-2xl relative">
        {/* Corner Metallic Gold Screws/Accents */}
        <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-[#D9A441] border border-[#F5C66A]/80 shadow-xs pointer-events-none" />
        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D9A441] border border-[#F5C66A]/80 shadow-xs pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full bg-[#D9A441] border border-[#F5C66A]/80 shadow-xs pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D9A441] border border-[#F5C66A]/80 shadow-xs pointer-events-none" />

        {/* Top File Coordinates */}
        <div className="grid grid-cols-8 h-4 mb-1 text-center font-['Cinzel'] text-[10px] sm:text-xs font-semibold text-[#D9A441]/85">
          {displayFiles.map((file) => (
            <div key={`top-${file}`} className="flex items-center justify-center">
              {file}
            </div>
          ))}
        </div>

        {/* Board Center with Left/Right Rank Coordinates */}
        <div className="flex items-center">
          {/* Left Rank Coordinates */}
          <div className="flex flex-col justify-between w-4 mr-1 text-center font-['Cinzel'] text-[10px] sm:text-xs font-semibold text-[#D9A441]/85 h-[min(80vw,500px)]">
            {displayRanks.map((rank) => (
              <div key={`left-${rank}`} className="flex-1 flex items-center justify-center">
                {rank}
              </div>
            ))}
          </div>

          {/* 8x8 Playable Chessboard Grid */}
          <div className="grid grid-cols-8 grid-rows-8 w-[min(80vw,500px)] h-[min(80vw,500px)] border border-[#1A0E08] rounded shadow-inner overflow-hidden">
            {displayRanks.map((rank, rankIdx) =>
              displayFiles.map((file, fileIdx) => {
                const square = `${file}${rank}` as Square;
                const isLight = (fileIdx + rankIdx) % 2 === 0;
                const piece = chessInstance.get(square);
                const isSelected = selectedSquare === square;
                const isLastMove = lastMove?.from === square || lastMove?.to === square;
                const isInCheck = inCheckSquare === square;
                const legalMove = legalMoves.find((m) => m.to === square);

                return (
                  <div
                    key={square}
                    onClick={() => handleSquareClick(square)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, square)}
                    className={`relative flex items-center justify-center cursor-pointer transition-colors duration-100 ${
                      isLight ? 'wood-square-light' : 'wood-square-dark'
                    } ${isSelected ? 'square-selected' : ''} ${
                      isLastMove ? 'square-last-move' : ''
                    } ${isInCheck ? 'square-in-check' : ''}`}
                  >
                    {/* Legal Move Indicators */}
                    {legalMove && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                        {legalMove.captured ? (
                          // Circular ring for capture
                          <div className="w-[85%] h-[85%] rounded-full border-4 border-[#F5C66A]/80 animate-pulse" />
                        ) : (
                          // Solid dot for empty square
                          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#D9A441]/90 shadow-sm shadow-black" />
                        )}
                      </div>
                    )}

                    {/* Chess Piece with 3D Rendering & Drag Support */}
                    {piece && (
                      <div
                        draggable={interactive && piece.color === myColor && chessInstance.turn() === myColor}
                        onDragStart={(e) => handleDragStart(e, square)}
                        className="w-[88%] h-[88%] flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
                      >
                        <ChessPiece
                          type={piece.type as PieceType}
                          color={piece.color as PieceColor}
                          isDragging={draggingSquare === square}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Rank Coordinates */}
          <div className="flex flex-col justify-between w-4 ml-1 text-center font-['Cinzel'] text-[10px] sm:text-xs font-semibold text-[#D9A441]/85 h-[min(80vw,500px)]">
            {displayRanks.map((rank) => (
              <div key={`right-${rank}`} className="flex-1 flex items-center justify-center">
                {rank}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom File Coordinates */}
        <div className="grid grid-cols-8 h-4 mt-1 text-center font-['Cinzel'] text-[10px] sm:text-xs font-semibold text-[#D9A441]/85">
          {displayFiles.map((file) => (
            <div key={`bot-${file}`} className="flex items-center justify-center">
              {file}
            </div>
          ))}
        </div>
      </div>

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <PromotionModal
          color={myColor}
          onSelect={handlePromotionSelect}
          onCancel={() => {
            setPendingPromotion(null);
            setSelectedSquare(null);
            setLegalMoves([]);
          }}
        />
      )}
    </div>
  );
};
