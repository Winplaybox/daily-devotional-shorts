import React from 'react';
import { Composition } from 'remotion';
import { PanchangShort, PanchangProps } from './PanchangShort';

export const RemotionRoot: React.FC = () => {
  const sampleData: PanchangProps = {
    bgImageUrl: 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=1080&q=80',
    religion: 'SANATANA DHARMA',
    title: 'गोवर्धन पूजा',
    dateDisplay: '10 नवंबर 2026, मंगलवार',
    label1: 'प्रतिपदा तिथि प्रारंभ',
    val1: '9 नवंबर, 12:31 PM',
    label2: 'प्रतिपदा तिथि समाप्त',
    val2: '10 नवंबर, 02:00 PM',
    label3: 'शुभ पूजा मुहूर्त',
    val3: '06:40 AM से 08:50 AM',
    footer: '⏱ कुल शुभ अवधि: 02 घंटे 10 मिनट',
  };

  return (
    <Composition
      id="DailyShort"
      component={PanchangShort}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={sampleData}
    />
  );
};
