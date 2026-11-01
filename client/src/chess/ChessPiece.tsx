import React from 'react';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  size?: number | string;
  className?: string;
  isDragging?: boolean;
}

export const ChessPiece: React.FC<ChessPieceProps> = ({
  type,
  color,
  size = '100%',
  className = '',
  isDragging = false,
}) => {
  const isWhite = color === 'w';
  const prefix = isWhite ? 'w' : 'b';

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none pointer-events-none transition-transform duration-100 ${
        isDragging ? 'chess-piece-dragging' : 'chess-piece-shadow'
      } ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-sm overflow-visible"
      >
        <defs>
          {/* Gradients for White Pieces (Polished Warm Ivory) */}
          <linearGradient id={`${prefix}-ivory-body`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#FAF4E8" />
            <stop offset="75%" stopColor="#DECDB4" />
            <stop offset="100%" stopColor="#BD9E77" />
          </linearGradient>

          <linearGradient id={`${prefix}-ivory-highlight`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
          </linearGradient>

          <radialGradient id={`${prefix}-ivory-specular`} cx="35%" cy="30%" r="45%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#F8EFE2" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D5C0A4" stopOpacity="0" />
          </radialGradient>

          {/* Gradients for Black Pieces (Polished Obsidian Walnut) */}
          <linearGradient id={`${prefix}-ebony-body`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4A4540" />
            <stop offset="30%" stopColor="#2A2623" />
            <stop offset="70%" stopColor="#181513" />
            <stop offset="100%" stopColor="#0B0A09" />
          </linearGradient>

          <linearGradient id={`${prefix}-ebony-highlight`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#736A63" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#4E4742" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#211E1B" stopOpacity="0.05" />
          </linearGradient>

          <radialGradient id={`${prefix}-ebony-specular`} cx="35%" cy="30%" r="45%">
            <stop offset="0%" stopColor="#8A8077" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#3A3430" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#141210" stopOpacity="0" />
          </radialGradient>

          {/* Gold Inlay Trim */}
          <linearGradient id="gold-trim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D9A441" />
            <stop offset="50%" stopColor="#FFE08A" />
            <stop offset="100%" stopColor="#B37D22" />
          </linearGradient>
        </defs>

        {/* Piece Drawings */}
        {type === 'p' && (
          <g>
            {/* Base */}
            <path
              d="M25 84 C25 81 33 80 50 80 C67 80 75 81 75 84 C75 87 67 89 50 89 C33 89 25 87 25 84 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#141210'}
              strokeWidth="1.2"
            />
            {/* Pedestal */}
            <path
              d="M30 81 C32 75 36 73 40 71 C43 69 44 64 43 53 C43 50 44 49 50 49 C56 49 57 50 57 53 C56 64 57 69 60 71 C64 73 68 75 70 81 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#BFA886' : '#171513'}
              strokeWidth="1"
            />
            {/* Collar Ring */}
            <ellipse
              cx="50"
              cy="48"
              rx="12"
              ry="3"
              fill={isWhite ? '#E8D9C0' : '#332E2A'}
              stroke={isWhite ? '#A88D6A' : '#110F0E'}
              strokeWidth="0.8"
            />
            {/* Head Sphere */}
            <circle
              cx="50"
              cy="32"
              r="15"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#0F0E0D'}
              strokeWidth="1.2"
            />
            {/* 3D Specular Highlight */}
            <circle
              cx="45"
              cy="28"
              r="11"
              fill={isWhite ? `url(#${prefix}-ivory-specular)` : `url(#${prefix}-ebony-specular)`}
            />
            {/* Top Peak */}
            <circle
              cx="50"
              cy="16"
              r="2.5"
              fill={isWhite ? '#FFFDF8' : '#6B625B'}
            />
          </g>
        )}

        {type === 'r' && (
          <g>
            {/* Base */}
            <path
              d="M23 85 C23 81 33 80 50 80 C67 80 77 81 77 85 C77 89 67 90 50 90 C33 90 23 89 23 85 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#141210'}
              strokeWidth="1.2"
            />
            {/* Lower Base Step */}
            <path
              d="M27 80 L32 72 L68 72 L73 80 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#BFA886' : '#171513'}
              strokeWidth="1"
            />
            {/* Waist Tower */}
            <path
              d="M34 72 L37 42 L63 42 L66 72 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#BFA886' : '#171513'}
              strokeWidth="1"
            />
            {/* Crenellation Capital */}
            <path
              d="M28 42 L28 24 L35 24 L35 30 L45 30 L45 24 L55 24 L55 30 L65 30 L65 24 L72 24 L72 42 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#110F0E'}
              strokeWidth="1.2"
            />
            {/* Highlight strip */}
            <rect
              x="38"
              y="44"
              width="6"
              height="26"
              rx="3"
              fill={isWhite ? `url(#${prefix}-ivory-highlight)` : `url(#${prefix}-ebony-highlight)`}
            />
          </g>
        )}

        {type === 'n' && (
          <g>
            {/* Base */}
            <path
              d="M23 86 C23 82 33 81 50 81 C67 81 77 82 77 86 C77 90 67 91 50 91 C33 91 23 90 23 86 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#141210'}
              strokeWidth="1.2"
            />
            {/* Knight Body / Stallion Profile */}
            <path
              d="M27 81 C28 73 35 66 38 60 C32 55 27 46 29 38 C30 33 34 26 44 20 C46 17 49 14 53 14 C55 14 57 16 57 19 C61 17 66 18 69 22 C73 27 75 33 71 42 C77 47 75 58 71 66 C73 72 74 77 73 81 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#110F0E'}
              strokeWidth="1.2"
            />
            {/* Snout and Jaw */}
            <path
              d="M29 38 C26 40 23 45 23 49 C24 53 29 55 35 53 C38 52 41 49 42 45 Z"
              fill={isWhite ? '#FDF9F0' : '#332E2A'}
              stroke={isWhite ? '#A88D6A' : '#141210'}
              strokeWidth="1"
            />
            {/* Nostril */}
            <circle cx="28" cy="48" r="1.5" fill={isWhite ? '#8A7050' : '#141210'} />
            {/* Eye */}
            <circle cx="39" cy="35" r="2.5" fill={isWhite ? '#5C4426' : '#FAF7F2'} />
            {/* Mane Tufts */}
            <path
              d="M56 19 C64 22 66 31 63 36 M67 29 C72 35 71 43 68 49 M69 46 C73 53 71 61 68 67"
              stroke={isWhite ? '#BD9E77' : '#5E544C'}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {/* Muscle highlight */}
            <path
              d="M44 38 C48 46 47 57 41 68"
              stroke={isWhite ? 'rgba(255,255,255,0.7)' : 'rgba(150,140,130,0.35)'}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        )}

        {type === 'b' && (
          <g>
            {/* Base */}
            <path
              d="M24 85 C24 81 33 80 50 80 C67 80 76 81 76 85 C76 89 67 90 50 90 C33 90 24 89 24 85 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#141210'}
              strokeWidth="1.2"
            />
            {/* Pedestal */}
            <path
              d="M31 80 C34 72 38 68 41 62 L59 62 C62 68 66 72 69 80 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#BFA886' : '#171513'}
              strokeWidth="1"
            />
            {/* Ring */}
            <ellipse
              cx="50"
              cy="60"
              rx="13"
              ry="3"
              fill={isWhite ? '#E8D9C0' : '#332E2A'}
              stroke={isWhite ? '#A88D6A' : '#110F0E'}
              strokeWidth="0.8"
            />
            {/* Mitre (Head) */}
            <path
              d="M34 58 C32 46 36 34 50 20 C64 34 68 46 66 58 C63 61 37 61 34 58 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#110F0E'}
              strokeWidth="1.2"
            />
            {/* Mitre Slash Cutout */}
            <path
              d="M44 32 L58 42 M46 29 L60 39"
              stroke={isWhite ? '#876948' : '#0B0A09'}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Small Top Cross/Orb */}
            <circle
              cx="50"
              cy="17"
              r="4"
              fill={isWhite ? '#FFFDF8' : `url(#gold-trim)`}
              stroke={isWhite ? '#A88D6A' : '#D9A441'}
              strokeWidth="0.8"
            />
            {/* Specular */}
            <ellipse
              cx="45"
              cy="44"
              rx="4"
              ry="10"
              fill={isWhite ? `url(#${prefix}-ivory-specular)` : `url(#${prefix}-ebony-specular)`}
            />
          </g>
        )}

        {type === 'q' && (
          <g>
            {/* Base */}
            <path
              d="M22 86 C22 82 32 81 50 81 C68 81 78 82 78 86 C78 90 68 91 50 91 C32 91 22 90 22 86 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#141210'}
              strokeWidth="1.2"
            />
            {/* Lower Stem */}
            <path
              d="M30 81 C33 73 37 68 41 58 L59 58 C63 68 67 73 70 81 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#BFA886' : '#171513'}
              strokeWidth="1"
            />
            {/* Waist Ring with Gold Accent */}
            <ellipse
              cx="50"
              cy="57"
              rx="15"
              ry="3.5"
              fill="url(#gold-trim)"
              stroke={isWhite ? '#B37D22' : '#8A5D12'}
              strokeWidth="0.8"
            />
            {/* Flared Coronet */}
            <path
              d="M35 56 L24 28 L37 36 L50 24 L63 36 L76 28 L65 56 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#110F0E'}
              strokeWidth="1.2"
            />
            {/* Crown Jewel Pearls */}
            <circle cx="24" cy="27" r="3" fill="url(#gold-trim)" />
            <circle cx="37" cy="35" r="3" fill="url(#gold-trim)" />
            <circle cx="50" cy="23" r="3.5" fill="url(#gold-trim)" />
            <circle cx="63" cy="35" r="3" fill="url(#gold-trim)" />
            <circle cx="76" cy="27" r="3" fill="url(#gold-trim)" />
            {/* Body Highlight */}
            <path
              d="M48 60 L48 76"
              stroke={isWhite ? 'rgba(255,255,255,0.7)' : 'rgba(150,140,130,0.35)'}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        )}

        {type === 'k' && (
          <g>
            {/* Base */}
            <path
              d="M22 86 C22 82 32 81 50 81 C68 81 78 82 78 86 C78 90 68 91 50 91 C32 91 22 90 22 86 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#141210'}
              strokeWidth="1.2"
            />
            {/* Lower Stem */}
            <path
              d="M30 81 C33 72 38 66 41 56 L59 56 C62 66 67 72 70 81 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#BFA886' : '#171513'}
              strokeWidth="1"
            />
            {/* Collar Trim */}
            <ellipse
              cx="50"
              cy="55"
              rx="15"
              ry="3.5"
              fill="url(#gold-trim)"
              stroke={isWhite ? '#B37D22' : '#8A5D12'}
              strokeWidth="0.8"
            />
            {/* Crown Helmet */}
            <path
              d="M33 54 C31 42 34 33 50 30 C66 33 69 42 67 54 Z"
              fill={isWhite ? `url(#${prefix}-ivory-body)` : `url(#${prefix}-ebony-body)`}
              stroke={isWhite ? '#A88D6A' : '#110F0E'}
              strokeWidth="1.2"
            />
            {/* Imperial Crest Arches */}
            <path
              d="M35 44 C42 41 58 41 65 44"
              stroke={isWhite ? '#BFA886' : '#473F38'}
              strokeWidth="1.5"
              fill="none"
            />
            {/* Regal Cross Finial */}
            <g transform="translate(50, 20)">
              {/* Vertical Crossbar */}
              <rect
                x="-2"
                y="-9"
                width="4"
                height="12"
                rx="1"
                fill="url(#gold-trim)"
                stroke={isWhite ? '#A88D6A' : '#1A1816'}
                strokeWidth="0.6"
              />
              {/* Horizontal Crossbar */}
              <rect
                x="-6"
                y="-6"
                width="12"
                height="3.6"
                rx="1"
                fill="url(#gold-trim)"
                stroke={isWhite ? '#A88D6A' : '#1A1816'}
                strokeWidth="0.6"
              />
              {/* Central Diamond/Jewel */}
              <circle cx="0" cy="-4" r="1.5" fill="#FFFFFF" />
            </g>
            {/* 3D Curved Specular */}
            <ellipse
              cx="45"
              cy="43"
              rx="5"
              ry="7"
              fill={isWhite ? `url(#${prefix}-ivory-specular)` : `url(#${prefix}-ebony-specular)`}
            />
          </g>
        )}
      </svg>
    </div>
  );
};

