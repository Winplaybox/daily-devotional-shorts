import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export type SpiritualTheme =
  | 'krishna'
  | 'shiva'
  | 'devi'
  | 'ganesh'
  | 'temple'
  | 'islam'
  | 'sikh'
  | 'christian'
  | 'jain';

interface SacredVectorBackgroundProps {
  theme?: string;
  bgImageUrl?: string;
}

// ----------------- Theme Color Palettes -----------------
const THEME_STYLES: Record<
  string,
  {
    bgGradient: string;
    mandalaColor: string;
    haloColor: string;
    particleColor: string;
    accentColor: string;
  }
> = {
  krishna: {
    bgGradient: 'radial-gradient(circle at 50% 32%, #1a2a6c 0%, #0d1333 50%, #050714 100%)',
    mandalaColor: '#ffd166',
    haloColor: 'rgba(255, 209, 102, 0.28)',
    particleColor: '#ffe8a3',
    accentColor: '#38bdf8',
  },
  shiva: {
    bgGradient: 'radial-gradient(circle at 50% 32%, #1e1b4b 0%, #0f172a 50%, #020617 100%)',
    mandalaColor: '#93c5fd',
    haloColor: 'rgba(147, 197, 253, 0.25)',
    particleColor: '#e0f2fe',
    accentColor: '#f59e0b',
  },
  devi: {
    bgGradient: 'radial-gradient(circle at 50% 32%, #7f1d1d 0%, #450a0a 50%, #1c0303 100%)',
    mandalaColor: '#fbbf24',
    haloColor: 'rgba(251, 191, 36, 0.32)',
    particleColor: '#fde68a',
    accentColor: '#ef4444',
  },
  ganesh: {
    bgGradient: 'radial-gradient(circle at 50% 32%, #831843 0%, #4c0519 50%, #1f020a 100%)',
    mandalaColor: '#f59e0b',
    haloColor: 'rgba(245, 158, 11, 0.30)',
    particleColor: '#fef08a',
    accentColor: '#fb7185',
  },
  temple: {
    bgGradient: 'radial-gradient(circle at 50% 32%, #78350f 0%, #361706 50%, #120601 100%)',
    mandalaColor: '#fbbf24',
    haloColor: 'rgba(251, 191, 36, 0.30)',
    particleColor: '#fef3c7',
    accentColor: '#ea580c',
  },
  islam: {
    bgGradient: 'radial-gradient(circle at 50% 32%, #064e3b 0%, #022c22 50%, #01140e 100%)',
    mandalaColor: '#34d399',
    haloColor: 'rgba(52, 211, 153, 0.28)',
    particleColor: '#a7f3d0',
    accentColor: '#facc15',
  },
  sikh: {
    bgGradient: 'radial-gradient(circle at 50% 32%, #1e3a8a 0%, #0f172a 50%, #030712 100%)',
    mandalaColor: '#f59e0b',
    haloColor: 'rgba(245, 158, 11, 0.30)',
    particleColor: '#fde68a',
    accentColor: '#3b82f6',
  },
  christian: {
    bgGradient: 'radial-gradient(circle at 50% 32%, #172554 0%, #0f172a 50%, #020617 100%)',
    mandalaColor: '#e2e8f0',
    haloColor: 'rgba(226, 232, 240, 0.25)',
    particleColor: '#ffffff',
    accentColor: '#f59e0b',
  },
  jain: {
    bgGradient: 'radial-gradient(circle at 50% 32%, #451a03 0%, #1c0c02 50%, #080300 100%)',
    mandalaColor: '#fbbf24',
    haloColor: 'rgba(251, 191, 36, 0.28)',
    particleColor: '#fef08a',
    accentColor: '#ffffff',
  },
};

// ----------------- Deterministic Particles -----------------
const PARTICLES = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  x: (i * 3.125 * 73) % 100, // horizontal spread 0-100%
  baseSpeed: 0.8 + ((i * 37) % 10) * 0.12,
  size: 3 + ((i * 17) % 6),
  phase: ((i * 13) % 30) / 30,
}));

