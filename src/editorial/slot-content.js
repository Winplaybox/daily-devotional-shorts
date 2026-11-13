import { spokenRange } from './spoken-time.js';

function cleanText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function getAfternoonSlotContent(data) {
  if (cleanText(data?.slot).toLowerCase() !== 'afternoon') return null;

  const title = cleanText(data.title);
  const highlights = [1, 2, 3]
    .map((index) => ({
      label: cleanText(data[`label${index}`]),
      value: cleanText(data[`val${index}`]),
    }))
    .filter((item) => item.label && item.value);

  if (!title) throw new Error('Afternoon slot requires a slot-specific title.');
  if (highlights.length !== 3) {
    throw new Error('Afternoon slot requires exactly three labelled time highlights.');
  }

  return { title, highlights, footer: cleanText(data.footer) };
}

export function buildAfternoonNarration(data, dateGreeting = '') {
  const content = getAfternoonSlotContent(data);
  if (!content) throw new Error('Afternoon narration can only be built for the afternoon slot.');

  const p = data.panchang_raw || {};
  const meta = data.date_meta || p.date_meta || {};
  const c1 = data.card_1_essence || p.card_1_essence || {};
  const month = cleanText(p.hindu_month_clean || meta.month_amanta || p.hindu_month);
  const paksha = cleanText(meta.paksha || p.paksha);
  const tithi = cleanText(c1.tithi?.raw_name || c1.tithi?.name || p.tithi_clean || p.tithi_name);
  const nakshatra = cleanText(c1.nakshatra?.name || p.nakshatra_clean || p.nakshatra_name);
  const calendarTokens = [month, paksha, tithi, nakshatra].filter(Boolean);

  const [first, ...rest] = content.highlights;
  const parts = [
    `${content.title}। आज ${first.label} ${spokenRange(first.value)} है, यह शुभ कार्य के लिए उत्तम समय है।`,
  ];
  if (cleanText(dateGreeting)) parts.push(`${cleanText(dateGreeting)}।`);
  for (const { label, value } of rest) parts.push(`${label} ${spokenRange(value)}।`);
  parts.push('रोज़ का पंचांग पाने के लिए सब्सक्राइब करें। जय श्री राम।');

  return parts.join(' ');
}
