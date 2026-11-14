import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {loadFont as loadRozha} from '@remotion/google-fonts/RozhaOne';
import {loadFont as loadNotoSans} from '@remotion/google-fonts/NotoSansDevanagari';

const {fontFamily: headFont} = loadRozha();
const {fontFamily: bodyFont} = loadNotoSans();

const GOLD = '#fde047';
const GOLD_SOFT = '#fff8db';
const MAROON = 'rgba(78, 9, 18, 0.88)';
const GOOD = '#86efac';
const WARN = '#fca5a5';
const DAYS = ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'];

export type WeeklyCard = {label: string; value: string; sub?: string; tone?: 'good' | 'warn'};
export type WeeklyScene = {
  id: string;
  kind: 'intro' | 'day' | 'summary' | 'outro';
  frames: number;
  display: Record<string, any>;
};
export type WeeklyGuideProps = {
  scenes: WeeklyScene[];
  narrationFile?: string;
  totalFrames?: number;
  channelName?: string;
};

const FADE = 14;

const SceneFrame: React.FC<{frames: number; children: React.ReactNode}> = ({frames, children}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, FADE, frames - FADE, frames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lift = interpolate(frame, [0, FADE * 2], [24, 0], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity, transform: `translateY(${lift}px)`}}>{children}</AbsoluteFill>;
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 180) * 6;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + drift}% 35%, #5a1020 0%, #2a0810 48%, #12040a 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 85% 12%, rgba(253,224,71,0.16), transparent 38%)',
        }}
      />
    </AbsoluteFill>
  );
};

const TopBar: React.FC<{channelName: string; range?: string}> = ({channelName, range}) => (
  <div
    style={{
      position: 'absolute', top: 36, left: 64, right: 64, display: 'flex',
      justifyContent: 'space-between', alignItems: 'center', fontFamily: bodyFont,
      color: GOLD_SOFT, fontSize: 30, letterSpacing: 1,
    }}
  >
    <span style={{fontFamily: headFont, color: GOLD, fontSize: 36}}>{channelName}</span>
    <span>{range || ''}</span>
  </div>
);

const WeekTracker: React.FC<{active: number}> = ({active}) => (
  <div style={{position: 'absolute', bottom: 38, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 22}}>
    {DAYS.map((label, i) => (
      <div
        key={label}
        style={{
          width: 92, height: 46, borderRadius: 23, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: bodyFont, fontSize: 26, fontWeight: 700,
          background: i === active ? GOLD : 'rgba(255,255,255,0.10)',
          color: i === active ? '#4a0a14' : GOLD_SOFT,
        }}
      >
        {label}
      </div>
    ))}
  </div>
);

const Intro: React.FC<{display: Record<string, any>}> = ({display}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont, textAlign: 'center'}}>
    <div style={{fontFamily: headFont, color: GOLD, fontSize: 150, lineHeight: 1.1}}>साप्ताहिक पंचांग</div>
    <div style={{color: GOLD_SOFT, fontSize: 70, marginTop: 18}}>{display.range}</div>
    {display.highlight ? (
      <div
        style={{
          marginTop: 48, padding: '16px 44px', borderRadius: 60, background: GOLD, color: '#4a0a14',
          fontSize: 46, fontWeight: 800,
        }}
      >
        {display.highlight}
      </div>
    ) : null}
    <div style={{color: GOLD_SOFT, fontSize: 36, marginTop: 40, opacity: 0.85}}>समय: {display.place} के अनुसार</div>
  </AbsoluteFill>
);

