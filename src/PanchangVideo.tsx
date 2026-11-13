import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import {loadFont as loadRozha} from '@remotion/google-fonts/RozhaOne';
import {loadFont as loadNotoSans} from '@remotion/google-fonts/NotoSansDevanagari';
import {noise2D} from '@remotion/noise';
import {Star} from '@remotion/shapes';
import { getAfternoonSlotContent } from './editorial/slot-content.js';
import { buildHook } from './editorial/hook.js';

// Load authentic Google Fonts natively via @remotion/google-fonts
const {fontFamily: rozhaFont} = loadRozha();
const {fontFamily: notoFont} = loadNotoSans();

export type PanchangProps = {
  religion?: string;
  title?: string;
  dateDisplay?: string;
  footer?: string;
  panchang_raw?: Record<string, any>;
  narrationFile?: string;
  date_meta?: any;
  card_1_essence?: any;
  card_2_nature?: any;
  card_3_muhurat?: any;
  card_4_cultural?: any;
  card_5_jyotish?: any;
  [key: string]: any;
};

// --- COLOR PALETTE ---
const GOLD_LIGHT = '#fff8db';
const GOLD_MID = '#fde047';
const WHITE = '#ffffff';
const CREAM = '#fef9c3';
const MAROON_CARD = 'rgba(78, 9, 18, 0.90)';

import {
  mapPanchangData,
  formatTime12h,
  MappedPanchangData,
  HINDI_MONTHS,
  HINDI_WEEKDAYS,
  HINDI_LUNAR_MONTHS
} from './panchangMapper';

export { mapPanchangData, formatTime12h };
export type { MappedPanchangData };

// --- ORNATE SVG COMPONENTS ---

// 1. Vector Sacred Mangal Kalash (100% clean SVG vector from vecteezy)
const MangalKalash: React.FC<{size?: number; variant?: number; style?: React.CSSProperties}> = ({size = 145, variant = 2, style}) => (
  <div style={{position: 'relative', width: size, height: size, ...style}}>
    {/* Divine golden radial aura */}
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: '10%',
        right: '10%',
        height: size * 0.45,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(250,204,21,0.4) 0%, transparent 70%)',
        filter: 'blur(10px)',
        pointerEvents: 'none'
      }}
    />
    <Img
      src={staticFile(`assets/kalash_${variant}.svg`)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block',
        filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.9)) drop-shadow(0 0 12px rgba(250,204,21,0.3))'
      }}
    />
  </div>
);

