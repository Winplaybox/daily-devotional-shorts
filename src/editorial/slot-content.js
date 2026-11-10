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

  const parts = [
    `नमस्कार। दैनिक पंचांग 365 में ${cleanText(dateGreeting) || 'आज'} के लिए ${content.title} के प्रमुख समय जानिए।`,
  ];

  if (calendarTokens.length) parts.push(`आज ${calendarTokens.join(', ')} है।`);
  parts.push(`प्रमुख समय: ${content.highlights.map(({ label, value }) => `${label}: ${value}`).join('। ')}।`);
  if (content.footer) parts.push(content.footer);
  parts.push('दैनिक पंचांग से जुड़े रहने के लिए सब्सक्राइब करें। आपका दिन मंगलमय हो। जय श्री राम।');

  return parts.join(' ');
}
