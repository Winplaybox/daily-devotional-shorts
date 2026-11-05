import React from 'react';
import { Composition } from 'remotion';
import { PanchangVideo } from './PanchangVideo';

export const RemotionRoot: React.FC = () => {
  const samplePanchangData = {
    religion: 'दैनिक पंचांग 365',
    title: 'शारदीय नवरात्रि (सप्तमी तिथि)',
    dateDisplay: '17 अक्टूबर 2026',
    date_meta: {
      gregorian_date: '2026-10-17',
      day_of_week: 'Saturday',
      vikram_samvat: 2083,
      shaka_samvat: 1948,
      ayana: 'Dakshinayan',
      ritu: 'Sharad',
      month_amanta: 'Ashwin',
      month_purnimanta: 'Kartika',
      paksha: 'Shukla',
      tithi_number: 7
    },
    card_1_essence: {
      title: "Today's Essence",
      tithi: {
        name: 'शुक्ल सप्तमी',
        ends_at: '16:15:00',
        significance: 'Good for travel and administrative work'
      },
      nakshatra: {
        name: 'Shravana',
        ends_at: '18:45:00',
        lord: 'Moon'
      },
      yoga: {
        name: 'Vaidhriti',
        ends_at: '12:30:00'
      },
      karana: {
        first: 'Vishti',
        second: 'Bava'
      },
      rashi: {
        sun_sign: 'Scorpio',
        moon_sign: 'Capricorn'
      }
    },
    card_2_nature: {
      title: 'Time & Nature',
      solar: {
        sunrise: '06:23 AM',
        sunset: '05:56 PM'
      },
      lunar: {
        moonrise: '12:23 PM',
        moonset: '10:36 PM'
      },
      durations: {
        day_length: '11h 21m',
        night_length: '12h 39m'
      },
      ayanamsa: "24° 15' 32\" (Lahiri)"
    },
    card_3_muhurat: {
      title: 'Muhurat & Timings',
      auspicious: [
        { name: 'Abhijit Muhurat', start: '11:43:00', end: '12:29:00' },
        { name: 'Brahma Muhurat', start: '04:51:00', end: '05:40:00' },
        { name: 'Amrit Kaal', start: '02:10:00', end: '03:40:00' }
      ],
      inauspicious: [
        { name: 'Rahu Kaal', start: '09:17:00', end: '10:40:00', severity: 'high' },
        { name: 'Yamagandam', start: '13:32:00', end: '14:56:00', severity: 'medium' },
        { name: 'Gulika Kaal', start: '06:28:00', end: '07:52:00', severity: 'low' }
      ],
      choghadiya: {
        poster_items: [
          { name: 'शुभ', time: '07:51 AM – 09:18 AM', display: 'शुभ का चौघड़िया 07:51 AM – 09:18 AM तक' },
          { name: 'चर', time: '12:12 PM – 01:39 PM', display: 'चर का चौघड़िया 12:12 PM – 01:39 PM तक' },
          { name: 'लाभ', time: '01:39 PM – 03:06 PM', display: 'लाभ का चौघड़िया 01:39 PM – 03:06 PM तक' },
          { name: 'अमृत', time: '03:06 PM – 04:32 PM', display: 'अमृत का चौघड़िया 03:06 PM – 04:32 PM तक' }
        ]
      }
    },
    card_4_cultural: {
      title: 'Festivals & Vrats',
      is_fasting_day: false,
      fast_type: null,
      festivals: [
        {
          name: 'शारदीय नवरात्रि का सातवें दिन (माँ कालरात्रि की पूजा)',
          description: 'Observed on Shukla Saptami'
        }
      ],
      special_yogas: ['Sarvartha Siddhi Yoga (Active post 06:00 PM)']
    },
    card_5_jyotish: {
      title: 'Planetary Positions',
      graha_sthiti: [
        { planet: 'Sun', sign: 'Scorpio', degree: "18° 42'" },
        { planet: 'Moon', sign: 'Capricorn', degree: "04° 12'" },
        { planet: 'Mars', sign: 'Cancer', degree: "22° 10' (R)" },
        { planet: 'Mercury', sign: 'Libra', degree: "10° 05'" },
        { planet: 'Jupiter', sign: 'Gemini', degree: "25° 30' (R)" }
      ],
      current_choghadiya: 'Labh (Auspicious)'
    },
    panchang_raw: {
      disha_shool: 'पूर्व दिशा'
    },
    footer: '॥ ॐ नमो भगवते वासुदेवाय नमः ॥'
  };

  return (
    <>
      <Composition
        id="DailyShort40"
        component={PanchangVideo}
        durationInFrames={1200}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...samplePanchangData, narrationFile: 'narration40.wav' }}
      />
      <Composition
        id="DailyShort60"
        component={PanchangVideo}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...samplePanchangData, narrationFile: 'narration60.wav' }}
      />
      <Composition
        id="PanchangPoster"
        component={PanchangVideo}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...samplePanchangData }}
      />
    </>
  );
};