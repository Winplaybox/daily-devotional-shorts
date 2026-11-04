import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Props = {
  religion?: string;
  title?: string;
  dateDisplay?: string;
  footer?: string;
  panchang_raw?: Record<string, any>;
  narrationFile?: string;
  [key: string]: any;
};

type Metric = { label: string; value: string; accent?: boolean };
type Scene = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  metrics?: Metric[];
  hero?: boolean;
};

const GOLD = '#f4ca72';
const IVORY = '#fff4dc';
const MUTED = '#d9c5a0';
const RED = '#7b1d2b';

const value = (input: unknown, fallback = '—') =>
  input === undefined || input === null || input === '' ? fallback : String(input);

const MetricCard: React.FC<{ metric: Metric; index: number; frame: number }> = ({
  metric,
  index,
  frame,
}) => {
  const delay = index * 5;
  const reveal = interpolate(frame - delay, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lift = interpolate(reveal, [0, 1], [34, 0]);
  return (
    <div
      style={{
        opacity: reveal,
        transform: `translateY(${lift}px) scale(${0.97 + reveal * 0.03})`,
        minHeight: 176,
        padding: '26px 22px',
        borderRadius: 26,
        border: metric.accent ? '2px solid #f4ca72' : '1.5px solid #b88a48',
        background: metric.accent
          ? 'linear-gradient(145deg, rgba(126,30,43,.94), rgba(54,12,24,.96))'
          : 'linear-gradient(145deg, rgba(255,244,220,.13), rgba(40,10,20,.82))',
        boxShadow: metric.accent
          ? '0 14px 42px rgba(0,0,0,.28), inset 0 0 28px rgba(244,202,114,.08)'
          : '0 12px 32px rgba(0,0,0,.22)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        gap: 14,
      }}
    >
      <div style={{ color: GOLD, fontSize: 27, fontWeight: 700, letterSpacing: 1 }}>
        {metric.label}
      </div>
      <div
        style={{
          color: IVORY,
          fontSize: metric.value.length > 25 ? 31 : metric.value.length > 17 ? 35 : 43,
          fontWeight: 900,
          lineHeight: 1.25,
          textShadow: '0 3px 18px rgba(0,0,0,.5)',
        }}
      >
        {metric.value}
      </div>
    </div>
  );
};

const Mandala: React.FC<{ frame: number }> = ({ frame }) => (
  <div
    style={{
      position: 'absolute',
      width: 790,
      height: 790,
      left: '50%',
      top: '43%',
      marginLeft: -395,
      marginTop: -395,
      borderRadius: '50%',
      border: '1px solid rgba(244,202,114,.22)',
      opacity: 0.65,
      transform: `rotate(${frame * 0.12}deg) scale(${1 + Math.sin(frame / 28) * 0.018})`,
      boxShadow: '0 0 100px rgba(244,202,114,.07), inset 0 0 80px rgba(244,202,114,.05)',
      pointerEvents: 'none',
    }}
  >
    <div style={{ position: 'absolute', inset: 34, border: '1px dashed rgba(244,202,114,.35)', borderRadius: '50%' }} />
    <div style={{ position: 'absolute', inset: 95, border: '1px solid rgba(244,202,114,.22)', borderRadius: '50%' }} />
    {Array.from({ length: 24 }, (_, index) => (
      <div
        key={index}
        style={{
          position: 'absolute',
          width: 78,
          height: 180,
          left: '50%',
          top: '50%',
          marginLeft: -39,
          marginTop: -90,
          border: '1px solid rgba(244,202,114,.24)',
          borderRadius: '50%',
          transform: `rotate(${index * 15}deg) translateY(-205px)`,
          transformOrigin: 'center center',
        }}
      />
    ))}
  </div>
);

const SceneView: React.FC<{
  scene: Scene;
  frame: number;
  brand: string;
  date: string;
  footer: string;
}> = ({ scene, frame, brand, date, footer }) => {
  const headingIn = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ padding: '118px 62px 112px', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', opacity: headingIn, transform: `translateY(${(1 - headingIn) * 26}px)` }}>
        <div
          style={{
            display: 'inline-block',
            padding: '10px 26px',
            border: '1.5px solid rgba(244,202,114,.8)',
            borderRadius: 40,
            color: GOLD,
            background: 'rgba(35,8,17,.68)',
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: 3,
          }}
        >
          🕉️ {brand}
        </div>
        <div style={{ color: GOLD, fontSize: 25, fontWeight: 800, letterSpacing: 4, marginTop: 54 }}>
          {scene.eyebrow}
        </div>
        <div
          style={{
            color: IVORY,
            fontSize: scene.hero ? 76 : 66,
            fontWeight: 900,
            lineHeight: 1.2,
            marginTop: 18,
            textShadow: '0 5px 28px rgba(0,0,0,.55)',
          }}
        >
          {scene.title}
        </div>
        {scene.subtitle && (
          <div style={{ color: MUTED, fontSize: 31, fontWeight: 600, marginTop: 22, lineHeight: 1.45 }}>
            {scene.subtitle}
          </div>
        )}
        {scene.hero && (
          <div
            style={{
              display: 'inline-block',
              marginTop: 46,
              padding: '17px 34px',
              borderRadius: 50,
              background: 'linear-gradient(110deg,#fff0c9,#d99b3c)',
              color: '#53131d',
              border: '2px solid #fff1c9',
              fontSize: 34,
              fontWeight: 900,
              boxShadow: '0 12px 34px rgba(0,0,0,.3)',
            }}
          >
            {date}
          </div>
        )}
      </div>

      {scene.metrics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: scene.metrics.length === 1 ? '1fr' : '1fr 1fr',
            gap: 20,
            marginTop: 62,
          }}
        >
          {scene.metrics.map((metric, index) => (
            <MetricCard key={metric.label} metric={metric} index={index} frame={frame} />
          ))}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 42,
          left: 48,
          right: 48,
          textAlign: 'center',
          color: '#e8d6b5',
          fontSize: 19,
          lineHeight: 1.45,
          opacity: 0.9,
        }}
      >
        {footer}
      </div>
    </AbsoluteFill>
  );
};

