import React from 'react';
import { ChessPiece } from '../chess/ChessPiece';
import type { PieceType, PieceColor } from '../chess/ChessPiece';

interface PromotionModalProps {
  color: PieceColor;
  onSelect: (piece: PieceType) => void;
  onCancel: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ color, onSelect, onCancel }) => {
  const pieces: { type: PieceType; name: string }[] = [
    { type: 'q', name: 'Queen' },
    { type: 'r', name: 'Rook' },
    { type: 'b', name: 'Bishop' },
    { type: 'n', name: 'Knight' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="luxury-card-gold p-6 rounded-2xl max-w-sm w-full mx-4 border border-[#D9A441]/40 bg-[#1D1915] text-center shadow-2xl">
        <h3 className="font-['Cinzel'] text-xl font-bold text-[#F5C66A] tracking-wider mb-2">
          Promote Pawn
        </h3>
        <p className="text-xs text-[#9E9689] mb-6">
          Choose a prestigious piece to promote your pawn.
        </p>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {pieces.map(({ type, name }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#2A231C] border border-[#D9A441]/20 hover:border-[#F5C66A] hover:bg-[#382F26] hover:scale-105 active:scale-95 transition-all duration-150 group cursor-pointer"
            >
              <div className="w-12 h-12 mb-1 flex items-center justify-center">
                <ChessPiece type={type} color={color} size={44} />
              </div>
              <span className="text-[11px] font-medium text-[#FAF7F2] group-hover:text-[#F5C66A]">
                {name}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-[#9E9689] hover:text-[#FAF7F2] transition-colors py-1 cursor-pointer"
        >
          Cancel Move
        </button>
      </div>
    </div>
  );
};
