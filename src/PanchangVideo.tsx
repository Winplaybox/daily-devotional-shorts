import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

type Props = {visualStyle?: 'traditional'|'modern'|'both'; religion?:string; title?:string; dateDisplay?:string; locationName?:string; timezoneLabel?:string; panchang_raw?:Record<string,any>; [key:string]:any};
const gold='#f5cf78';
const value=(v:any)=>v===undefined||v===null||v===''?'समय उपलब्ध नहीं':String(v);
const Scene:React.FC<{heading:string;rows:{label:string;value:string}[];traditional:boolean;brand:string;date:string;location:string}> = ({heading,rows,traditional,brand,date,location})=>{
 const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const p=spring({frame,fps,config:{damping:18}});
 return <AbsoluteFill style={{padding:'72px 52px',justifyContent:'space-between',fontFamily:'Noto Sans Devanagari, sans-serif',background:traditional?'radial-gradient(ellipse at 50% 25%,#761b29,#350812 58%,#13040a)':'radial-gradient(ellipse at 50% 25%,#552207,#1b0b04 55%,#030303)'}}>
  {traditional&&<div style={{position:'absolute',inset:14,border:'6px double #d2a44d',borderRadius:18}}/>}
  <div style={{textAlign:'center',opacity:p,transform:'translateY('+interpolate(p,[0,1],[-24,0])+'px)'}}>
   <div style={{fontSize:24,letterSpacing:4,color:gold,fontWeight:800}}>{brand}</div>
   <div style={{fontSize:58,fontWeight:900,color:'#ffe7a5',marginTop:18,textShadow:'0 4px 18px #000'}}>{heading}</div>
   <div style={{display:'inline-block',marginTop:18,padding:'12px 28px',borderRadius:40,background:'#8d201f',border:'2px solid '+gold,color:'white',fontSize:30,fontWeight:800}}>{date}</div>
  </div>
  <div style={{display:'flex',flexDirection:'column',gap:22,zIndex:1}}>
   {rows.map((r,i)=><div key={r.label} style={{background:traditional?'rgba(48,5,15,.9)':'rgba(4,4,8,.86)',border:traditional?'2px solid #c99b48':'1px solid rgba(245,207,120,.55)',borderRadius:traditional?16:24,padding:'24px 26px',textAlign:'center',boxShadow:'0 12px 28px #0008'}}>
    <div style={{fontSize:27,color:gold,fontWeight:700,marginBottom:8}}>{r.label}</div><div style={{fontSize:39,color:'white',fontWeight:800,lineHeight:1.25}}>{r.value}</div>
   </div>)}
  </div>
  <div style={{textAlign:'center',fontSize:22,color:'#f7d88c',fontWeight:700,zIndex:1}}>{location} · स्थानीय समयानुसार<div style={{marginTop:12}}>॥ शुभ दिन ॥</div></div>
 </AbsoluteFill>;
};
export const PanchangVideo:React.FC<Props>=(props)=>{
 const raw=props.panchang_raw||{}; const brand=props.religion||'PAVITRA PANCHANG 365'; const date=props.dateDisplay||''; const loc=(props.locationName||'Ujjain')+' · '+(props.timezoneLabel||'IST');
 const groups=[
  {from:0,duration:150,heading:'आज का पंचांग',rows:[{label:'मास एवं पक्ष',value:value(raw.hindu_month)+' · '+value(raw.paksha)},{label:'आज की तिथि',value:value(raw.tithi_name)}]},
  {from:150,duration:270,heading:'नक्षत्र एवं योग',rows:[{label:'नक्षत्र',value:value(raw.nakshatra_name)},{label:'योग · करण',value:value(raw.yoga_name)+' · '+value(raw.karana_name)}]},
  {from:420,duration:270,heading:'सूर्य दर्शन',rows:[{label:'सूर्योदय',value:value(raw.sunrise)},{label:'सूर्यास्त',value:value(raw.sunset)}]},
  {from:690,duration:360,heading:'शुभ मुहूर्त',rows:[{label:'अभिजीत मुहूर्त',value:value(raw.abhijit)},{label:'ब्रह्म मुहूर्त',value:value(raw.brahma)},{label:'गोधूलि',value:value(raw.godhuli)}]},
  {from:1050,duration:360,heading:'आज के विशेष समय',rows:[{label:'राहुकाल',value:value(raw.rahu_kaal)},{label:'दिशाशूल',value:value(raw.disha_shool)},{label:'अमृत चौघड़िया',value:value(raw.amrit_choghadiya)}]},
  {from:1410,duration:390,heading:'आपका दिन शुभ हो',rows:[{label:props.title||'आज का पंचांग',value:props.footer||'जय श्री राम'},{label:'हमारा चैनल',value:'Pavitra Panchang 365'}]}
 ];
 const both=props.visualStyle==='both';
 return <AbsoluteFill style={{background:'#080505'}}>
  <Audio src={staticFile('narration.wav')} volume={1}/>
  <Audio src={staticFile('devotional_ambient.wav')} volume={0.12} loop/>
  {groups.map((g,index)=><Sequence key={g.from} from={g.from} durationInFrames={g.duration}><Scene heading={g.heading} rows={g.rows} traditional={props.visualStyle==='traditional'||(both&&index%2===0)} brand={brand} date={date} location={loc}/></Sequence>)}
 </AbsoluteFill>;
};
