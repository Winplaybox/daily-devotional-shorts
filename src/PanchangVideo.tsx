import React from 'react';
import {
  AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';

type Props = {
  religion?: string; title?: string; dateDisplay?: string; footer?: string;
  panchang_raw?: Record<string, any>; narrationFile?: string; [key: string]: any;
};
type Metric = { label: string; value: string; accent?: boolean };
type Scene = {
  eyebrow: string; title: string; subtitle?: string; hook?: boolean;
  metrics?: Metric[]; hero?: boolean;
};

const GOLD = '#f4ca72';
const IVORY = '#fff4dc';
const MUTED = '#e4cba4';

const value = (input: unknown, fallback = '—') =>
  input === undefined || input === null || input === '' ? fallback : String(input);

const OrnamentalDivider: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <Img
    src={staticFile('assets/lotus-divider.svg')}
    style={{ width: 390, height: 48, objectFit: 'fill', opacity, margin: '-2px auto' }}
  />
);

const MetricCard: React.FC<{ metric: Metric; index: number; frame: number }> = ({
  metric, index, frame,
}) => {
  const reveal = interpolate(frame - index * 5, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const lift = interpolate(reveal, [0, 1], [34, 0]);
  return (
    <div style={{
      opacity: reveal, transform: `translateY(${lift}px) scale(${0.97 + reveal * 0.03})`,
      minHeight: 176, padding: '24px 22px', borderRadius: 22,
      border: metric.accent ? '2px solid #f4ca72' : '1.5px solid rgba(226,177,91,.9)',
      background: metric.accent
        ? 'linear-gradient(145deg, rgba(139,29,45,.96), rgba(55,9,22,.97))'
        : 'linear-gradient(145deg, rgba(91,22,35,.94), rgba(34,7,16,.97))',
      boxShadow: '0 8px 24px rgba(0,0,0,.72), inset 0 1px 5px rgba(255,238,177,.25), inset 0 0 24px rgba(244,202,114,.08)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', textAlign: 'center', gap: 7, position: 'relative',
      outline: '1px solid rgba(255,221,133,.18)', outlineOffset: -8,
    }}>
      <div style={{
        color: GOLD, fontSize: 27, fontWeight: 800, letterSpacing: 1,
        textShadow: '0 2px 8px rgba(0,0,0,.85)',
      }}>{metric.label}</div>
      <OrnamentalDivider opacity={0.88} />
      <div style={{
        color: metric.accent ? '#ffe6a0' : IVORY,
        fontSize: metric.value.length > 25 ? 28 : metric.value.length > 17 ? 33 : 40,
        fontWeight: 900, lineHeight: 1.25,
        textShadow: '0 3px 5px rgba(0,0,0,.9), 0 0 14px rgba(255,194,77,.24)',
      }}>{metric.value}</div>
    </div>
  );
};

const SceneView: React.FC<{
  scene: Scene; frame: number; brand: string; date: string; footer: string;
}> = ({ scene, frame, brand, date, footer }) => {
  const headingIn = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ padding: '118px 76px 112px', justifyContent: 'center' }}>
      <div style={{
        textAlign: 'center', opacity: headingIn,
        transform: `translateY(${(1 - headingIn) * 26}px)`,
      }}>
        <div style={{
          display: 'inline-block', padding: '10px 26px',
          border: '2px solid rgba(244,202,114,.95)', borderRadius: 40,
          color: GOLD, background: 'linear-gradient(135deg,rgba(95,15,28,.94),rgba(30,5,13,.96))',
          fontSize: 23, fontWeight: 900, letterSpacing: 3,
          boxShadow: '0 5px 18px rgba(0,0,0,.75), inset 0 1px 5px rgba(255,255,255,.18)',
          textShadow: '0 2px 6px rgba(0,0,0,.9)',
        }}>🕉️ {brand}</div>
        <div style={{
          color: GOLD, fontSize: 25, fontWeight: 900, letterSpacing: 4,
          marginTop: 24, textShadow: '0 3px 9px rgba(0,0,0,.95)',
        }}>{scene.eyebrow}</div>
        <OrnamentalDivider />
        <div style={{
          color: IVORY, fontSize: scene.hero ? (scene.hook ? 64 : 70) : 58,
          fontWeight: 900, lineHeight: 1.2, marginTop: 8,
          textShadow: '0 4px 8px rgba(0,0,0,.95), 0 0 22px rgba(255,205,105,.3)',
        }}>{scene.title}</div>
        {scene.subtitle && (
          <div style={{
            color: MUTED, fontSize: 30, fontWeight: 700, marginTop: 18, lineHeight: 1.4,
            textShadow: '0 3px 8px rgba(0,0,0,.95)',
          }}>{scene.subtitle}</div>
        )}
        {scene.hero && (
          <div style={{
            display: 'inline-block', marginTop: 28, padding: '15px 32px',
            borderRadius: 50, background: 'linear-gradient(110deg,#fff0c9,#d99b3c)',
            color: '#53131d', border: '2px solid #fff1c9', fontSize: 32, fontWeight: 900,
            boxShadow: '0 8px 22px rgba(0,0,0,.75), inset 0 2px 5px rgba(255,255,255,.6)',
            textShadow: '0 1px 1px rgba(255,255,255,.45)',
          }}>{date}</div>
        )}
      </div>
      {scene.metrics && (
        <div style={{
          display: 'grid', gridTemplateColumns: scene.metrics.length === 1 ? '1fr' : '1fr 1fr',
          gap: 17, marginTop: 30,
        }}>
          {scene.metrics.map((metric, index) => (
            <MetricCard key={metric.label} metric={metric} index={index} frame={frame} />
          ))}
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 42, left: 70, right: 70, textAlign: 'center',
        color: '#f2dfba', fontSize: 18, lineHeight: 1.45, opacity: 0.96,
        textShadow: '0 2px 8px rgba(0,0,0,.95)',
      }}>{footer}</div>
    </AbsoluteFill>
  );
};

