import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  Audio,
} from 'remotion';
import { SacredVectorBackground } from './components/SacredVectorBackground';

export interface PanchangProps {
  theme?: string;
  bgImageUrl?: string;
  religion: string;
  title: string;
  dateDisplay: string;
  label1: string;
  val1: string;
  label2: string;
  val2: string;
  label3: string;
  val3: string;
  footer: string;
}

export const PanchangShort: React.FC<PanchangProps> = ({
  theme = 'temple',
  bgImageUrl, religion, title, dateDisplay, label1, val1,
  label2, val2, label3, val3, footer,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const titleSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const titleY = interpolate(titleSpring, [0, 1], [-80, 0]);
  const card1Spring = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const card2Spring = spring({ frame: frame - 24, fps, config: { damping: 14 } });
  const card3Spring = spring({ frame: frame - 36, fps, config: { damping: 14 } });
  const progressWidth = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: 'clamp',
  });

  const cardStyle: React.CSSProperties = {
    background: 'rgba(15, 12, 18, 0.86)',
    border: '2px solid rgba(255, 215, 0, 0.45)',
    backdropFilter: 'blur(16px)',
    borderRadius: '26px',
    padding: '22px 30px',
    textAlign: 'center',
    boxShadow: '0 12px 35px rgba(0,0,0,0.7)',
  };

  return (
    <AbsoluteFill style={{
      backgroundColor: '#0a0806', overflow: 'hidden',
      fontFamily: "'Noto Sans Devanagari', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800;900&display=swap');
      `}</style>
      {/* Devotional Ambient Audio */}
      <Audio src={staticFile('devotional_ambient.wav')} volume={0.6} />
      {/* Dynamic Animated Vector Sacred Visual Background */}
      <SacredVectorBackground theme={theme} bgImageUrl={bgImageUrl} />
      <AbsoluteFill style={{
        padding: '70px 45px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          transform: `translateY(${titleY}px)`, opacity: titleSpring,
          textAlign: 'center', marginTop: '35px',
        }}>
          <div style={{
            fontSize: '26px', letterSpacing: '5px', color: '#ffb703',
            background: 'rgba(0, 0, 0, 0.7)', padding: '8px 30px',
            borderRadius: '50px', border: '1.5px solid rgba(255, 183, 3, 0.6)',
            display: 'inline-block', marginBottom: '18px', fontWeight: 'bold',
          }}>{religion}</div>
          <h1 style={{
            fontSize: '84px', color: '#fff3b0', lineHeight: 1.15,
            textShadow: '0 4px 25px rgba(0,0,0,0.9), 0 0 35px rgba(255, 183, 3, 0.8)',
            margin: '0 0 16px 0', fontWeight: 900,
          }}>{title}</h1>
          <div style={{
            fontSize: '40px', color: '#ffffff',
            background: 'linear-gradient(90deg, #d90429, #ef233c)',
            padding: '12px 40px', borderRadius: '40px',
            border: '2px solid #ffd166', boxShadow: '0 8px 30px rgba(239, 35, 60, 0.6)',
            display: 'inline-block', fontWeight: 800,
          }}>{dateDisplay}</div>
        </div>

        <div style={{ width: '94%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ ...cardStyle, transform: `scale(${card1Spring})`, opacity: card1Spring }}>
            <div style={{ fontSize: '30px', color: '#ffb703', fontWeight: 600 }}>{label1}</div>
            <div style={{ fontSize: '42px', color: '#ffffff', fontWeight: 800 }}>{val1}</div>
          </div>
          <div style={{ ...cardStyle, transform: `scale(${card2Spring})`, opacity: card2Spring }}>
            <div style={{ fontSize: '30px', color: '#ffb703', fontWeight: 600 }}>{label2}</div>
            <div style={{ fontSize: '42px', color: '#ffffff', fontWeight: 800 }}>{val2}</div>
          </div>
          <div style={{
            ...cardStyle, transform: `scale(${card3Spring})`, opacity: card3Spring,
            background: 'linear-gradient(135deg, rgba(239, 35, 60, 0.4), rgba(22, 18, 24, 0.92))',
            border: '2.5px solid #ffb703',
            boxShadow: '0 12px 40px rgba(255, 183, 3, 0.35)',
          }}>
            <div style={{ fontSize: '32px', color: '#ffd166', fontWeight: 700 }}>{label3}</div>
            <div style={{ fontSize: '46px', color: '#ffffff', fontWeight: 900 }}>{val3}</div>
          </div>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.75)', border: '1.5px solid #ffd166',
          borderRadius: '50px', padding: '14px 45px', fontSize: '32px',
          color: '#ffd166', marginBottom: '20px', fontWeight: 700,
        }}>{footer}</div>
      </AbsoluteFill>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: '10px',
        width: `${progressWidth}%`,
        background: 'linear-gradient(90deg, #ffb703, #ef233c)',
        boxShadow: '0 0 15px rgba(255, 183, 3, 0.8)',
      }} />
    </AbsoluteFill>
  );
};
