import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyScenes, buildWeeklyMetadata, buildChapters, formatDateRange, cleanTitle, pickHighlight } from '../src/longform/weekly-script.js';

const day = (i, extra = {}) => ({
  date: `2026-11-${16 + i}`,
  date_display: `${16 + i} नवंबर 2026`,
  weekday: ['सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार'][i],
  paksha: 'शुक्ल पक्ष', tithi: 'सप्तमी', tithi_end: '04:20 AM (अगले दिन)',
  nakshatra: 'श्रवण', nakshatra_end: '09:10 PM', yoga: 'वैधृति', karana: 'बव', month: 'कार्तिक',
  sunrise: '06:42 AM', sunset: '05:48 PM', rahu_kaal: '08:03 AM से 09:26 AM', abhijit: '11:49 AM से 12:33 PM',
  is_purnima: false, is_amavasya: false, is_ekadashi: false, events: [], ...extra,
});
const week = (over = {}) => ({
  week_start: '2026-11-16', week_end: '2026-11-22', location_name: 'Ujjain, Madhya Pradesh, India (India reference)',
  days: Array.from({ length: 7 }, (_, i) => day(i)), ...over,
});

test('scene list is intro + 7 days + summary + outro with unique ids', () => {
  const scenes = buildWeeklyScenes(week());
  assert.equal(scenes.length, 13);
  assert.deepEqual(scenes.map((s) => s.kind), ['intro', ...Array(7).fill('day'), 'summary', 'summary', 'summary', 'summary', 'outro']);
  assert.equal(new Set(scenes.map((s) => s.id)).size, 13);
});

test('narration never contains English AM/PM or empty placeholders', () => {
  for (const scene of buildWeeklyScenes(week())) {
    assert.doesNotMatch(scene.narration, /\b(AM|PM)\b|undefined|null|NaN/, scene.id);
    assert.ok(scene.narration.length > 40, scene.id);
  }
});

test('consecutive day scripts are not identical templates', () => {
  const days = buildWeeklyScenes(week()).filter((s) => s.kind === 'day').slice(0, 3).map((s) => s.narration.split('। ')[1]);
  assert.equal(new Set(days).size, 3);
});

test('hook names the highest-priority event of the week with its weekday', () => {
  const w = week();
  w.days[4].events = [{ title: 'देवउठनी एकादशी / तुलसी विवाह', priority: 10 }, { title: 'एकादशी व्रत', priority: 8 }];
  const intro = buildWeeklyScenes(w)[0].narration;
  assert.match(intro, /शुक्रवार, 20 नवंबर 2026 को देवउठनी एकादशी और तुलसी विवाह है/);
  assert.match(intro, /उज्जैन के अनुसार/);
  assert.equal(pickHighlight(w).label, 'देवउठनी एकादशी और तुलसी विवाह');
});

test('quiet week still has an honest hook and summary', () => {
  const scenes = buildWeeklyScenes(week());
  assert.match(scenes[0].narration, /राहुकाल और शुभ मुहूर्त अलग/);
  assert.match(scenes.at(-2).narration, /कोई बड़ा व्रत/);
});

test('exactly seven days are required', () => {
  assert.throws(() => buildWeeklyScenes(week({ days: [day(0)] })), /seven days/);
});

test('chapters start at 0:00 and metadata fits YouTube limits', () => {
  const w = week();
  const scenes = buildWeeklyScenes(w);
  const starts = scenes.map((_, i) => i * 31);
  const chapters = buildChapters(scenes, starts).split('\n');
  assert.match(chapters[0], /^0:00 /);
  assert.match(chapters[2], /^1:02 /);
  const meta = buildWeeklyMetadata(w, scenes, starts);
  assert.ok(meta.yt_title.length <= 100, meta.yt_title);
  assert.ok(meta.yt_description.length < 5000);
  assert.match(meta.yt_description, /0:00 शुरुआत/);
  assert.ok(!meta.yt_title.includes('#Shorts'));
});

test('helpers: date range and title cleaning', () => {
  assert.equal(formatDateRange('2026-11-16', '2026-11-22'), '16–22 नवंबर 2026');
  assert.equal(formatDateRange('2026-11-30', '2026-12-06'), '30 नवंबर – 6 दिसंबर 2026');
  assert.equal(cleanTitle('दीपावली / महालक्ष्मी पूजन (Diwali)'), 'दीपावली और महालक्ष्मी पूजन');
});

test('related festival+vrat cards collapse into one spoken event; paksha suffix moves to the front', () => {
  const w = week();
  w.days[4].events = [
    { title: 'देवउठनी एकादशी / तुलसी विवाह', priority: 10 },
    { title: 'देवउठनी (प्रबोधिनी) एकादशी व्रत', priority: 8 },
  ];
  w.days[6].events = [{ title: 'प्रदोष व्रत (शुक्ल पक्ष)', priority: 8 }];
  const scenes = buildWeeklyScenes(w);
  const friday = scenes.find((s) => s.id === 'day-2026-11-20').narration;
  assert.ok(!friday.includes('प्रबोधिनी'));
  assert.match(scenes.at(-2).narration, /रविवार को शुक्ल पक्ष प्रदोष व्रत/);
});
