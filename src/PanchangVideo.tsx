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

// --- HINDI MAPPINGS ---
const HINDI_MONTHS: Record<number, string> = {
  1: 'जनवरी', 2: 'फ़रवरी', 3: 'मार्च', 4: 'अप्रैल', 5: 'मई', 6: 'जून',
  7: 'जुलाई', 8: 'अगस्त', 9: 'सितम्बर', 10: 'अक्टूबर', 11: 'नवम्बर', 12: 'दिसम्बर'
};

const HINDI_WEEKDAYS: Record<string, string> = {
  'monday': 'सोमवार', 'tuesday': 'मंगलवार', 'wednesday': 'बुधवार',
  'thursday': 'गुरुवार', 'friday': 'शुक्रवार', 'saturday': 'शनिवार', 'sunday': 'रविवार'
};

const HINDI_LUNAR_MONTHS: Record<string, string> = {
  'chaitra': 'चैत्र', 'vaishakha': 'वैशाख', 'jyeshtha': 'ज्येष्ठ', 'ashadha': 'आषाढ़',
  'shravana': 'श्रावण', 'bhadrapada': 'भाद्रपद', 'ashwin': 'आश्विन', 'kartika': 'कार्तिक',
  'margashirsha': 'मार्गशीर्ष', 'pausha': 'पौष', 'magha': 'माघ', 'phalguna': 'फाल्गुन'
};

const formatTime12h = (t: string | undefined): string => {
  if (!t) return '—';
  if (t.includes('AM') || t.includes('PM')) return t;
  const parts = t.trim().split(':');
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  }
  return t;
};

// --- ORNATE SVG COMPONENTS ---

// 1. Realistic Sacred Mangal Kalash with Coconut, Mango Leaves & Sacred Swastika
const MangalKalash: React.FC<{size?: number; style?: React.CSSProperties}> = ({size = 150, style}) => (
  <div style={{position: 'relative', width: size, ...style}}>
    {/* Divine golden radial aura */}
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: '10%',
        right: '10%',
        height: size * 0.45,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(250,204,21,0.35) 0%, transparent 70%)',
        filter: 'blur(10px)',
        pointerEvents: 'none'
      }}
    />
    <Img
      src={staticFile('assets/mangal_kalash.png')}
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.9)) drop-shadow(0 0 15px rgba(250,204,21,0.25))'
      }}
    />
  </div>
);