export const PanchangVideo: React.FC<Props> = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = props.panchang_raw || {};
  const date = props.dateDisplay || p.date_display || '';
  const brand = props.religion || 'PAVITRA PANCHANG 365';
  const title = props.title || 'आज का पंचांग';
  const footer = 'समय संदर्भ स्थान एवं IST अनुसार • स्थानीय अंतर संभव';

  const scenes: Scene[] = [
    {
      eyebrow: 'दैनिक वैदिक पंचांग',
      title,
      subtitle: 'परंपरा • कालगणना • शुभ विचार',
      hero: true,
    },
    {
      eyebrow: 'आज की तिथि',
      title: value(p.tithi_name, 'तिथि उपलब्ध नहीं'),
      subtitle: 'आज के दिन का पंचांग परिचय',
      metrics: [
        { label: 'पक्ष', value: value(p.paksha), accent: true },
        { label: 'हिंदू मास', value: value(p.hindu_month) },
        { label: 'विक्रम संवत', value: value(p.vikram_samvat) },
        { label: 'शक संवत', value: value(p.shaka_samvat) },
      ],
    },
    {
      eyebrow: 'नक्षत्र एवं योग',
      title: 'आज के पंचांग के विशेष योग',
      metrics: [
        { label: 'नक्षत्र', value: value(p.nakshatra_name), accent: true },
        { label: 'योग', value: value(p.yoga_name) },
        { label: 'करण', value: value(p.karana_name) },
        { label: 'वार', value: value(p.weekday) },
      ],
    },
    {
      eyebrow: 'सूर्य की दैनिक गति',
      title: 'दिन के प्रमुख समय',
      metrics: [
        { label: 'सूर्योदय', value: value(p.sunrise), accent: true },
        { label: 'सूर्यास्त', value: value(p.sunset), accent: true },
        { label: 'ब्रह्म मुहूर्त', value: value(p.brahma) },
        { label: 'गोधूलि', value: value(p.godhuli) },
      ],
    },
    {
      eyebrow: 'शुभ एवं सावधानी के समय',
      title: 'आज के मुहूर्त',
      metrics: [
        { label: 'अभिजीत मुहूर्त', value: value(p.abhijit), accent: true },
        { label: 'अमृत चौघड़िया', value: value(p.amrit_choghadiya) },
        { label: 'शुभ चौघड़िया', value: value(p.shubh_choghadiya) },
        { label: 'राहुकाल', value: value(p.rahu_kaal) },
      ],
    },
    {
      eyebrow: 'पवित्र पंचांग 365',
      title: 'आपका दिन मंगलमय हो',
      subtitle: 'सकारात्मकता, शांति और सद्भाव के साथ दिन की शुरुआत करें।',
      hero: true,
    },
  ];

  const sceneProgress = [0, 0.13, 0.32, 0.51, 0.70, 0.90];
  const sceneSpan = 0.13;
  const sceneFrames = scenes.map((scene, index) => {
    const start = Math.round(durationInFrames * sceneProgress[index]);
    const end = index === scenes.length - 1
      ? durationInFrames
      : Math.round(durationInFrames * (sceneProgress[index] + sceneSpan));
    const fade = 12;
    const opacity = interpolate(
      frame,
      [start, start + fade, Math.max(start + fade + 1, end - fade), end],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    return { scene, start, end, opacity };
  });

  const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: 'clamp',
  });
  const glow = 0.78 + Math.sin(frame / 18) * 0.12;

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 30%, #762638 0%, #3c101d 48%, #10050b 100%)',
        fontFamily: 'Noto Sans Devanagari, sans-serif',
      }}
    >
      <Audio src={staticFile('devotional_ambient.wav')} volume={0.10} loop />
      <Audio src={staticFile(props.narrationFile || 'narration.wav')} volume={1} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 42%, rgba(244,202,114,${glow * 0.13}), transparent 43%)`,
        }}
      />
      <Mandala frame={frame} />
      <div
        style={{
          position: 'absolute',
          inset: 14,
          border: '5px double rgba(244,202,114,.78)',
          borderRadius: 28,
          boxShadow: 'inset 0 0 55px rgba(244,202,114,.09)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'absolute', top: 35, left: 0, right: 0, textAlign: 'center', fontSize: 62, opacity: 0.92 }}>
        🪔
      </div>
      {sceneFrames.map(({ scene, start, opacity }) => (
        <AbsoluteFill key={scene.eyebrow} style={{ opacity }}>
          <SceneView
            scene={scene}
            frame={frame - start}
            brand={brand}
            date={date}
            footer={footer}
          />
        </AbsoluteFill>
      ))}
      <div
        style={{
          position: 'absolute',
          left: 18,
          right: 18,
          bottom: 17,
          height: 7,
          borderRadius: 10,
          background: 'rgba(255,244,220,.18)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg,#f4ca72,#fff0c9,#b76a36)',
            boxShadow: '0 0 18px rgba(244,202,114,.75)',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
