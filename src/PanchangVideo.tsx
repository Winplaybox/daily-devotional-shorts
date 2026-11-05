import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

type Props = {religion?: string; title?: string; dateDisplay?: string; footer?: string; panchang_raw?: Record<string, any>; narrationFile?: string; [key: string]: any};
type Row = {label: string; value: string; tone?: 'good' | 'bad'};
type Panel = {heading: string; title: string; subtitle?: string; rows: Row[]};

const GOLD = '#f6d78b';
const WHITE = '#fff4df';
const MUTED = '#e9c99a';
const safe = (v: unknown, fallback = '—'): string => v === undefined || v === null || v === '' ? fallback : String(v);
const arr = (v: unknown): any[] => Array.isArray(v) ? v : [];
const row = (label: string, v: unknown, tone?: Row['tone']): Row => ({label, value: safe(v), tone});
const timeRange = (v: any): string => v && typeof v === 'object' ? safe(v.start) + ' – ' + safe(v.end) : safe(v);
const dateLabel = (p: any, fallback: string): string => {
  const d = p.date_meta?.gregorian_date;
  if (!d) return fallback || safe(p.date_display, 'आज का पंचांग');
  const a = d.split('-');
  return a.length === 3 ? a[2] + '-' + a[1] + '-' + a[0] : d;
};

const Divider: React.FC<{width?: number}> = ({width = 540}) => (
  <Img src={staticFile('assets/lotus-divider.svg')} style={{width, height: width * 0.122, objectFit: 'contain', margin: '0 auto'}} />
);

const HeadingBanner: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{
    minWidth: 500, maxWidth: 760, padding: '12px 28px', textAlign: 'center',
    color: GOLD, fontSize: 34, fontWeight: 900, lineHeight: 1.2,
    background: 'linear-gradient(110deg,rgba(107,15,25,.98),rgba(45,5,12,.98) 50%,rgba(107,15,25,.98))',
    border: '2px solid #e9bd60', borderRadius: 22,
    boxShadow: '0 7px 18px rgba(0,0,0,.65),inset 0 1px 5px rgba(255,238,185,.25),0 0 0 4px rgba(213,158,62,.12)',
    textShadow: '0 3px 7px rgba(0,0,0,.9)',
  }}>{children}</div>
);

const DataRow: React.FC<{item: Row; index: number; frame: number; compact: boolean}> = ({item,index,frame,compact}) => {
  const opacity = interpolate(frame - index * 2, [0, 9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{
    opacity, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
    padding: compact ? '8px 17px' : '12px 20px',
    borderBottom: '1px solid rgba(239,190,92,.25)',
    background: index % 2 ? 'rgba(255,221,160,.035)' : 'rgba(20,2,7,.12)',
  }}>
    <div style={{color: GOLD, fontSize: compact ? 22 : 26, fontWeight: 750, flex: '0 0 40%', textShadow: '0 2px 5px #000'}}>{item.label}</div>
    <div style={{
      color: item.tone === 'bad' ? '#ffd1c4' : item.tone === 'good' ? '#d9efb9' : WHITE,
      fontSize: compact ? 22 : 26, fontWeight: 800, flex: 1, textAlign: 'right', lineHeight: 1.25,
      overflowWrap: 'anywhere', textShadow: '0 2px 5px #000',
    }}>{item.value}</div>
  </div>;
};

const PanelView: React.FC<{panel: Panel; frame: number; brand: string; date: string; footer: string}> = ({panel,frame,brand,date,footer}) => {
  const enter = interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const compact = panel.rows.length > 6;
  return <AbsoluteFill style={{padding: '158px 112px 138px', justifyContent: 'center', gap: 14}}>
    <div style={{opacity: enter, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7}}>
      <div style={{color: GOLD, fontSize: 21, fontWeight: 800, letterSpacing: 3, textShadow: '0 2px 8px #000'}}>॥ {brand} ॥</div>
      <HeadingBanner>{panel.heading}</HeadingBanner>
      <div style={{color: WHITE, fontSize: 49, fontWeight: 900, lineHeight: 1.16, textShadow: '0 4px 9px #000'}}>{panel.title}</div>
      {panel.subtitle ? <div style={{color: MUTED, fontSize: 24, fontWeight: 650}}>{panel.subtitle}</div> : null}
      <Divider />
      <div style={{color: GOLD, fontSize: 23, fontWeight: 700}}>{date}</div>
    </div>
    <div style={{
      border: '2px solid rgba(231,185,91,.95)', borderRadius: 24, background: 'linear-gradient(145deg,rgba(111,24,26,.96),rgba(43,6,12,.98))',
      overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,.72),inset 0 1px 8px rgba(255,231,170,.16),0 0 0 5px rgba(214,161,70,.12)',
    }}>
      {panel.rows.map((item,i) => <DataRow key={item.label + i} item={item} index={i} frame={frame} compact={compact}/>)}
    </div>
    <div style={{color: MUTED, fontSize: 18, textAlign: 'center', lineHeight: 1.3, textShadow: '0 2px 7px #000'}}>{footer}</div>
  </AbsoluteFill>;
};