const DayScene: React.FC<{display: Record<string, any>}> = ({display}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cards: WeeklyCard[] = display.cards || [];
  return (
    <AbsoluteFill style={{fontFamily: bodyFont}}>
      <div style={{position: 'absolute', left: 80, top: 150, width: 640}}>
        <div style={{fontFamily: headFont, color: GOLD, fontSize: 132, lineHeight: 1.05}}>{display.weekday}</div>
        <div style={{color: GOLD_SOFT, fontSize: 52, marginTop: 14}}>{display.date}</div>
        <div style={{color: GOLD_SOFT, fontSize: 40, marginTop: 10, opacity: 0.85}}>
          {display.month} मास · {display.paksha}
        </div>
        {display.banner ? (
          <div
            style={{
              marginTop: 40, padding: '18px 30px', borderRadius: 24, background: GOLD, color: '#4a0a14',
              fontSize: 42, fontWeight: 800, lineHeight: 1.25,
            }}
          >
            {display.banner}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: 'absolute', right: 70, top: 150, width: 1040, display: 'grid',
          gridTemplateColumns: '1fr 1fr', gap: 26,
        }}
      >
        {cards.map((card, i) => {
          const pop = spring({frame: frame - 10 - i * 7, fps, config: {damping: 16, stiffness: 140}});
          const tint = card.tone === 'good' ? GOOD : card.tone === 'warn' ? WARN : GOLD;
          return (
            <div
              key={card.label}
              style={{
                background: MAROON, borderRadius: 26, padding: '26px 32px', minHeight: 205,
                border: `2px solid ${tint}55`, transform: `scale(${0.9 + 0.1 * pop})`, opacity: pop,
              }}
            >
              <div style={{color: tint, fontSize: 32, fontWeight: 700}}>{card.label}</div>
              <div style={{color: '#fff', fontSize: 52, fontWeight: 800, marginTop: 8, lineHeight: 1.2}}>{card.value}</div>
              {card.sub ? <div style={{color: GOLD_SOFT, fontSize: 30, marginTop: 6, opacity: 0.9}}>{card.sub}</div> : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Summary: React.FC<{display: Record<string, any>}> = ({display}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const items: Array<{weekday: string; date: string; label: string}> = display.items || [];
  return (
    <AbsoluteFill style={{fontFamily: bodyFont, padding: '150px 140px 100px'}}>
      <div style={{fontFamily: headFont, color: GOLD, fontSize: 96}}>इस हफ्ते की खास तिथियां</div>
      <div style={{marginTop: 40, display: 'flex', flexDirection: 'column', gap: 22}}>
        {items.length === 0 ? (
          <div style={{color: GOLD_SOFT, fontSize: 52}}>इस हफ्ते कोई बड़ा व्रत या त्योहार नहीं।</div>
        ) : (
          items.map((item, i) => {
            const pop = spring({frame: frame - 8 - i * 9, fps, config: {damping: 18, stiffness: 120}});
            return (
              <div
                key={`${item.date}-${item.label}`}
                style={{
                  background: MAROON, borderRadius: 22, padding: '18px 32px', display: 'flex', gap: 34,
                  alignItems: 'center', opacity: pop, transform: `translateX(${(1 - pop) * 60}px)`,
                }}
              >
                <span style={{color: GOLD, fontSize: 46, fontWeight: 800, minWidth: 250}}>{item.weekday}</span>
                <span style={{color: GOLD_SOFT, fontSize: 38, minWidth: 260}}>{item.date}</span>
                <span style={{color: '#fff', fontSize: 46, fontWeight: 700}}>{item.label}</span>
              </div>
            );
          })
        )}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{display: Record<string, any>}> = () => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: bodyFont, textAlign: 'center'}}>
    <div style={{fontFamily: headFont, color: GOLD, fontSize: 120}}>शुभ सप्ताह!</div>
    <div
      style={{
        marginTop: 50, padding: '20px 64px', borderRadius: 70, background: '#dc2626', color: '#fff',
        fontSize: 56, fontWeight: 800,
      }}
    >
      सब्सक्राइब करें
    </div>
    <div style={{color: GOLD_SOFT, fontSize: 44, marginTop: 44}}>रोज़ सुबह और शाम नया पंचांग</div>
    <div style={{color: GOLD_SOFT, fontSize: 38, marginTop: 18, opacity: 0.85}}>अपना शहर कमेंट में लिखिए</div>
  </AbsoluteFill>
);

export const WeeklyGuide: React.FC<WeeklyGuideProps> = ({scenes, narrationFile, channelName = 'पवित्र पंचांग 365'}) => {
  let cursor = 0;
  const range = scenes.find((s) => s.kind === 'intro')?.display?.range as string | undefined;
  return (
    <AbsoluteFill>
      <Background />
      <TopBar channelName={channelName} range={range} />
      {scenes.map((scene) => {
        const from = cursor;
        cursor += scene.frames;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={scene.frames}>
            <SceneFrame frames={scene.frames}>
              {scene.kind === 'intro' && <Intro display={scene.display} />}
              {scene.kind === 'day' && <DayScene display={scene.display} />}
              {scene.kind === 'summary' && <Summary display={scene.display} />}
              {scene.kind === 'outro' && <Outro display={scene.display} />}
              {scene.kind === 'day' && <WeekTracker active={Number(scene.display.index ?? 0)} />}
            </SceneFrame>
          </Sequence>
        );
      })}
      {narrationFile ? <Audio src={staticFile(narrationFile)} /> : null}
    </AbsoluteFill>
  );
};
