// Builds the scene list, narration and YouTube metadata for the weekly long-form
// Panchang guide. Pure functions over the verified 7-day dataset from
// engine/weekly_data.py: no values are invented here, only phrased.
import { spokenRange, spokenTime, displayRange } from '../editorial/spoken-time.js';

const MONTHS_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

export function cleanTitle(value) {
  return String(value || '')
    .replace(/^(.*?)\s*\((शुक्ल|कृष्ण) पक्ष\)$/, '$2 पक्ष $1')
    .replace(/\s*\([A-Za-z0-9\s,\-–]+\)/g, '')
    .replace(/\s*\/\s*/g, ' और ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function formatDateRange(startIso, endIso) {
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  if (sy === ey && sm === em) return `${sd}–${ed} ${MONTHS_HI[sm - 1]} ${sy}`;
  if (sy === ey) return `${sd} ${MONTHS_HI[sm - 1]} – ${ed} ${MONTHS_HI[em - 1]} ${sy}`;
  return `${sd} ${MONTHS_HI[sm - 1]} ${sy} – ${ed} ${MONTHS_HI[em - 1]} ${ey}`;
}

export function locationLabel(name = '') {
  if (/ujjain/i.test(name)) return 'उज्जैन';
  return String(name).replace(/\s*\([^)]*\)/g, '').trim() || 'चयनित स्थान';
}

function tillText(end) {
  if (!end) return '';
  const nextDay = /अगले दिन/.test(end);
  const time = spokenTime(end);
  return time ? `${nextDay ? 'अगले दिन ' : ''}${time} तक` : '';
}

function eventsOf(day) {
  const seen = new Set();
  const firstWords = new Set();
  return (day.events || [])
    .map((event) => ({ ...event, title: cleanTitle(event.title) }))
    .sort((a, b) => b.priority - a.priority)
    // The calculator can emit the same observance twice under related names
    // (a festival card plus its vrat card); keep the highest-priority one.
    .filter((event) => {
      const first = event.title.split(' ')[0];
      if (!event.title || seen.has(event.title) || firstWords.has(first)) return false;
      seen.add(event.title);
      firstWords.add(first);
      return true;
    });
}

export function pickHighlight(week) {
  let best = null;
  for (const day of week.days) {
    for (const event of eventsOf(day)) {
      if (!best || event.priority > best.event.priority) best = { day, event };
    }
  }
  if (best) return { kind: 'event', day: best.day, label: best.event.title };
  const special = week.days.find((day) => day.is_purnima || day.is_amavasya || day.is_ekadashi);
  if (special) {
    const label = special.is_purnima ? 'पूर्णिमा' : special.is_amavasya ? 'अमावस्या' : 'एकादशी';
    return { kind: 'tithi', day: special, label };
  }
  return null;
}

function dayNarration(day, index) {
  const events = eventsOf(day);
  const eventLine = events.length ? `इस दिन ${events.map((e) => e.title).join(' और ')} है।` : '';
  const tithi = `तिथि ${day.paksha} ${day.tithi}${tillText(day.tithi_end) ? `, ${tillText(day.tithi_end)}` : ''}`;
  const nakshatra = `नक्षत्र ${day.nakshatra}${tillText(day.nakshatra_end) ? `, ${tillText(day.nakshatra_end)}` : ''}`;
  const rahu = spokenRange(day.rahu_kaal);
  const abhijit = spokenRange(day.abhijit);
  const sun = `सूर्योदय ${spokenTime(day.sunrise)} और सूर्यास्त ${spokenTime(day.sunset)}`;
  const head = `${day.weekday}, ${day.date_display}।`;
  // Three orderings so seven consecutive days do not sound like one repeated template.
  const variants = [
    `${head} ${tithi}। ${nakshatra}। ${sun}। राहुकाल ${rahu}, इस समय नया शुभ कार्य शुरू न करें। शुभ अभिजीत मुहूर्त ${abhijit}। ${eventLine}`,
    `${head} ${eventLine} राहुकाल ${rahu}। ${tithi}। ${nakshatra}। अभिजीत मुहूर्त ${abhijit}। ${sun}।`,
    `${head} ${sun}। ${tithi}। ${nakshatra}। शुभ कार्य के लिए अभिजीत मुहूर्त ${abhijit} रहेगा, और राहुकाल ${rahu} में सावधानी रखें। ${eventLine}`,
  ];
  return variants[index % variants.length].replace(/\s{2,}/g, ' ').trim();
}

function dayDisplay(day) {
  const events = eventsOf(day);
  return {
    weekday: day.weekday,
    date: day.date_display,
    paksha: day.paksha,
    month: day.month,
    banner: events[0]?.title || '',
    cards: [
      { label: 'तिथि', value: day.tithi, sub: tillText(day.tithi_end).replace(/ तक$/, '') ? `${tillText(day.tithi_end)}` : '' },
      { label: 'नक्षत्र', value: day.nakshatra, sub: tillText(day.nakshatra_end) },
      { label: 'योग', value: day.yoga, sub: `करण: ${day.karana}` },
      { label: 'सूर्योदय / सूर्यास्त', value: `${spokenTime(day.sunrise)} / ${spokenTime(day.sunset)}`, sub: '' },
      { label: 'राहुकाल (अशुभ)', value: displayRange(day.rahu_kaal), sub: '', tone: 'warn' },
      { label: 'अभिजीत मुहूर्त (शुभ)', value: displayRange(day.abhijit), sub: '', tone: 'good' },
    ],
  };
}