const createPanels = (p: any, props: Props, brand: string, date: string): Panel[] => {
  const m = p.date_meta || {}, e = p.card_1_essence || {}, n = p.card_2_nature || {};
  const mu = p.card_3_muhurat || {}, c = p.card_4_cultural || {}, j = p.card_5_jyotish || {};
  const good = arr(mu.auspicious), bad = arr(mu.inauspicious), festivals = arr(c.festivals), yogas = arr(c.special_yogas), grahas = arr(j.graha_sthiti);
  const structured = Boolean(p.date_meta || p.card_1_essence || p.card_2_nature || p.card_3_muhurat || p.card_4_cultural || p.card_5_jyotish);
  const panels: Panel[] = [{
    heading: '॥ दैनिक पंचांग ॥', title: props.title || 'आज का पंचांग',
    subtitle: date + '  •  ' + safe(m.day_of_week || p.weekday),
    rows: [
      row('विक्रम संवत', m.vikram_samvat ?? p.vikram_samvat), row('शक संवत', m.shaka_samvat ?? p.shaka_samvat),
      row('अयन', m.ayana ?? p.ayana), row('ऋतु', m.ritu ?? p.ritu),
      row('मास', m.month_amanta || p.hindu_month), row('पक्ष', m.paksha || p.paksha),
    ],
  }];
  if (structured) {
    panels.push({
      heading: 'आज का पंचांग', title: e.title || 'तिथि एवं नक्षत्र', subtitle: 'तिथि • नक्षत्र • योग • करण • राशि',
      rows: [
        row('तिथि', e.tithi?.name || p.tithi_name), row('तिथि समाप्त', e.tithi?.ends_at),
        row('महत्व', e.tithi?.significance), row('नक्षत्र', e.nakshatra?.name || p.nakshatra_name),
        row('नक्षत्र स्वामी', e.nakshatra?.lord), row('नक्षत्र समाप्त', e.nakshatra?.ends_at),
        row('योग', e.yoga?.name || p.yoga_name), row('योग समाप्त', e.yoga?.ends_at),
        row('करण', [e.karana?.first,e.karana?.second].filter(Boolean).join(' / ') || p.karana_name),
        row('सूर्य / चंद्र राशि', [e.rashi?.sun_sign,e.rashi?.moon_sign].filter(Boolean).join(' / ')),
      ],
    });
    panels.push({
      heading: 'समय एवं प्रकृति', title: n.title || 'सूर्य और चंद्र समय', subtitle: 'सूर्योदय • सूर्यास्त • चन्द्रोदय • चन्द्रास्त',
      rows: [
        row('सूर्योदय', n.solar?.sunrise || p.sunrise), row('सूर्यास्त', n.solar?.sunset || p.sunset),
        row('चन्द्रोदय', n.lunar?.moonrise || p.moonrise), row('चन्द्रास्त', n.lunar?.moonset || p.moonset),
        row('दिन की अवधि', n.durations?.day_length), row('रात्रि की अवधि', n.durations?.night_length), row('अयनांश', n.ayanamsa),
      ],
    });
    panels.push({
      heading: 'शुभ एवं अशुभ काल', title: mu.title || 'मुहूर्त एवं समय', subtitle: 'शुभ मुहूर्त और सावधानी के समय',
      rows: [
        ...good.map((x:any) => row(x.name,timeRange(x),'good')),
        ...bad.map((x:any) => row(x.name,timeRange(x),'bad')),
        ...(!good.length && !bad.length ? [row('अभिजीत मुहूर्त',p.abhijit,'good'),row('ब्रह्म मुहूर्त',p.brahma,'good'),row('राहुकाल',p.rahu_kaal,'bad'),row('यमगण्ड',p.yamaganda,'bad'),row('गुलिक काल',p.gulika,'bad')] : []),
      ],
    });
    panels.push({
      heading: 'पर्व एवं व्रत', title: c.title || 'आज के विशेष पर्व',
      subtitle: c.is_fasting_day ? 'आज व्रत का दिन है' : 'पर्व • व्रत • विशेष योग',
      rows: [
        row('व्रत',c.is_fasting_day ? (c.fast_type || 'हाँ') : 'नहीं'),
        ...festivals.map((x:any) => row(x.name,x.description || 'विशेष पर्व')),
        ...yogas.map((x:string,i:number) => row('विशेष योग ' + (i+1),x,'good')),
        ...(!festivals.length && !yogas.length ? [row('आज का पर्व',props.title)] : []),
      ],
    });
    panels.push({
      heading: 'ग्रह स्थिति', title: j.title || 'ग्रहों की स्थिति', subtitle: 'ग्रह • राशि • अंश',
      rows: [
        ...grahas.map((x:any) => row(x.planet,safe(x.sign) + ' • ' + safe(x.degree))),
        row('वर्तमान चौघड़िया',j.current_choghadiya,'good'),
      ],
    });
  } else {
    panels.push({
      heading: 'आज का पंचांग', title: safe(p.tithi_name,'तिथि विवरण'), subtitle: safe(p.nakshatra_name,'नक्षत्र विवरण'),
      rows: [row('पक्ष',p.paksha),row('हिंदू मास',p.hindu_month),row('विक्रम संवत',p.vikram_samvat),row('शक संवत',p.shaka_samvat),row('नक्षत्र',p.nakshatra_name),row('योग',p.yoga_name),row('करण',p.karana_name)],
    });
    panels.push({
      heading: 'समय एवं प्रकृति', title: 'सूर्य और चंद्र समय',
      rows: [row('सूर्योदय',p.sunrise),row('सूर्यास्त',p.sunset),row('चन्द्रोदय',p.moonrise),row('चन्द्रास्त',p.moonset),row('ब्रह्म मुहूर्त',p.brahma),row('गोधूलि',p.godhuli)],
    });
    panels.push({
      heading: 'शुभ एवं अशुभ काल', title: 'मुहूर्त एवं चौघड़िया',
      rows: [row('अभिजीत मुहूर्त',p.abhijit,'good'),row('अमृत चौघड़िया',p.amrit_choghadiya,'good'),row('शुभ चौघड़िया',p.shubh_choghadiya,'good'),row('राहुकाल',p.rahu_kaal,'bad'),row('यमगण्ड',p.yamaganda,'bad'),row('गुलिक काल',p.gulika,'bad')],
    });
  }
  panels.push({
    heading: '॥ पवित्र पंचांग 365 ॥', title: 'आपका दिन मंगलमय हो', subtitle: 'दैनिक पंचांग • शुभ मुहूर्त • चौघड़िया',
    rows: [row('आज की तिथि',e.tithi?.name || p.tithi_name),row('आज का नक्षत्र',e.nakshatra?.name || p.nakshatra_name),row('कल फिर मिलेंगे','नए दैनिक पंचांग के साथ','good')],
  });
  return panels;
};

