import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate} from 'remotion';

type Props = {
  religion?: string; title?: string; dateDisplay?: string; footer?: string;
  panchang_raw?: Record<string, any>; narrationFile?: string; [key: string]: any;
};
const gold = '#f8d36f';
const cream = '#fff1c8';
const rawValue = (v: any, fallback = '—') => v === undefined || v === null || v === '' ? fallback : String(v);

const Bell: React.FC<{left:string; top:number; phase:number; frame:number}> = ({left,top,phase,frame}) => {
  const angle = Math.sin((frame + phase) / 18) * 2.2;
  return <div style={{position:'absolute',left,top,transformOrigin:'50% 0',transform:`rotate(${angle}deg)`,fontSize:58,filter:'drop-shadow(0 4px 8px #0009)'}}>🔔</div>;
};
const Diya: React.FC<{left?:string; right?:string; bottom:number; frame:number; phase:number}> = ({left,right,bottom,frame,phase}) => {
  const flicker = 0.82 + 0.18 * Math.sin((frame + phase) / 5);
  const scale = 0.96 + 0.05 * Math.sin((frame + phase) / 7);
  return <div style={{position:'absolute',left,right,bottom,width:112,textAlign:'center',filter:'drop-shadow(0 0 16px #ff9b24)'}}>
    <div style={{fontSize:62,opacity:flicker,transform:`scale(${scale})`,transformOrigin:'bottom center'}}>🔥</div>
    <div style={{fontSize:58,marginTop:-30}}>🪔</div>
  </div>;
};
const Card: React.FC<{children:React.ReactNode; style?:React.CSSProperties}> = ({children,style}) => <div style={{background:'linear-gradient(110deg,#fff0c8,#ffe4a2 50%,#fff0c8)',border:'3px solid #d99b28',borderRadius:20,boxShadow:'0 5px 0 #5a170e, inset 0 0 0 2px #fff8d9',color:'#42100d',padding:'13px 18px',...style}}>{children}</div>;
const Label: React.FC<{children:React.ReactNode}> = ({children}) => <div style={{fontSize:24,fontWeight:900,color:'#8b390c',textAlign:'center'}}>{children}</div>;
const Value: React.FC<{children:React.ReactNode; size?:number}> = ({children,size=30}) => <div style={{fontSize:size,fontWeight:900,color:'#42100d',textAlign:'center',lineHeight:1.16}}>{children}</div>;

