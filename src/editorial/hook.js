// First-seconds hook shared by the narration and the on-screen intro card, so
// the viewer hears and sees the single most useful timing before anything else.
import { getAfternoonSlotContent } from './slot-content.js';
import { displayRange, spokenRange } from './spoken-time.js';

function clean(value) {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  return text === 'उपलब्ध नहीं' || text === '—' ? '' : text;
}

export function extractKeyTimings(data = {}) {
  const p = data.panchang_raw || {};
  const c3 = data.card_3_muhurat || p.card_3_muhurat || {};
  const find = (list, key) => (Array.isArray(list) ? list.find((x) => x?.name?.toLowerCase().includes(key))?.display : '') || '';
  return {
    rahuKaal: clean(p.rahu_kaal_range || p.rahu_kaal || find(c3.inauspicious, 'rahu')),
    yamaganda: clean(p.yamaganda_range || p.yamaganda || find(c3.inauspicious, 'yama')),
    abhijit: clean(p.abhijit_range || p.abhijit || find(c3.auspicious, 'abhijit')),
    brahma: clean(p.brahma_range || p.brahma || find(c3.auspicious, 'brahma')),
  };
}

export function dayWordFor(data = {}) {
  return String(data.slot || '').toLowerCase() === 'evening' ? 'कल' : 'आज';
}

/** Returns { kicker, value, note, spoken } or null when no timing is available. */
export function buildHook(data = {}) {
  const afternoon = getAfternoonSlotContent(data);
  if (afternoon) {
    const first = afternoon.highlights[0];
    const value = displayRange(first.value);
    if (!value) return null;
    return {
      kicker: `आज ${first.label}`,
      value,
      note: 'शुभ कार्य के लिए उत्तम समय',
      spoken: `आज ${first.label} ${spokenRange(first.value)} है, यह शुभ कार्य के लिए उत्तम समय है।`,
    };
  }

  const day = dayWordFor(data);
  const { rahuKaal, abhijit } = extractKeyTimings(data);
  if (rahuKaal && displayRange(rahuKaal)) {
    return {
      kicker: `${day} का राहुकाल`,
      value: displayRange(rahuKaal),
      note: 'इस समय शुभ कार्य शुरू न करें',
      spoken: `${day} राहुकाल ${spokenRange(rahuKaal)} रहेगा, इस समय कोई शुभ कार्य शुरू न करें।`,
    };
  }
  if (abhijit && displayRange(abhijit)) {
    return {
      kicker: `${day} का अभिजीत मुहूर्त`,
      value: displayRange(abhijit),
      note: 'दिन का सबसे शुभ समय',
      spoken: `${day} का सबसे शुभ अभिजीत मुहूर्त ${spokenRange(abhijit)} है।`,
    };
  }
  return null;
}