export const PanchangVideo: React.FC<Props> = (props) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const p = props.panchang_raw || {};
  const brand = props.religion || 'PAVITRA PANCHANG 365';
  const date = dateLabel(p,props.dateDisplay || '');
  const footer = 'गणना स्थान: ' + safe(p.location_name || props.locationName,'उज्जैन') + ' • ' + safe(p.timezone_label || props.timezoneLabel,'IST') + ' • ' + safe(props.footer,'स्थानीय समय में अंतर संभव');
  const panels = createPanels(p,props,brand,date);
  const progress = interpolate(frame,[0,durationInFrames],[0,100],{extrapolateRight:'clamp'});
  const glow = 0.08 + Math.sin(frame / 23) * 0.012;
  return <AbsoluteFill style={{overflow:'hidden',background:'#21050b',fontFamily:'Noto Sans Devanagari, sans-serif'}}>
    <Audio src={staticFile('devotional_ambient.wav')} volume={0.10} loop/>
    <Audio src={staticFile(props.narrationFile || 'narration.wav')} volume={1}/>
    <Img src={staticFile('assets/oxblood-mandala.svg')} style={{position:'absolute',width:'100%',height:'100%',objectFit:'cover',opacity:.96}}/>
    <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 48%,rgba(35,3,5,.58),rgba(35,3,5,.72) 68%,rgba(15,1,4,.84))'}}/>
    <AbsoluteFill style={{background:'radial-gradient(circle at 50% 38%,rgba(255,184,74,'+glow+'),transparent 52%)'}}/>
    <Img src={staticFile('assets/lotus-filigree-frame.svg')} style={{position:'absolute',width:'100%',height:'100%',objectFit:'fill',opacity:.96,pointerEvents:'none'}}/>
    <div style={{position:'absolute',top:44,left:86,right:86,display:'flex',justifyContent:'space-between',fontSize:38,color:GOLD,textShadow:'0 3px 9px #000'}}><span>🪔</span><span>🪔</span></div>
    {panels.map((panel,index) => {
      const start = Math.round(durationInFrames * index / panels.length);
      const end = Math.round(durationInFrames * (index+1) / panels.length);
      const opacity = interpolate(frame,[start,start+9,end-9,end],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
      return <AbsoluteFill key={panel.heading+index} style={{opacity}}>
        <PanelView panel={panel} frame={frame-start} brand={brand} date={date} footer={footer}/>
      </AbsoluteFill>;
    })}
    <div style={{position:'absolute',left:92,right:92,bottom:65,height:6,borderRadius:8,background:'rgba(255,244,220,.2)',overflow:'hidden',boxShadow:'0 2px 8px #000'}}>
      <div style={{width:progress+'%',height:'100%',background:'linear-gradient(90deg,#b87922,#fff0a0,#d99b3b)',boxShadow:'0 0 16px rgba(244,202,114,.8)'}}/>
    </div>
  </AbsoluteFill>;
};