export const PanchangVideo: React.FC<Props> = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = props.panchang_raw || {};
  const date = props.dateDisplay || p.date_display || '';
  const brand = props.religion || 'PAVITRA PANCHANG 365';
  const location = value(p.location_name, 'उज्जैन');
  const timezone = value(p.timezone_label, 'IST');
  const footer = `गणना स्थान: ${location} • ${timezone} • स्थानीय समय में अंतर संभव`;
  const tithi = value(p.tithi_name, 'आज की तिथि');
  const nakshatra = value(p.nakshatra_name, 'आज का नक्षत्र');

  const scenes: Scene[] = [
    { eyebrow: `आज का पंचांग • ${date}`, title: tithi, subtitle: `आज का नक्षत्र: ${nakshatra}`, hero: true, hook: true },
    {
      eyebrow: 'आज की तिथि', title: value(p.tithi_name, 'तिथि उपलब्ध नहीं'),
      subtitle: 'आज के दिन का पंचांग परिचय',
      metrics: [
        { label: 'पक्ष', value: value(p.paksha), accent: true },
        { label: 'हिंदू मास', value: value(p.hindu_month) },
        { label: 'विक्रम संवत', value: value(p.vikram_samvat) },
        { label: 'शक संवत', value: value(p.shaka_samvat) },
      ],
    },
    {
      eyebrow: 'नक्षत्र एवं योग', title: 'आज के पंचांग के विशेष योग',
      metrics: [
        { label: 'नक्षत्र', value: value(p.nakshatra_name), accent: true },
        { label: 'योग', value: value(p.yoga_name) },
        { label: 'करण', value: value(p.karana_name) },
        { label: 'वार', value: value(p.weekday) },
      ],
    },
    {
      eyebrow: 'सूर्य की दैनिक गति', title: 'दिन के प्रमुख समय',
      metrics: [
        { label: 'सूर्योदय', value: value(p.sunrise), accent: true },
        { label: 'सूर्यास्त', value: value(p.sunset), accent: true },
        { label: 'ब्रह्म मुहूर्त', value: value(p.brahma) },
        { label: 'गोधूलि', value: value(p.godhuli) },
      ],
    },
    {
      eyebrow: 'शुभ एवं सावधानी के समय', title: 'आज के मुहूर्त',
      metrics: [
        { label: 'अभिजीत मुहूर्त', value: value(p.abhijit), accent: true },
        { label: 'अमृत चौघड़िया', value: value(p.amrit_choghadiya) },
        { label: 'शुभ चौघड़िया', value: value(p.shubh_choghadiya) },
        { label: 'राहुकाल', value: value(p.rahu_kaal) },
      ],
    },
    { eyebrow: 'पवित्र पंचांग 365', title: 'आपका दिन मंगलमय हो', subtitle: 'कल का पंचांग जानने के लिए चैनल से जुड़ें।', hero: true },
  ];

  const sceneProgress = [0, 0.13, 0.32, 0.51, 0.70, 0.90];
  const sceneFrames = scenes.map((scene, index) => {
    const start = Math.round(durationInFrames * sceneProgress[index]);
    const end = index === scenes.length - 1 ? durationInFrames : Math.round(durationInFrames * sceneProgress[index + 1]);
    const fade = 10;
    const opacity = interpolate(frame, [start, start + fade, end - fade, end], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    return { scene, start, opacity };
  });
  const progress = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: 'clamp' });
  const glow = 0.82 + Math.sin(frame / 18) * 0.08;

  return (
    <AbsoluteFill style={{
      overflow: 'hidden', background: '#21050b',
      fontFamily: 'Noto Sans Devanagari, sans-serif',
    }}>
      <Audio src={staticFile('devotional_ambient.wav')} volume={0.10} loop />
      <Audio src={staticFile(props.narrationFile || 'narration.wav')} volume={1} />
      <Img src={staticFile('assets/oxblood-mandala.svg')} style={{
        position: 'absolute', width: '100%', height: '100%', objectFit: 'cover',
        opacity: 0.94,
      }} />
      <AbsoluteFill style={{
        background: `radial-gradient(circle at 50% 42%, rgba(255,190,83,${glow * 0.13}), transparent 48%), linear-gradient(180deg,rgba(18,2,7,.18),rgba(12,1,5,.44))`,
      }} />
      <Img src={staticFile('assets/lotus-filigree-frame.svg')} style={{
        position: 'absolute', width: '100%', height: '100%', objectFit: 'fill',
        opacity: 0.92, pointerEvents: 'none',
      }} />
      <div style={{ position: 'absolute', top: 35, left: 0, right: 0, textAlign: 'center', fontSize: 54, opacity: 0.95, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.9))' }}>🪔</div>
      {sceneFrames.map(({ scene, start, opacity }) => (
        <AbsoluteFill key={scene.eyebrow} style={{ opacity }}>
          <SceneView scene={scene} frame={frame - start} brand={brand} date={date} footer={footer} />
        </AbsoluteFill>
      ))}
      <div style={{
        position: 'absolute', left: 70, right: 70, bottom: 24, height: 7,
        borderRadius: 10, background: 'rgba(255,244,220,.22)', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,.8)',
      }}>
        <div style={{
          width: `${progress}%`, height: '100%',
          background: 'linear-gradient(90deg,#b87922,#fff0a0,#d99b3b)',
          boxShadow: '0 0 18px rgba(244,202,114,.8)',
        }} />
      </div>
    </AbsoluteFill>
  );
};