// 2. Hanging 3D Brass Temple Bell with organic noise sway
const SwayingBell: React.FC<{
  frame: number;
  offset?: number;
  length?: number;
  size?: number;
  style?: React.CSSProperties;
}> = ({
  frame,
  offset = 0,
  length = 65,
  size = 56,
  style
}) => {
  // Use @remotion/noise for natural temple bell sway physics
  const sway = noise2D('bell-sway-' + offset, frame * 0.045, 0) * 6.5;
  return (
    <div
      style={{
        position: 'relative',
        transformOrigin: 'top center',
        transform: `rotate(${sway}deg)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.85))',
        zIndex: 11,
        ...style
      }}
    >
      {/* Brass Chain attached directly to garland */}
      <div
        style={{
          width: 3.5,
          height: length,
          background: 'repeating-linear-gradient(to bottom, #fde047 0px, #ca8a04 4px, #854d0e 8px)',
          boxShadow: '0 0 3px rgba(0,0,0,0.6)'
        }}
      />
      {/* 3D Realistic Temple Bell */}
      <Img
        src={staticFile('assets/temple_bell.png')}
        style={{
          width: size,
          height: 'auto',
          marginTop: -2,
          display: 'block'
        }}
      />
    </div>
  );
};

// 3. Hanging Marigold Garland (गेंदे की माला)
const MarigoldGarland: React.FC<{count?: number; style?: React.CSSProperties}> = ({count = 11, style}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, ...style}}>
    {Array.from({length: count}).map((_, i) => (
      <div key={i} style={{position: 'relative', width: 36, height: 36}}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              i % 2 === 0
                ? 'radial-gradient(circle, #fef08a 25%, #f59e0b 75%, #b45309 100%)'
                : 'radial-gradient(circle, #facc15 20%, #ea580c 80%, #9a3412 100%)',
            boxShadow: '0 3px 6px rgba(0,0,0,0.5)',
            transform: `rotate(${i * 37}deg)`
          }}
        />
        {i % 3 === 0 && (
          <div
            style={{
              position: 'absolute',
              width: 11,
              height: 15,
              borderRadius: '50%',
              background: '#22c55e',
              top: 10,
              left: -4,
              transform: 'rotate(-45deg)'
            }}
          />
        )}
      </div>
    ))}
  </div>
);

// 4. Glowing Sacred Diya with organic Perlin Noise flame flicker
const GlowingDiya: React.FC<{frame: number; size?: number; style?: React.CSSProperties}> = ({frame, size = 95, style}) => {
  // Use @remotion/noise for realistic procedural flame flicker
  const noiseVal = noise2D('diya-flame', frame * 0.18, 0);
  const flicker = 0.90 + noiseVal * 0.16;
  const flameTilt = noise2D('flame-tilt', frame * 0.12, 10) * 8;

  return (
    <div style={{position: 'relative', width: size, height: size * 0.8, ...style}}>
      {/* Flickering Flame */}
      <div
        style={{
          position: 'absolute',
          top: -size * 0.44,
          left: size * 0.35,
          width: size * 0.3,
          height: size * 0.60,
          borderRadius: '50% 50% 35% 35% / 80% 80% 25% 25%',
          background: 'radial-gradient(ellipse at 50% 85%, #ffffff 0%, #fef08a 35%, #f97316 75%, transparent 100%)',
          filter: `drop-shadow(0 0 ${16 * flicker}px #f59e0b) drop-shadow(0 0 ${30 * flicker}px #ea580c)`,
          transform: `scale(${flicker}) rotate(${flameTilt}deg)`,
          transformOrigin: 'bottom center'
        }}
      />
      {/* Clay Lamp Body */}
      <svg width={size} height={size * 0.55} viewBox="0 0 60 33" style={{position: 'absolute', bottom: 0}}>
        <defs>
          <linearGradient id="clayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
        </defs>
        <path d="M5 8 C15 28 45 28 55 8 C58 5 54 2 48 4 C35 8 25 8 12 4 C6 2 2 5 5 8 Z" fill="url(#clayGrad)" stroke="#fde047" strokeWidth="1.2" />
        <ellipse cx="30" cy="6" rx="18" ry="3.5" fill="#ca8a04" />
      </svg>
    </div>
  );
};

// 5. Remocn-inspired Ornate Pill Badge with rhythmic ambient glow
const PillBadge: React.FC<{text: string; frame: number; bg?: string}> = ({text, frame, bg = '#7f1d1d'}) => {
  const pulse = 1 + Math.sin(frame * 0.06) * 0.02;
  const glow = 10 + Math.sin(frame * 0.06) * 6;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 32px',
        borderRadius: 24,
        background: `linear-gradient(180deg, #991b1b, ${bg})`,
        border: '2px solid #facc15',
        boxShadow: `0 4px 14px rgba(0,0,0,0.65), 0 0 ${glow}px rgba(250,204,21,0.4), inset 0 1px 4px rgba(255,255,255,0.3)`,
        color: GOLD_LIGHT,
        fontSize: 29,
        fontWeight: 900,
        letterSpacing: 1.5,
        textAlign: 'center',
        textShadow: '0 2px 5px #000',
        fontFamily: notoFont,
        transform: `scale(${pulse})`
      }}
    >
      <Star points={8} outerRadius={7} innerRadius={3.5} fill="#fde047" />
      <span>{text}</span>
      <Star points={8} outerRadius={7} innerRadius={3.5} fill="#fde047" />
    </div>
  );
};