// 2. Hanging 3D Brass Temple Bell with organic noise sway
const SwayingBell: React.FC<{frame: number; offset?: number; length?: number; style?: React.CSSProperties; size?: number}> = ({
  frame,
  offset = 0,
  length = 70,
  style,
  size = 56
}) => {
  // Use @remotion/noise for natural temple bell sway physics
  const sway = noise2D('bell-sway-' + offset, frame * 0.045, 0) * 6.5;
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        transformOrigin: 'top center',
        transform: `rotate(${sway}deg)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.75))',
        zIndex: 11,
        ...style
      }}
    >
      {/* Brass Chain */}
      <div
        style={{
          width: 3.5,
          height: length,
          background: 'repeating-linear-gradient(to bottom, #fde047 0px, #ca8a04 5px, #854d0e 10px)',
          boxShadow: '0 0 4px rgba(0,0,0,0.5)'
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

// 7. Kinetic Shimmer Header (light sweep effect across gold title)
const ShimmerHeader: React.FC<{text: string; frame: number; font: string}> = ({text, frame, font}) => {
  const cycle = frame % 90;
  const sweep = interpolate(cycle, [0, 45, 90], [-120, 220, 220], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <div style={{position: 'relative', display: 'inline-block'}}>
      <h1
        style={{
          margin: '0 0 4px',
          fontSize: 72,
          fontWeight: 900,
          letterSpacing: 3,
          fontFamily: font,
          background: 'linear-gradient(180deg, #ffffff 0%, #fef08a 30%, #facc15 65%, #ca8a04 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.9))'
        }}
      >
        {text}
      </h1>
      {/* Dynamic specular light beam */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.75) 48%, rgba(254,240,138,0.9) 52%, transparent 80%)',
          backgroundSize: '200% 100%',
          backgroundPosition: `${sweep}% 0`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mixBlendMode: 'color-dodge',
          opacity: 0.85
        }}
      >
        {text}
      </div>
    </div>
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
export const PanchangVideo: React.FC<PanchangProps> = (props) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  // Normalize data between structured JSON and flat keys
  const p = props.panchang_raw || {};
  const meta = props.date_meta || p.date_meta || {};
  const c1 = props.card_1_essence || p.card_1_essence || {};
  const c2 = props.card_2_nature || p.card_2_nature || {};
  const c3 = props.card_3_muhurat || p.card_3_muhurat || {};
  const c4 = props.card_4_cultural || p.card_4_cultural || {};
  const c5 = props.card_5_jyotish || p.card_5_jyotish || {};

  // Date parsing
  const rawDateStr = meta.gregorian_date || p.date || '2026-10-17';
  let formattedHindiDate = props.dateDisplay || '';
  if (!formattedHindiDate && rawDateStr) {
    const parts = rawDateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const monthIdx = parseInt(parts[1], 10);
      const year = parts[0];
      const monthHi = HINDI_MONTHS[monthIdx] || parts[1];
      formattedHindiDate = `${day} ${monthHi} ${year}`;
    }
  }

  // Weekday in Hindi
  const rawDay = (meta.day_of_week || p.weekday || 'Saturday').toLowerCase();
  const hindiDay = HINDI_WEEKDAYS[rawDay] || meta.day_of_week || p.weekday || 'शनिवार';

  // Month (Hindu)
  const rawMonth = (meta.month_amanta || meta.month_purnimanta || p.hindu_month || 'Ashwin').toLowerCase();
  const hindiMonth = HINDI_LUNAR_MONTHS[rawMonth] ? `${HINDI_LUNAR_MONTHS[rawMonth]} माह` : (p.hindu_month || 'आश्विन माह');

  // Paksha
  const rawPaksha = meta.paksha || p.paksha || 'Shukla';
  const hindiPaksha = rawPaksha.toLowerCase().includes('shukla') ? 'शुक्ल पक्ष' : (rawPaksha.toLowerCase().includes('krishna') ? 'कृष्ण पक्ष' : rawPaksha);

  // Tithi
  const rawTithi = c1.tithi?.name || p.tithi_name || 'सप्तमी तिथि';
  const hindiTithi = rawTithi.includes('तिथि') ? rawTithi : `${rawTithi} तिथि`;

  // Sun & Moon Timings
  const sunrise = formatTime12h(c2.solar?.sunrise || p.sunrise || '06:23 AM');
  const sunset = formatTime12h(c2.solar?.sunset || p.sunset || '05:56 PM');
  const moonrise = formatTime12h(c2.lunar?.moonrise || p.moonrise || '12:23 PM');
  const moonset = formatTime12h(c2.lunar?.moonset || p.moonset || '10:36 PM');

  // Auspicious (Shubh Kaal)
  const auspiciousList = Array.isArray(c3.auspicious) ? c3.auspicious : [];
  const abhijit = auspiciousList.find((x: any) => x.name?.toLowerCase().includes('abhijit'))
    ? `${formatTime12h(auspiciousList.find((x: any) => x.name?.toLowerCase().includes('abhijit')).start)} – ${formatTime12h(auspiciousList.find((x: any) => x.name?.toLowerCase().includes('abhijit')).end)}`
    : (p.abhijit || '11:43 AM – 12:29 PM');

  const amritKaal = auspiciousList.find((x: any) => x.name?.toLowerCase().includes('amrit'))
    ? `${formatTime12h(auspiciousList.find((x: any) => x.name?.toLowerCase().includes('amrit')).start)} – ${formatTime12h(auspiciousList.find((x: any) => x.name?.toLowerCase().includes('amrit')).end)}`
    : (p.amrit_kaal || '02:10 AM – 03:40 AM');

  const brahma = auspiciousList.find((x: any) => x.name?.toLowerCase().includes('brahma'))
    ? `${formatTime12h(auspiciousList.find((x: any) => x.name?.toLowerCase().includes('brahma')).start)} – ${formatTime12h(auspiciousList.find((x: any) => x.name?.toLowerCase().includes('brahma')).end)}`
    : (p.brahma || '04:51 AM – 05:40 AM');

  // Inauspicious (Ashubh Kaal)
  const inauspiciousList = Array.isArray(c3.inauspicious) ? c3.inauspicious : [];
  const rahuKaal = inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('rahu'))
    ? `${formatTime12h(inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('rahu')).start)} – ${formatTime12h(inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('rahu')).end)}`
    : (p.rahu_kaal || '09:17 AM – 10:40 AM');

  const yamagandam = inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('yama'))
    ? `${formatTime12h(inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('yama')).start)} – ${formatTime12h(inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('yama')).end)}`
    : (p.yamaganda || '01:32 PM – 02:56 PM');

  const gulikKaal = inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('guli'))
    ? `${formatTime12h(inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('guli')).start)} – ${formatTime12h(inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('guli')).end)}`
    : (p.gulika || '06:28 AM – 07:52 AM');

  // Festival & Vrat
  const festivals = Array.isArray(c4.festivals) ? c4.festivals : [];
  const festivalTitle = festivals.length > 0 ? festivals[0].name : (props.title || 'शारदीय नवरात्रि का सातवें दिन (माँ कालरात्रि की पूजा)');

  // Disha Shool
  const disha = p.disha_shool || 'पूर्व दिशा';

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

      {/* Layer 4: Victorian Gold Double Border & 4 Corner Flourishes */}
      {/* Outer Border Line */}
      <div
        style={{
          position: 'absolute',
          top: 26,
          left: 26,
          right: 26,
          bottom: 26,
          border: '2px solid #ca8a04',
          boxShadow: '0 0 16px rgba(250,204,21,0.4), inset 0 0 16px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
          zIndex: 9
        }}
      />
      {/* Inner Border Line */}
      <div
        style={{
          position: 'absolute',
          top: 36,
          left: 36,
          right: 36,
          bottom: 36,
          border: '1px solid rgba(254, 240, 138, 0.75)',
          pointerEvents: 'none',
          zIndex: 9
        }}
      />

      {/* 4 Victorian Gold Corner Flourishes (from vecteezy vector) */}
      {/* Top-Left Corner */}
      <Img
        src={staticFile('assets/corner_victorian.svg')}
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          width: 140,
          height: 'auto',
          pointerEvents: 'none',
          zIndex: 10,
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))'
        }}
      />
      {/* Top-Right Corner */}
      <Img
        src={staticFile('assets/corner_victorian.svg')}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          width: 140,
          height: 'auto',
          transform: 'scaleX(-1)',
          pointerEvents: 'none',
          zIndex: 10,
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))'
        }}
      />
      {/* Bottom-Left Corner */}
      <Img
        src={staticFile('assets/corner_victorian.svg')}
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          width: 140,
          height: 'auto',
          transform: 'scaleY(-1)',
          pointerEvents: 'none',
          zIndex: 10,
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))'
        }}
      />
      {/* Bottom-Right Corner */}
      <Img
        src={staticFile('assets/corner_victorian.svg')}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 140,
          height: 'auto',
          transform: 'scale(-1, -1)',
          pointerEvents: 'none',
          zIndex: 10,
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))'
        }}
      />

      {/* Layer 5: Authentic Marigold Garlands & Hanging Brass Temple Bells */}
      {/* Left Side: Garlands & 2 Hanging Bells */}
      <div style={{position: 'absolute', top: 26, left: 54, zIndex: 11, pointerEvents: 'none'}}>
        {/* Outer Long Garland */}
        <Img
          src={staticFile('assets/marigold_garland.png')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 36,
            height: 440,
            objectFit: 'cover',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.75))'
          }}
        />
        {/* Inner Medium Garland */}
        <Img
          src={staticFile('assets/marigold_garland.png')}
          style={{
            position: 'absolute',
            top: 0,
            left: 44,
            width: 30,
            height: 270,
            objectFit: 'cover',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.75))'
          }}
        />
        {/* Bell 1 (Inner, Higher up) */}
        <SwayingBell frame={frame} offset={0} length={60} size={54} style={{top: 270, left: 34}} />
        {/* Bell 2 (Outer, Lower down) */}
        <SwayingBell frame={frame} offset={8} length={65} size={58} style={{top: 440, left: -10}} />
      </div>

      {/* Right Side: Garlands & 2 Hanging Bells */}
      <div style={{position: 'absolute', top: 26, right: 54, zIndex: 11, pointerEvents: 'none'}}>
        {/* Outer Long Garland */}
        <Img
          src={staticFile('assets/marigold_garland.png')}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 36,
            height: 440,
            objectFit: 'cover',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.75))'
          }}
        />
        {/* Inner Medium Garland */}
        <Img
          src={staticFile('assets/marigold_garland.png')}
          style={{
            position: 'absolute',
            top: 0,
            right: 44,
            width: 30,
            height: 270,
            objectFit: 'cover',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.75))'
          }}
        />
        {/* Bell 1 (Inner, Higher up) */}
        <SwayingBell frame={frame} offset={14} length={60} size={54} style={{top: 270, right: 34}} />
        {/* Bell 2 (Outer, Lower down) */}
        <SwayingBell frame={frame} offset={22} length={65} size={58} style={{top: 440, right: -10}} />
      </div>

      {/* Layer 6: MAIN CONTENT POSTER (Centered & Symmetrical) */}
      <AbsoluteFill
        style={{
          padding: '52px 90px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: entrance
        }}
      >
        {/* --- HEADER BLOCK (Remocn-inspired Kinetic Shimmer) --- */}
        <div style={{textAlign: 'center', width: '100%', marginTop: 2}}>
          <VedicDivider width={360} />
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

        {/* Vedic Decorative Flourish Divider */}
        <VedicDivider width={380} />

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

        {/* --- SECTION 5: CHOGHADIYA MUHURAT (Remocn-inspired GlowGlassCard) --- */}
        <GlowGlassCard style={{width: '95%', maxWidth: 820, textAlign: 'center'}}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: GOLD_LIGHT,
              marginBottom: 8,
              letterSpacing: 1.5,
              fontFamily: notoFont,
              textShadow: '0 2px 6px #000'
            }}
          >
            चौघड़िया मुहूर्त
          </div>
          <div
            style={{
              fontSize: 25,
              fontWeight: 750,
              color: WHITE,
              lineHeight: 1.45,
              fontFamily: notoFont,
              textShadow: '0 2px 6px #000'
            }}
          >
            <div>शुभ का चौघड़िया 07:51 AM–09:16 AM तक</div>
            <div>चर का चौघड़िया 12:06 PM–01:31 PM तक</div>
            <div>लाभ का चौघड़िया 01:31 PM–02:56 PM तक</div>
            <div>अमृत का चौघड़िया 02:56 PM–04:20 PM तक</div>
          </div>
        </GlowGlassCard>

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
            आज {disha} में दिशा शूल रहेगा। इसलिए आज {disha} में यात्रा करने से बचें। यदि आवश्यक हो तो पहले उपाय करके ही प्रस्थान करें।
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
          <MangalKalash size={140} style={{transform: 'scaleX(-1)'}} />
        </div>
      </AbsoluteFill>

      {/* Layer 7: Golden Video Timeline Progress Indicator */}
      <div
        style={{
          position: 'absolute',
          left: 56,
          right: 56,
          bottom: 38,
          height: 6,
          borderRadius: 6,
          background: 'rgba(255,244,220,0.22)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${progressPct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #b45309, #fde047, #f59e0b)',
            boxShadow: '0 0 12px rgba(250,204,21,0.8)'
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