export function buildWeeklyScenes(week) {
  if (!week?.days || week.days.length !== 7) throw new Error('Weekly guide needs exactly seven days.');
  const range = formatDateRange(week.week_start, week.week_end);
  const place = locationLabel(week.location_name);
  const highlight = pickHighlight(week);
  const highlightLine = highlight
    ? `इस हफ्ते ${highlight.day.weekday}, ${highlight.day.date_display} को ${highlight.label} है।`
    : 'इस हफ्ते हर दिन का राहुकाल और शुभ मुहूर्त अलग है।';

  const scenes = [];
  scenes.push({
    id: 'intro',
    kind: 'intro',
    chapter: 'शुरुआत',
    narration: `नमस्कार! ${highlightLine} यह साप्ताहिक पंचांग ${range} तक के सातों दिन की तिथि, नक्षत्र, राहुकाल और शुभ मुहूर्त बताता है। सभी समय ${place} के अनुसार हैं।`,
    display: { range, place, highlight: highlight ? `${highlight.day.weekday} — ${highlight.label}` : '' },
  });
  week.days.forEach((day, index) => {
    scenes.push({
      id: `day-${day.date}`,
      kind: 'day',
      chapter: `${day.weekday} ${day.date_display.replace(/ \d{4}$/, '')}`,
      narration: dayNarration(day, index),
      display: { ...dayDisplay(day), index },
    });
  });

  const notable = week.days.flatMap((day) => {
    const lines = eventsOf(day).slice(0, 1).map((event) => ({ weekday: day.weekday, date: day.date_display, label: event.title }));
    if (!lines.length && day.is_purnima) lines.push({ weekday: day.weekday, date: day.date_display, label: 'पूर्णिमा' });
    if (!lines.length && day.is_amavasya) lines.push({ weekday: day.weekday, date: day.date_display, label: 'अमावस्या' });
    return lines;
  });
  const summarySpeech = notable.length
    ? `इस हफ्ते की खास तिथियां: ${notable.map((n) => `${n.weekday} को ${n.label}`).join('; ')}।`
    : 'इस हफ्ते कोई बड़ा व्रत या त्योहार नहीं है, इसलिए रोज़ के राहुकाल और अभिजीत मुहूर्त का ध्यान रखें।';
  scenes.push({
    id: 'summary',
    kind: 'summary',
    chapter: 'इस हफ्ते की खास तिथियां',
    narration: `${summarySpeech} आपके यहां कौन सा व्रत या त्योहार कब मनाया जाता है, यह कमेंट में ज़रूर बताइए।`,
    display: { items: notable.slice(0, 7) },
  });
  scenes.push({
    id: 'outro',
    kind: 'outro',
    chapter: 'समापन',
    narration: 'अगर यह जानकारी उपयोगी लगी तो वीडियो को लाइक करें और चैनल को सब्सक्राइब करें। हम रोज़ सुबह और शाम नया पंचांग शॉर्ट लाते हैं। आपके शहर में सूर्योदय का समय थोड़ा अलग हो सकता है, अपना शहर कमेंट में लिखिए। शुभ सप्ताह!',
    display: { place },
  });
  return scenes;
}

function mmss(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** YouTube chapters need the first stamp at 0:00 and at least three entries. */
export function buildChapters(scenes, startSeconds) {
  return scenes.map((scene, i) => `${mmss(i === 0 ? 0 : startSeconds[i])} ${scene.chapter}`).join('\n');
}

export function buildWeeklyMetadata(week, scenes, startSeconds) {
  const range = formatDateRange(week.week_start, week.week_end);
  const highlight = pickHighlight(week);
  const base = `साप्ताहिक पंचांग ${range}`;
  const tail = '| Weekly Panchang';
  const withHighlight = highlight ? `${base} | ${highlight.label}, राहुकाल व शुभ मुहूर्त ${tail}` : `${base} | राहुकाल व शुभ मुहूर्त ${tail}`;
  const title = withHighlight.length <= 100 ? withHighlight : `${base} ${tail}`;
  const dayLines = week.days.map((day) => {
    const events = eventsOf(day).map((e) => e.title);
    return `• ${day.weekday} ${day.date_display}: ${day.paksha} ${day.tithi}, ${day.nakshatra} नक्षत्र${events.length ? ` — ${events.join(', ')}` : ''}`;
  });
  const description = [
    `${range} का साप्ताहिक पंचांग: हर दिन की तिथि, नक्षत्र, योग, सूर्योदय-सूर्यास्त, राहुकाल और अभिजीत मुहूर्त।`,
    '',
    'अध्याय (Chapters):',
    buildChapters(scenes, startSeconds),
    '',
    'इस हफ्ते एक नज़र में:',
    ...dayLines,
    '',
    `सभी समय ${locationLabel(week.location_name)} के अनुसार हैं (${week.location_name}). अपने शहर का समय थोड़ा अलग हो सकता है; स्थानीय पंचांग से मिलान करें।`,
    'गणना: JPL DE421 खगोलीय डेटा (Skyfield), लाहिड़ी अयनांश, पूर्णिमांत मास।',
    '',
    'रोज़ सुबह और शाम नया पंचांग Short देखने के लिए चैनल को सब्सक्राइब करें।',
    '',
    '#साप्ताहिकपंचांग #Panchang #पंचांग #राहुकाल #शुभमुहूर्त',
  ].join('\n');
  return {
    yt_title: title,
    yt_description: description,
    yt_tags: ['साप्ताहिक पंचांग', 'weekly panchang', 'panchang', 'पंचांग', 'राहुकाल', 'शुभ मुहूर्त', 'abhijit muhurat', 'hindu calendar', 'तिथि', 'नक्षत्र'],
    playlist_name: 'साप्ताहिक पंचांग | Weekly Panchang',
  };
}