// 6. Remocn-inspired Glassmorphism Card with golden ambient edge glow
const GlowGlassCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  glowColor?: string;
  borderColor?: string;
}> = ({children, style, glowColor = 'rgba(250, 204, 21, 0.35)', borderColor = '#facc15'}) => {
  return (
    <div
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(69, 10, 10, 0.82) 0%, rgba(28, 4, 4, 0.90) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `2px solid ${borderColor}`,
        borderRadius: 24,
        padding: '16px 26px',
        boxShadow: `0 12px 36px rgba(0,0,0,0.75), 0 0 24px ${glowColor}, inset 0 1px 8px rgba(254,240,138,0.22)`,
        ...style
      }}
    >
      {/* Specular top-edge glass refraction highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '12%',
          right: '12%',
          height: 1.5,
          background: 'linear-gradient(90deg, transparent, #fef08a, transparent)',
          opacity: 0.9
        }}
      />
      {children}
    </div>
  );
};

// 7. Kinetic Shimmer Header (clean specular light sweep, zero duplicate text)
const ShimmerHeader: React.FC<{text: string; frame: number; font: string}> = ({text, frame, font}) => {
  const cycle = frame % 90;
  const sweep = interpolate(cycle, [0, 45, 90], [-80, 180, 180], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <h1
      style={{
        margin: '0 0 4px',
        fontSize: 72,
        fontWeight: 900,
        letterSpacing: 3,
        fontFamily: font,
        backgroundImage: 'linear-gradient(110deg, #ca8a04 0%, #facc15 25%, #ffffff 50%, #facc15 75%, #ca8a04 100%)',
        backgroundSize: '250% 100%',
        backgroundPosition: `${sweep}% 0`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.95))',
        display: 'inline-block'
      }}
    >
      {text}
    </h1>
  );
};

// 8. Vedic Filigree Divider
const VedicDivider: React.FC<{width?: number}> = ({width = 380}) => (
  <svg width={width} height="16" viewBox="0 0 380 16" fill="none" style={{margin: '6px 0', opacity: 0.85}}>
    <path d="M0 8 H150 M230 8 H380" stroke="url(#divGrad)" strokeWidth="1.5" />
    <defs>
      <linearGradient id="divGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="transparent" />
        <stop offset="50%" stopColor="#fde047" />
        <stop offset="100%" stopColor="transparent" />
      </linearGradient>
    </defs>
    <circle cx="165" cy="8" r="2.5" fill="#facc15" />
    <polygon points="190,2 196,8 190,14 184,8" fill="#fde047" stroke="#b45309" strokeWidth="1" />
    <circle cx="215" cy="8" r="2.5" fill="#facc15" />
  </svg>
);

// --- MAIN PANCHANG POSTER COMPONENT ---
// --- Retention structure: hook card first, then the poster builds section by section ---
const HOOK_FRAMES = 105; // 3.5s at 30fps
const REVEAL_START = HOOK_FRAMES - 10;
const REVEAL_STEP = 45; // one section every 1.5s

const Reveal: React.FC<{frame: number; start: number; enabled: boolean; children: React.ReactNode}> = ({frame, start, enabled, children}) => {
  const t = enabled ? interpolate(frame, [start, start + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: t, transform: `translateY(${(1 - t) * 26}px)`}}>
      {children}
    </div>
  );
};

const HookIntro: React.FC<{frame: number; kicker: string; value: string; note: string; dateText: string}> = ({frame, kicker, value, note, dateText}) => {
  const fadeOut = interpolate(frame, [HOOK_FRAMES - 12, HOOK_FRAMES], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pop = interpolate(frame, [0, 8], [0.86, 1], {extrapolateRight: 'clamp'});
  const pulse = 1 + Math.sin(frame / 6) * 0.015;
  if (frame >= HOOK_FRAMES) return null;
  return (
    <AbsoluteFill
      style={{
        zIndex: 30,
        opacity: fadeOut,
        background: 'radial-gradient(ellipse at 50% 45%, rgba(92,10,20,0.97) 0%, rgba(30,2,6,0.99) 75%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 70px',
        textAlign: 'center',
        fontFamily: notoFont
      }}
    >
      <div style={{fontSize: 40, fontWeight: 800, color: GOLD_MID, letterSpacing: 1, marginBottom: 26, textShadow: '0 3px 10px #000'}}>{dateText}</div>
      <div style={{fontSize: 74, fontWeight: 900, color: GOLD_LIGHT, lineHeight: 1.2, transform: `scale(${pop})`, textShadow: '0 4px 18px #000'}}>{kicker}</div>
      <div
        style={{
          marginTop: 34,
          fontSize: 92,
          fontWeight: 900,
          color: WHITE,
          lineHeight: 1.15,
          padding: '26px 40px',
          borderRadius: 30,
          border: '4px solid #fde047',
          background: 'rgba(127,29,29,0.85)',
          boxShadow: '0 0 40px rgba(250,204,21,0.45)',
          transform: `scale(${pop * pulse})`
        }}
      >
        {value}
      </div>
      <div style={{marginTop: 34, fontSize: 46, fontWeight: 800, color: '#fca5a5', textShadow: '0 3px 10px #000'}}>{note}</div>
    </AbsoluteFill>
  );
};

export const PanchangVideo: React.FC<PanchangProps> = (props) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  const {
    formattedHindiDate,
    hindiDay,
    hindiMonth,
    hindiPaksha,
    hindiTithi,
    sunrise,
    sunset,
    moonrise,
    moonset,
    abhijit,
    amritKaal,
    brahma,
    rahuKaal,
    yamagandam,
    gulikKaal,
    choghadiyaLines,
    festivalTitle,
    dishaGuidance
  } = mapPanchangData(props);
  const afternoonSlotContent = getAfternoonSlotContent(props);
  // Only full-length Shorts get the hook card and staged reveal; still posters stay complete.
  const animateIntro = durationInFrames >= 300;
  const hook = animateIntro ? buildHook(props) : null;

  // Animation values using @remotion/noise for organic movement
  const entrance = interpolate(frame, [0, 15], [0, 1], {extrapolateRight: 'clamp'});
  const pulseScale = 1 + noise2D('mandala-pulse', frame * 0.02, 0) * 0.015;
  const progressPct = interpolate(frame, [0, durationInFrames], [0, 100], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: '#2b0308',
        fontFamily: notoFont
      }}
    >
      {/* Optional Audio Tracks */}
      <Audio src={staticFile('devotional_ambient.wav')} volume={0.12} loop />
      {props.narrationFile && <Audio src={staticFile(props.narrationFile)} volume={1} />}

      {/* Layer 1: Ethereal Royal Mandala Wallpaper */}
      <Img
        src={staticFile('assets/mandala-bg.jpg')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${pulseScale})`,
          opacity: 0.94
        }}
      />

      {/* Layer 2: Vignette & Radial Glow */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(66,7,14,0.38) 0%, rgba(36,2,7,0.74) 68%, rgba(15,1,3,0.92) 100%)'
        }}
      />

      {/* Layer 3: Floating Divine Particles with Procedural Air Turbulence */}
      {Array.from({length: 16}).map((_, i) => {
        const drift = noise2D('particle-drift-' + i, frame * 0.03, i) * 22;
        const pY = (1920 - ((frame * (1.6 + (i % 3))) + i * 115) % 2000);
        const pX = (i * 63 + 35 + drift) % 1080;
        const pOpacity = 0.25 + (Math.sin(frame / 12 + i) * 0.2);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: pY,
              left: pX,
              width: (i % 3) * 2 + 3,
              height: (i % 3) * 2 + 3,
              borderRadius: '50%',
              background: '#fef08a',
              boxShadow: '0 0 10px #f59e0b',
              opacity: pOpacity,
              pointerEvents: 'none'
            }}
          />
        );
      })}

      {/* Authentic Devotional Gold Frame Borders & Bottom Corner Flourishes (from Victorian Vector SVGs) */}
      {/* Outer Gold Border Line */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          right: 24,
          bottom: 24,
          border: '2px solid #ca8a04',
          boxShadow: '0 0 16px rgba(250,204,21,0.35), inset 0 0 12px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          zIndex: 9
        }}
      />

      {/* 2 Authentic Bottom Corner Flourishes (Vector SVG from vecteezy) */}
      {/* Bottom-Left Corner Flourish */}
      <Img
        src={staticFile('assets/victorian_corner_1.svg')}
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          width: 140,
          height: 140,
          transform: 'scaleY(-1)',
          pointerEvents: 'none',
          zIndex: 10,
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.85))'
        }}
      />
      {/* Bottom-Right Corner Flourish */}
      <Img
        src={staticFile('assets/victorian_corner_1.svg')}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 140,
          height: 140,
          transform: 'scale(-1, -1)',
          pointerEvents: 'none',
          zIndex: 10,
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.85))'
        }}
      />

      {/* Connecting Inner Border Lines (framing the poster harmoniously) */}
      <div style={{position: 'absolute', top: 38, left: 38, right: 38, height: 1.5, background: 'rgba(254, 240, 138, 0.85)', pointerEvents: 'none', zIndex: 9}} />
      <div style={{position: 'absolute', bottom: 38, left: 155, right: 155, height: 1.5, background: 'rgba(254, 240, 138, 0.85)', pointerEvents: 'none', zIndex: 9}} />
      <div style={{position: 'absolute', left: 38, top: 38, bottom: 155, width: 1.5, background: 'rgba(254, 240, 138, 0.85)', pointerEvents: 'none', zIndex: 9}} />
      <div style={{position: 'absolute', right: 38, top: 38, bottom: 155, width: 1.5, background: 'rgba(254, 240, 138, 0.85)', pointerEvents: 'none', zIndex: 9}} />

      {/* Layer 5: Authentic Marigold Garlands & Hanging Brass Temple Bells */}
      {/* Left Side: Exactly 2 Garlands with Connected Bells */}
      <div style={{position: 'absolute', top: 26, left: 56, zIndex: 11, pointerEvents: 'none'}}>
        {/* Outer Long Garland (350px) + Bell directly connected */}
        <div style={{position: 'absolute', top: 0, left: 0, width: 34, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <Img
            src={staticFile('assets/marigold_garland.png')}
            style={{
              width: 34,
              height: 350,
              objectFit: 'cover',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.75))'
            }}
          />
          <SwayingBell frame={frame} offset={8} length={60} size={56} style={{marginTop: -4}} />
        </div>

        {/* Inner Short Garland (230px) + Bell directly connected */}
        <div style={{position: 'absolute', top: 0, left: 48, width: 32, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <Img
            src={staticFile('assets/marigold_garland.png')}
            style={{
              width: 32,
              height: 230,
              objectFit: 'cover',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.75))'
            }}
          />
          <SwayingBell frame={frame} offset={0} length={30} size={50} style={{marginTop: -4}} />
        </div>
      </div>

      {/* Right Side: Exactly 2 Garlands with Connected Bells */}
      <div style={{position: 'absolute', top: 26, right: 56, zIndex: 11, pointerEvents: 'none'}}>
        {/* Outer Long Garland (350px) + Bell directly connected */}
        <div style={{position: 'absolute', top: 0, right: 0, width: 34, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <Img
            src={staticFile('assets/marigold_garland.png')}
            style={{
              width: 34,
              height: 350,
              objectFit: 'cover',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.75))'
            }}
          />
          <SwayingBell frame={frame} offset={22} length={60} size={56} style={{marginTop: -4}} />
        </div>

        {/* Inner Short Garland (230px) + Bell directly connected */}
        <div style={{position: 'absolute', top: 0, right: 48, width: 32, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <Img
            src={staticFile('assets/marigold_garland.png')}
            style={{
              width: 32,
              height: 230,
              objectFit: 'cover',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.75))'
            }}
          />
          <SwayingBell frame={frame} offset={14} length={30} size={50} style={{marginTop: -4}} />
        </div>
      </div>

      {/* Layer 6: MAIN CONTENT POSTER (Centered & Symmetrical - 100% visible from first frame to last) */}
      <AbsoluteFill
        style={{
          padding: '52px 90px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* --- HEADER BLOCK (Remocn-inspired Kinetic Shimmer) --- */}
        <div style={{textAlign: 'center', width: '100%', marginTop: 2}}>
          <Img
            src={staticFile('assets/victorian_header_3.svg')}
            style={{
              width: 250,
              height: 46,
              objectFit: 'contain',
              margin: '0 auto 2px',
              display: 'block',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.85))'
            }}
          />
          <ShimmerHeader text="॥ दैनिक पंचांग ॥" frame={frame} font={rozhaFont} />
          <div
            style={{
              fontSize: 46,
              fontWeight: 900,
              color: WHITE,
              letterSpacing: 1,
              fontFamily: notoFont,
              textShadow: '0 3px 12px rgba(0,0,0,0.95)',
              margin: '2px 0 2px'
            }}
          >
            {formattedHindiDate}
          </div>
          <div
            style={{
              fontSize: 25,
              fontStyle: 'italic',
              fontWeight: 700,
              color: GOLD_LIGHT,
              letterSpacing: 1.5,
              fontFamily: notoFont,
              textShadow: '0 2px 8px #000'
            }}
          >
            ॥ हिन्दू पंचांग के अनुसार ॥
          </div>
        </div>

        <Reveal frame={frame} start={REVEAL_START + 0 * REVEAL_STEP} enabled={animateIntro}>
        {/* --- SECTION 1: CORE PANCHANG (वार, माह, पक्ष, तिथि) --- */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 32,
            fontWeight: 800,
            color: WHITE,
            lineHeight: 1.45,
            fontFamily: notoFont,
            textShadow: '0 3px 8px #000'
          }}
        >
          <div>वार– {hindiDay}</div>
          <div>माह – {hindiMonth}</div>
          <div>पक्ष– {hindiPaksha}</div>
          <div>तिथि– {hindiTithi}</div>
        </div>
        </Reveal>

        {/* Authentic Victorian Filigree Divider */}
        <Img
          src={staticFile('assets/victorian_bar_2.svg')}
          style={{
            width: 380,
            height: 24,
            objectFit: 'contain',
            margin: '4px 0',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.85))'
          }}
        />

        <Reveal frame={frame} start={REVEAL_START + 1 * REVEAL_STEP} enabled={animateIntro}>
        {/* --- SECTION 2: SURYA & CHANDRA TIMINGS --- */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 29,
            fontWeight: 800,
            color: CREAM,
            lineHeight: 1.45,
            fontFamily: notoFont,
            textShadow: '0 3px 8px #000'
          }}
        >
          <div>सूर्योदय – {sunrise}</div>
          <div>सूर्यास्त – {sunset}</div>
          <div>चन्द्रोदय – {moonrise}</div>
          <div>चन्द्रास्त – {moonset}</div>
        </div>
        </Reveal>

        <Reveal frame={frame} start={REVEAL_START + 2 * REVEAL_STEP} enabled={animateIntro}>
        {/* --- SECTION 3: SHUBH KAAL (शुभ काल) --- */}
        <div style={{textAlign: 'center', width: '100%'}}>
          <PillBadge text="शुभ काल" frame={frame} bg="#7f1d1d" />
          <div
            style={{
              marginTop: 10,
              fontSize: 28,
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.45,
              fontFamily: notoFont,
              textShadow: '0 3px 8px #000'
            }}
          >
            <div>अभिजीत मुहूर्त – {abhijit}</div>
            <div>अमृत काल – {amritKaal}</div>
            <div>ब्रह्म मुहूर्त – {brahma}</div>
          </div>
        </div>
        </Reveal>

        <Reveal frame={frame} start={REVEAL_START + 3 * REVEAL_STEP} enabled={animateIntro}>
        {/* --- SECTION 4: ASHUBH KAAL (अशुभ काल) --- */}
        <div style={{textAlign: 'center', width: '100%'}}>
          <PillBadge text="अशुभ काल" frame={frame} bg="#7f1d1d" />
          <div
            style={{
              marginTop: 10,
              fontSize: 28,
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.45,
              fontFamily: notoFont,
              textShadow: '0 3px 8px #000'
            }}
          >
            <div style={{color: '#fca5a5'}}>राहूकाल – {rahuKaal}</div>
            <div>यमगण्ड काल – {yamagandam}</div>
            <div>गुलिक काल – {gulikKaal}</div>
          </div>
        </div>
        </Reveal>

        <Reveal frame={frame} start={REVEAL_START + 4 * REVEAL_STEP} enabled={animateIntro}>
        {/* --- SECTION 5: SLOT-SPECIFIC HIGHLIGHTS --- */}
        {afternoonSlotContent ? (
          <GlowGlassCard style={{width: '95%', maxWidth: 820, textAlign: 'center'}}>
            <div style={{fontSize: 28, fontWeight: 900, color: GOLD_LIGHT, marginBottom: 6, letterSpacing: 1, fontFamily: notoFont, textShadow: '0 2px 6px #000'}}>
              दोपहर का विशेष समय
            </div>
            <div style={{fontSize: 27, fontWeight: 900, color: GOLD_MID, marginBottom: 8, fontFamily: notoFont, textShadow: '0 2px 6px #000'}}>
              {afternoonSlotContent.title}
            </div>
            <div style={{fontSize: 24, fontWeight: 800, color: WHITE, lineHeight: 1.4, fontFamily: notoFont, textShadow: '0 2px 6px #000'}}>
              {afternoonSlotContent.highlights.map(({label, value}, idx) => (
                <div key={idx}>{label} – {value}</div>
              ))}
            </div>
            {afternoonSlotContent.footer && (
              <div style={{marginTop: 6, fontSize: 18, fontWeight: 700, color: CREAM, lineHeight: 1.3, fontFamily: notoFont}}>
                {afternoonSlotContent.footer}
              </div>
            )}
          </GlowGlassCard>
        ) : (
          <GlowGlassCard style={{width: '95%', maxWidth: 820, textAlign: 'center'}}>
            <div style={{fontSize: 30, fontWeight: 900, color: GOLD_LIGHT, marginBottom: 8, letterSpacing: 1.5, fontFamily: notoFont, textShadow: '0 2px 6px #000'}}>
              चौघड़िया मुहूर्त
            </div>
            <div style={{fontSize: 25, fontWeight: 750, color: WHITE, lineHeight: 1.45, fontFamily: notoFont, textShadow: '0 2px 6px #000'}}>
              {choghadiyaLines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          </GlowGlassCard>
        )}
        </Reveal>

        <Reveal frame={frame} start={REVEAL_START + 5 * REVEAL_STEP} enabled={animateIntro}>
        {/* --- SECTION 6: DISHA SHOOL & VISHESH PARV --- */}
        <div style={{textAlign: 'center', width: '92%', maxWidth: 860}}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: GOLD_LIGHT,
              marginBottom: 4,
              fontFamily: notoFont,
              textShadow: '0 2px 6px #000'
            }}
          >
            दिशा शूल
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 650,
              color: WHITE,
              lineHeight: 1.35,
              fontFamily: notoFont,
              textShadow: '0 2px 6px #000'
            }}
          >
            {dishaGuidance}
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 24,
              fontWeight: 900,
              color: '#fef08a',
              fontFamily: notoFont,
              textShadow: '0 2px 6px #000'
            }}
          >
            विशेष पर्व : {festivalTitle}
          </div>
        </div>
        </Reveal>

        {/* --- SECTION 7: DEVOTIONAL ORNAMENTS (MANGAL KALASH & GLOWING DIYA) --- */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: '0 40px',
            marginTop: 4
          }}
        >
          {/* Left Mangal Kalash */}
          <MangalKalash size={140} />

          {/* Center Glowing Diya with Noise Physics */}
          <GlowingDiya frame={frame} size={92} style={{marginBottom: 8}} />

          {/* Right Mangal Kalash */}
          <MangalKalash size={140} />
        </div>
      </AbsoluteFill>

      {hook && (
        <HookIntro frame={frame} kicker={hook.kicker} value={hook.value} note={hook.note} dateText={formattedHindiDate} />
      )}

      {/* Layer 7: Golden Video Timeline Progress Indicator (in bottom margin, below border line) */}
      <div
        style={{
          position: 'absolute',
          left: 48,
          right: 48,
          bottom: 10,
          height: 4,
          borderRadius: 4,
          background: 'rgba(255,244,220,0.20)',
          overflow: 'hidden',
          zIndex: 20
        }}
      >
        <div
          style={{
            width: `${progressPct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #ca8a04, #fde047, #f59e0b)',
            boxShadow: '0 0 10px rgba(250,204,21,0.85)'
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