export const SacredVectorBackground: React.FC<SacredVectorBackgroundProps> = ({
  theme = 'temple',
  bgImageUrl,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const currentTheme = THEME_STYLES[theme] || THEME_STYLES.temple;

  // Gentle rotating mandala motion
  const rotation = (frame * 0.35) % 360;
  // Pulsing halo aura
  const haloPulse = 1 + Math.sin((frame / 18) * Math.PI) * 0.08;

  // Diya flame flicker
  const flameSway = Math.sin(frame * 0.28) * 3 + Math.cos(frame * 0.45) * 2;
  const flameScaleY = 1 + Math.sin(frame * 0.35) * 0.08;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#050406' }}>
      {/* Optional underlying photo texture at subtle 15% opacity if supplied */}
      {bgImageUrl && (
        <AbsoluteFill style={{ opacity: 0.15, mixBlendMode: 'luminosity' }}>
          <img
            src={bgImageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </AbsoluteFill>
      )}

      {/* Layer 1: Divine Cosmic Radial Gradient */}
      <AbsoluteFill style={{ background: currentTheme.bgGradient }} />

      {/* Layer 2: Pulsing Radiant Halo behind Central Deity Motif */}
      <div
        style={{
          position: 'absolute',
          top: '260px',
          left: '50%',
          width: '560px',
          height: '560px',
          marginLeft: '-280px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${currentTheme.haloColor} 0%, rgba(0,0,0,0) 70%)`,
          transform: `scale(${haloPulse})`,
          pointerEvents: 'none',
        }}
      />

      {/* Layer 3: Rotating Sacred Mandala (Vector Geometry) */}
      <svg
        style={{
          position: 'absolute',
          top: '190px',
          left: '50%',
          width: '700px',
          height: '700px',
          marginLeft: '-350px',
          opacity: 0.22,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          pointerEvents: 'none',
        }}
        viewBox="0 0 400 400"
      >
        <circle
          cx="200"
          cy="200"
          r="185"
          fill="none"
          stroke={currentTheme.mandalaColor}
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
        <circle
          cx="200"
          cy="200"
          r="160"
          fill="none"
          stroke={currentTheme.mandalaColor}
          strokeWidth="1"
        />
        <circle
          cx="200"
          cy="200"
          r="120"
          fill="none"
          stroke={currentTheme.mandalaColor}
          strokeWidth="1.5"
          strokeDasharray="2 4"
        />
        <circle
          cx="200"
          cy="200"
          r="75"
          fill="none"
          stroke={currentTheme.mandalaColor}
          strokeWidth="1"
        />
        {/* 16 Radial Rays */}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i * 360) / 16;
          return (
            <line
              key={i}
              x1="200"
              y1="40"
              x2="200"
              y2="120"
              stroke={currentTheme.mandalaColor}
              strokeWidth="1.5"
              transform={`rotate(${angle} 200 200)`}
            />
          );
        })}
        {/* 12 Floral Petal Nodes */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12;
          return (
            <circle
              key={`c-${i}`}
              cx="200"
              cy="75"
              r="7"
              fill="none"
              stroke={currentTheme.mandalaColor}
              strokeWidth="1.5"
              transform={`rotate(${angle} 200 200)`}
            />
          );
        })}
      </svg>

      {/* Layer 4: Central Sacred Deity Motif (Clean 2D Vector) */}
      <div
        style={{
          position: 'absolute',
          top: '310px',
          left: '50%',
          width: '320px',
          height: '320px',
          marginLeft: '-160px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <ThemeVectorMotif
          theme={theme}
          color={currentTheme.mandalaColor}
          accent={currentTheme.accentColor}
          flameSway={flameSway}
          flameScaleY={flameScaleY}
        />
      </div>

      {/* Layer 5: Rising Golden Sparkles & Floating Aarti Embers */}
      {PARTICLES.map((p) => {
        const totalProgress = (frame / durationInFrames + p.phase) % 1;
        const yPos = interpolate(totalProgress, [0, 1], [1920, -50]);
        const xOffset = Math.sin((frame / 20) + p.id) * 20;
        const opacity = interpolate(
          totalProgress,
          [0, 0.2, 0.8, 1],
          [0, 0.75, 0.75, 0]
        );

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${yPos}px`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              backgroundColor: currentTheme.particleColor,
              boxShadow: `0 0 10px ${currentTheme.mandalaColor}, 0 0 20px rgba(255, 215, 0, 0.8)`,
              opacity,
              transform: `translateX(${xOffset}px)`,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Layer 6: Subtle Deep Vignette Mask for High Text Contrast */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.1) 40%, rgba(3,2,5,0.78) 85%, rgba(0,0,0,0.95) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

// ----------------- Individual Theme Vector Motifs -----------------
const ThemeVectorMotif: React.FC<{
  theme: string;
  color: string;
  accent: string;
  flameSway: number;
  flameScaleY: number;
}> = ({ theme, color, accent, flameSway, flameScaleY }) => {
  switch (theme) {
    case 'krishna':
      // Sacred Bansuri (Flute) + Mor Pankh (Peacock Feather)
      return (
        <svg viewBox="0 0 200 200" width="240" height="240">
          <defs>
            <radialGradient id="peacockEye" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="45%" stopColor="#0284c7" />
              <stop offset="85%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#fbbf24" />
            </radialGradient>
          </defs>
          {/* Peacock Feather Outer Plume */}
          <ellipse
            cx="100"
            cy="70"
            rx="36"
            ry="48"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            transform="rotate(-15 100 70)"
          />
          <ellipse
            cx="100"
            cy="70"
            rx="24"
            ry="34"
            fill="url(#peacockEye)"
            opacity="0.9"
            transform="rotate(-15 100 70)"
          />
          <circle cx="102" cy="72" r="10" fill="#0369a1" />
          <circle cx="103" cy="73" r="5" fill="#facc15" />
          {/* Golden Flute (Bansuri) */}
          <line
            x1="30"
            y1="150"
            x2="175"
            y2="110"
            stroke="#fbbf24"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Flute Holes */}
          {[60, 80, 100, 120, 140].map((x, idx) => {
            const y = 150 - (idx + 1) * 7.5;
            return <circle key={idx} cx={x} cy={y} r="3" fill="#1e1b4b" />;
          })}
        </svg>
      );

    case 'shiva':
      // Sacred Trishul + Crescent Moon (Chandra) + Damru
      return (
        <svg viewBox="0 0 200 200" width="240" height="240">
          {/* Crescent Moon */}
          <path
            d="M 65 55 A 28 28 0 0 0 100 85 A 36 36 0 0 1 65 55"
            fill="#e0f2fe"
            opacity="0.95"
          />
          {/* Trishul Central Spear */}
          <line x1="100" y1="20" x2="100" y2="185" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
          <polygon points="100,12 88,40 112,40" fill="#fbbf24" />
          {/* Trishul Prongs (Left & Right Curves) */}
          <path
            d="M 55 60 Q 55 105 100 105 Q 145 105 145 60"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <polygon points="55,50 46,70 64,70" fill="#fbbf24" />
          <polygon points="145,50 136,70 154,70" fill="#fbbf24" />
          {/* Damru in Center */}
          <polygon points="85,120 115,120 85,145 115,145" fill="#f59e0b" stroke="#fbbf24" strokeWidth="2" />
        </svg>
      );

    case 'ganesh':
      // Modern Sacred Ganesha / Om Silhouette
      return (
        <svg viewBox="0 0 200 200" width="240" height="240">
          {/* Tilak / Trishund */}
          <path
            d="M 75 40 Q 100 65 125 40"
            fill="none"
            stroke="#ef4444"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line x1="100" y1="30" x2="100" y2="70" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" />
          <circle cx="100" cy="55" r="4" fill="#ef4444" />
          {/* Graceful Trunk Curve */}
          <path
            d="M 100 70 Q 120 95 100 125 Q 85 145 105 160 Q 120 165 125 155"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Big Ear Arc */}
          <path
            d="M 75 75 Q 40 85 55 120 Q 70 140 85 130"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Sacred Modak */}
          <circle cx="140" cy="145" r="10" fill="#fbbf24" />
        </svg>
      );

    case 'devi':
      // Sacred Golden Lotus (Swarn Kamal) + Glowing Aura
      return (
        <svg viewBox="0 0 200 200" width="240" height="240">
          {/* Lotus Petals */}
          <path
            d="M 100 45 Q 80 85 100 125 Q 120 85 100 45 Z"
            fill="#fbbf24"
            opacity="0.9"
          />
          <path
            d="M 100 65 Q 60 95 70 135 Q 95 135 100 125 Z"
            fill="#f59e0b"
            opacity="0.85"
          />
          <path
            d="M 100 65 Q 140 95 130 135 Q 105 135 100 125 Z"
            fill="#f59e0b"
            opacity="0.85"
          />
          <path
            d="M 85 95 Q 45 120 50 145 Q 80 145 90 135 Z"
            fill="#d97706"
            opacity="0.75"
          />
          <path
            d="M 115 95 Q 155 120 150 145 Q 120 145 110 135 Z"
            fill="#d97706"
            opacity="0.75"
          />
          {/* Base Calyx */}
          <ellipse cx="100" cy="150" rx="35" ry="8" fill="#fbbf24" />
        </svg>
      );

    case 'islam':
      // Radiant Crescent Moon (Hilal) & Star with Sacred Lantern
      return (
        <svg viewBox="0 0 200 200" width="240" height="240">
          {/* Crescent Moon */}
          <path
            d="M 60 40 A 55 55 0 0 0 140 145 A 68 68 0 0 1 60 40"
            fill="#34d399"
          />
          {/* 5-Pointed Star */}
          <polygon
            points="140,55 144,67 157,67 146,75 150,87 140,80 130,87 134,75 123,67 136,67"
            fill="#fbbf24"
          />
        </svg>
      );

    case 'sikh':
      // Radiant Golden Khanda Sahib
      return (
        <svg viewBox="0 0 200 200" width="240" height="240">
          {/* Center Double-edged Sword */}
          <polygon points="100,25 93,125 100,165 107,125" fill="#fbbf24" />
          <line x1="80" y1="145" x2="120" y2="145" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
          {/* Sacred Chakkar (Circle) */}
          <circle cx="100" cy="95" r="32" fill="none" stroke="#fbbf24" strokeWidth="7" />
          {/* Two Outer Curved Kirpans */}
          <path
            d="M 60 70 Q 40 115 75 155 Q 65 125 75 100 Z"
            fill="#fbbf24"
          />
          <path
            d="M 140 70 Q 160 115 125 155 Q 135 125 125 100 Z"
            fill="#fbbf24"
          />
        </svg>
      );

    case 'christian':
      // Radiant Cross with Stained-Glass Beams
      return (
        <svg viewBox="0 0 200 200" width="240" height="240">
          {/* Cross Bars */}
          <rect x="91" y="25" width="18" height="150" rx="4" fill="#fbbf24" />
          <rect x="45" y="65" width="110" height="18" rx="4" fill="#fbbf24" />
          {/* Central Halo */}
          <circle cx="100" cy="74" r="28" fill="none" stroke="#fde68a" strokeWidth="3" opacity="0.8" />
        </svg>
      );

    case 'jain':
      // Ahimsa Hand with Dharmachakra
      return (
        <svg viewBox="0 0 200 200" width="240" height="240">
          {/* Open Palm Contour */}
          <path
            d="M 80 160 L 80 110 Q 80 85 90 85 Q 100 85 100 110 L 100 70 Q 100 50 110 50 Q 120 50 120 70 L 120 80 Q 120 60 130 60 Q 140 60 140 85 L 140 100 Q 140 85 148 85 Q 155 85 155 105 L 150 140 Q 145 165 115 170 Z"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Dharmachakra in Palm */}
          <circle cx="115" cy="120" r="16" fill="none" stroke="#fbbf24" strokeWidth="3" />
        </svg>
      );

    case 'temple':
    default:
      // Sacred Temple Spire (Shikhara) + Animated Flickering Diya Flame
      return (
        <svg viewBox="0 0 200 200" width="240" height="240">
          {/* Animated Flickering Diya Flame */}
          <g transform={`translate(${flameSway}, 0) scale(1, ${flameScaleY})`}>
            {/* Outer Flame (Orange) */}
            <path
              d="M 100 35 C 80 75 75 105 100 125 C 125 105 120 75 100 35 Z"
              fill="#f59e0b"
              opacity="0.9"
            />
            {/* Inner Flame (Bright Yellow) */}
            <path
              d="M 100 55 C 88 80 86 100 100 115 C 114 100 112 80 100 55 Z"
              fill="#fef08a"
            />
            {/* Core White Flame */}
            <path
              d="M 100 75 C 94 90 92 102 100 110 C 108 102 106 90 100 75 Z"
              fill="#ffffff"
            />
          </g>
          {/* Earthen Diya Bowl */}
          <path
            d="M 60 125 Q 100 160 140 125 Q 100 135 60 125 Z"
            fill="#d97706"
            stroke="#fbbf24"
            strokeWidth="3"
          />
          {/* Diya Base */}
          <ellipse cx="100" cy="148" rx="26" ry="6" fill="#b45309" />
        </svg>
      );
  }
};