export const PanchangVideo: React.FC<Props> = (props) => {
  const frame = useCurrentFrame();
  const p = props.panchang_raw || {};
  const date = props.dateDisplay || p.date_display || '';
  const brand = props.religion || 'PAVITRA PANCHANG 365';
  const tithi = rawValue(p.tithi_name);
  const month = rawValue(p.hindu_month);
  const paksha = rawValue(p.paksha);
  const sunrise = rawValue(p.sunrise);
  const sunset = rawValue(p.sunset);
  const moonrise = rawValue(p.moonrise, 'उपलब्ध नहीं');
  const moonset = rawValue(p.moonset, 'उपलब्ध नहीं');
  const flowers = Array.from({length:9},(_,i)=>({
    left: (8 + ((i*13)%84))+'%',
    y: 220 + ((i*167)%1380),
    drift: Math.sin((frame/35)+(i*1.7))*13,
    opacity: 0.25 + 0.35*(0.5+0.5*Math.sin(frame/22+i))
  }));
  return <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 20%,#761729 0%,#3a0712 55%,#17030a 100%)',fontFamily:'Noto Sans Devanagari, sans-serif',padding:'24px 34px',overflow:'hidden'}}>
    <Audio src={staticFile('devotional_ambient.wav')} volume={0.10} loop/>
    <Audio src={staticFile(props.narrationFile || 'narration.wav')} volume={1} />
    <div style={{position:'absolute',inset:12,border:'8px double #dba73d',borderRadius:22,pointerEvents:'none',boxShadow:'inset 0 0 30px #f8bd4a55'}}/>
    <div style={{position:'absolute',top:25,left:'50%',transform:'translateX(-50%)',width:180,height:180,borderRadius:'50%',background:'radial-gradient(circle,#ffca54aa 0%,#ff9f1a22 45%,transparent 72%)',filter:'blur(4px)'}}/>
    <div style={{position:'absolute',top:25,left:0,right:0,textAlign:'center',fontSize:86,filter:'drop-shadow(0 4px 8px #000)'}}>🙏</div>
    <Bell left="8%" top={28} phase={0} frame={frame}/><Bell left="82%" top={28} phase={9} frame={frame}/>
    {flowers.map((f,i)=><div key={i} style={{position:'absolute',left:f.left,top:f.y+f.drift,color:'#ffbd4a',fontSize:20,opacity:f.opacity,pointerEvents:'none'}}>✦</div>)}
    <div style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column',gap:12,height:'100%'}}>
      <div style={{textAlign:'center',paddingTop:92}}>
        <div style={{display:'inline-block',padding:'8px 34px',border:'2px solid #e8b64c',borderRadius:40,color:gold,fontSize:23,fontWeight:900,letterSpacing:3,background:'#350711'}}>🕉️ {brand}</div>
        <div style={{fontSize:70,lineHeight:1.05,fontWeight:1000,color:'#ffe18b',textShadow:'0 4px 0 #7a3009,0 8px 18px #000',marginTop:10}}>दैनिक पंचांग</div>
        <div style={{display:'inline-block',marginTop:10,padding:'8px 32px',borderRadius:40,background:'linear-gradient(#ffe4a0,#d58b22)',border:'3px solid #fff0b4',color:'#64190d',fontSize:32,fontWeight:1000}}>आज का पंचांग</div>
        <div style={{marginTop:12,padding:'10px 20px',borderRadius:50,background:'linear-gradient(#fff5dc,#f4d39a)',border:'3px solid #d89c2e',color:'#7b1b16',fontSize:35,fontWeight:1000}}>{date}</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,background:'linear-gradient(90deg,#65101a,#300610)',border:'3px solid #d9a13c',borderRadius:18,padding:12}}>
        {[['विक्रम संवत',rawValue(p.vikram_samvat,'2083')],['शक संवत',rawValue(p.shaka_samvat,'1948')],['मास',month],['पक्ष',paksha]].map(([l,v])=><div key={l} style={{textAlign:'center',borderRight:l==='पक्ष'?'none':'1px solid #e9b54d'}}><div style={{fontSize:21,color:gold,fontWeight:900}}>{l}</div><div style={{fontSize:25,color:'white',fontWeight:900}}>{v}</div></div>)}
      </div>
      <Card style={{display:'grid',gridTemplateColumns:'1fr 1fr',alignItems:'center',gap:12}}>
        <div><Label>तिथि</Label><Value size={38}>{tithi}</Value></div>
        <div style={{borderLeft:'2px solid #b87924',paddingLeft:14}}><Label>पक्ष</Label><Value size={29}>{paksha}</Value><Label>वार</Label><Value size={25}>{rawValue(p.weekday, '—')}</Value></div>
      </Card>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
        {[['✦ नक्षत्र',rawValue(p.nakshatra_name)],['☸ योग',rawValue(p.yoga_name)],['त्रिशूल करण',rawValue(p.karana_name)]].map(([l,v])=><div key={l} style={{background:'linear-gradient(145deg,#64101c,#280711)',border:'2px solid #e4ae3f',borderRadius:18,padding:'12px 6px',textAlign:'center'}}><div style={{color:gold,fontSize:22,fontWeight:900}}>{l}</div><div style={{color:cream,fontSize:27,fontWeight:900}}>{v}</div></div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:5,background:'linear-gradient(120deg,#32233c,#171020)',border:'2px solid #dca63d',borderRadius:18,padding:12}}>
        {[['☀️ सूर्योदय',sunrise],['🌇 सूर्यास्त',sunset],['🌅 ब्रह्म मुहूर्त',rawValue(p.brahma)],['🌆 गोधूलि',rawValue(p.godhuli)]].map(([l,v])=><div key={l} style={{textAlign:'center',borderRight:l==='🌘 चंद्रास्त'?'none':'1px solid #b88c50'}}><div style={{fontSize:19,color:gold,fontWeight:900}}>{l}</div><div style={{fontSize:23,color:'white',fontWeight:900}}>{v}</div></div>)}
      </div>
      <div style={{textAlign:'center',background:'linear-gradient(90deg,#135b20,#0b3515)',border:'3px solid #d9b44e',borderRadius:28,color:'#fff0a5',fontSize:30,fontWeight:1000,padding:'5px 12px',marginTop:2}}>शुभ मुहूर्त</div>
      <Card style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div><Label>🌼 अभिजीत मुहूर्त</Label><Value size={25}>{rawValue(p.abhijit)}</Value></div>
        <div style={{borderLeft:'2px solid #b87924',paddingLeft:10}}><Label>🌅 ब्रह्म मुहूर्त</Label><Value size={25}>{rawValue(p.brahma)}</Value></div>
      </Card>
      <div style={{textAlign:'center',background:'linear-gradient(90deg,#6d0f20,#360712)',border:'2px solid #d9a13c',borderRadius:24,color:'#ffe2a0',fontSize:26,fontWeight:1000,padding:'5px'}}>वर्ज्य / अशुभ काल</div>
      <Card style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,padding:'12px 8px'}}>
        {[['राहुकाल',rawValue(p.rahu_kaal)],['अमृत चौघड़िया',rawValue(p.amrit_choghadiya)],['शुभ चौघड़िया',rawValue(p.shubh_choghadiya)]].map(([l,v])=><div key={l} style={{textAlign:'center',borderRight:l==='गुलिक काल'?'none':'1px solid #b87924'}}><Label>{l}</Label><Value size={22}>{v}</Value></div>)}
      </Card>
      <div style={{marginTop:'auto',textAlign:'center',paddingBottom:70}}>
        <div style={{display:'inline-block',background:'linear-gradient(#ffe7a8,#d99b2d)',border:'2px solid #fff0b8',borderRadius:30,padding:'8px 20px',color:'#46100b',fontSize:23,fontWeight:900}}>ⓘ समय पंचांग गणना पर आधारित हैं</div>
        <div style={{marginTop:12,color:'#fff0b6',fontSize:32,fontWeight:1000,textShadow:'0 3px 8px #000'}}>🙏 आपका दिन मंगलमय हो 🙏</div>
      </div>
    </div>
    <Diya left="1%" bottom={8} frame={frame} phase={0}/><Diya right="1%" bottom={8} frame={frame} phase={11}/>
  </AbsoluteFill>;
};
