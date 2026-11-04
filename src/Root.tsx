import React from 'react';
import {Composition} from 'remotion';
import {PanchangVideo} from './PanchangVideo';
export const RemotionRoot:React.FC=()=>{
 const sampleData={
religion:'PAVITRA PANCHANG 365',title:'आज का पंचांग',dateDisplay:'4 नवंबर 2026, बुधवार',
  panchang_raw:{hindu_month:'कार्तिक',paksha:'कृष्ण पक्ष',tithi_name:'दशमी',nakshatra_name:'पूर्वाफाल्गुनी',yoga_name:'ब्रह्म योग',karana_name:'गर',sunrise:'06:34 AM',sunset:'05:34 PM',moonrise:'11:28 PM',moonset:'11:42 AM',abhijit:'11:47 AM से 12:32 PM',brahma:'04:58 AM से 05:46 AM',godhuli:'05:22 PM से 05:46 PM',rahu_kaal:'12:10 PM से 01:34 PM',disha_shool:'उत्तर दिशा',amrit_choghadiya:'06:34 AM से 08:50 AM'},
  footer:'आपका दिन शुभ हो'
 };
 return <>
  <Composition id="DailyShort40" component={PanchangVideo} durationInFrames={1200} fps={30} width={1080} height={1920} defaultProps={{...sampleData,narrationFile:'narration40.wav'}}/>
  <Composition id="DailyShort60" component={PanchangVideo} durationInFrames={1800} fps={30} width={1080} height={1920} defaultProps={{...sampleData,narrationFile:'narration60.wav'}}/>
 </>;
};