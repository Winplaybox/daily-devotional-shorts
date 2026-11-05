// Central Data-to-Presentation Mapping for Pavitra Panchang 365
// Ensures all poster components and scripts receive validated, dynamic values with zero hardcoded leaks.

export const HINDI_MONTHS: Record<number, string> = {
  1: 'जनवरी', 2: 'फ़रवरी', 3: 'मार्च', 4: 'अप्रैल', 5: 'मई', 6: 'जून',
  7: 'जुलाई', 8: 'अगस्त', 9: 'सितम्बर', 10: 'अक्टूबर', 11: 'नवम्बर', 12: 'दिसम्बर'
};

export const HINDI_WEEKDAYS: Record<string, string> = {
  'monday': 'सोमवार', 'tuesday': 'मंगलवार', 'wednesday': 'बुधवार',
  'thursday': 'गुरुवार', 'friday': 'शुक्रवार', 'saturday': 'शनिवार', 'sunday': 'रविवार'
};

export const HINDI_LUNAR_MONTHS: Record<string, string> = {
  'chaitra': 'चैत्र', 'vaishakha': 'वैशाख', 'jyeshtha': 'ज्येष्ठ', 'ashadha': 'आषाढ़',
  'shravana': 'श्रावण', 'bhadrapada': 'भाद्रपद', 'ashwin': 'आश्विन', 'kartika': 'कार्तिक',
  'margashirsha': 'मार्गशीर्ष', 'pausha': 'पौष', 'magha': 'माघ', 'phalguna': 'फाल्गुन'
};

export const formatTime12h = (t: string | undefined | null): string => {
  if (!t || t === '—' || t === '-' || t === 'null' || t === 'undefined') return 'उपलब्ध नहीं';
  const trimmed = String(t).trim();
  if (!trimmed) return 'उपलब्ध नहीं';

  // If already a time range with ' से ' or ' – ' or ' - '
  if (trimmed.includes(' से ')) {
    const parts = trimmed.split(' से ');
    return `${formatTime12h(parts[0])} – ${formatTime12h(parts[1])}`;
  }
  if (trimmed.includes(' – ')) {
    const parts = trimmed.split(' – ');
    return `${formatTime12h(parts[0])} – ${formatTime12h(parts[1])}`;
  }
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ');
    return `${formatTime12h(parts[0])} – ${formatTime12h(parts[1])}`;
  }

  if (trimmed.includes('AM') || trimmed.includes('PM')) {
    return trimmed;
  }

  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    if (isNaN(h)) return trimmed;
    const m = parts[1].padStart(2, '0').slice(0, 2);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  }
  return trimmed;
};

export interface MappedPanchangData {
  formattedHindiDate: string;
  hindiDay: string;
  hindiMonth: string;
  hindiPaksha: string;
  hindiTithi: string;
  hindiNakshatra: string;
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  abhijit: string;
  amritKaal: string;
  brahma: string;
  rahuKaal: string;
  yamagandam: string;
  gulikKaal: string;
  choghadiyaLines: string[];
  festivalTitle: string;
  disha: string;
  dishaGuidance: string;
}

export function mapPanchangData(props: any): MappedPanchangData {
  const p = props?.panchang_raw || {};
  const meta = props?.date_meta || p.date_meta || {};
  const c1 = props?.card_1_essence || p.card_1_essence || {};
  const c2 = props?.card_2_nature || p.card_2_nature || {};
  const c3 = props?.card_3_muhurat || p.card_3_muhurat || {};
  const c4 = props?.card_4_cultural || p.card_4_cultural || {};
  const c5 = props?.card_5_jyotish || p.card_5_jyotish || {};

  // 1. Date parsing
  let formattedHindiDate = props?.dateDisplay || p.date_display || '';
  if (!formattedHindiDate) {
    const rawDateStr = meta.gregorian_date || p.date;
    if (rawDateStr) {
      const parts = String(rawDateStr).split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const monthIdx = parseInt(parts[1], 10);
        const year = parts[0];
        const monthHi = HINDI_MONTHS[monthIdx] || parts[1];
        formattedHindiDate = `${day} ${monthHi} ${year}`;
      }
    }
  }
  if (!formattedHindiDate) {
    formattedHindiDate = 'उपलब्ध नहीं';
  }

  // 2. Weekday
  const rawDay = (meta.day_of_week || p.weekday_en || p.weekday || '').toLowerCase();
  const hindiDay = meta.day_of_week_hi || p.weekday || HINDI_WEEKDAYS[rawDay] || 'उपलब्ध नहीं';

  // 3. Month (Hindu Maas)
  let hindiMonth = p.hindu_month_clean || meta.month_amanta || meta.month_purnimanta || p.hindu_month || '';
  if (hindiMonth) {
    hindiMonth = String(hindiMonth).replace(/\s*\([A-Za-z]+\)/g, '').trim();
    const rawMonthLower = hindiMonth.toLowerCase();
    if (HINDI_LUNAR_MONTHS[rawMonthLower]) {
      hindiMonth = HINDI_LUNAR_MONTHS[rawMonthLower];
    }
    if (!hindiMonth.includes('माह')) {
      hindiMonth = `${hindiMonth} माह`;
    }
  } else {
    hindiMonth = 'उपलब्ध नहीं';
  }

  // 4. Paksha
  let hindiPaksha = meta.paksha || p.paksha || '';
  if (hindiPaksha) {
    const pakshaLower = String(hindiPaksha).toLowerCase();
    if (pakshaLower.includes('shukla') || pakshaLower.includes('शुक्ल')) {
      hindiPaksha = 'शुक्ल पक्ष';
    } else if (pakshaLower.includes('krishna') || pakshaLower.includes('कृष्ण')) {
      hindiPaksha = 'कृष्ण पक्ष';
    }
  } else {
    hindiPaksha = 'उपलब्ध नहीं';
  }

  // 5. Tithi
  let hindiTithi = c1.tithi?.raw_name || c1.tithi?.name || p.tithi_clean || p.tithi_name || '';
  if (hindiTithi) {
    hindiTithi = String(hindiTithi).replace(/\s*\([A-Za-z]+\)/g, '').trim();
    if (!hindiTithi.includes('तिथि')) {
      hindiTithi = `${hindiTithi} तिथि`;
    }
  } else {
    hindiTithi = 'उपलब्ध नहीं';
  }

  // 6. Nakshatra
  let hindiNakshatra = c1.nakshatra?.name || p.nakshatra_clean || p.nakshatra_name || '';
  if (hindiNakshatra) {
    hindiNakshatra = String(hindiNakshatra).replace(/\s*\([A-Za-z]+\)/g, '').trim();
  } else {
    hindiNakshatra = 'उपलब्ध नहीं';
  }

  // 7. Sun & Moon Timings
  const sunrise = formatTime12h(c2.solar?.sunrise || p.sunrise);
  const sunset = formatTime12h(c2.solar?.sunset || p.sunset);
  const moonrise = formatTime12h(c2.lunar?.moonrise || p.moonrise);
  const moonset = formatTime12h(c2.lunar?.moonset || p.moonset);

  // 8. Auspicious (Shubh Kaal)
  const auspiciousList = Array.isArray(c3.auspicious) ? c3.auspicious : [];
  const abhijitObj = auspiciousList.find((x: any) => x.name?.toLowerCase().includes('abhijit'));
  const abhijit = abhijitObj?.display || (abhijitObj?.start && abhijitObj?.end ? `${formatTime12h(abhijitObj.start)} – ${formatTime12h(abhijitObj.end)}` : (p.abhijit_range || formatTime12h(p.abhijit)));

  const amritObj = auspiciousList.find((x: any) => x.name?.toLowerCase().includes('amrit'));
  const amritKaal = amritObj?.display || (amritObj?.start && amritObj?.end ? `${formatTime12h(amritObj.start)} – ${formatTime12h(amritObj.end)}` : (p.amrit_kaal_range || p.amrit_kaal || formatTime12h(p.amrit_choghadiya)));

  const brahmaObj = auspiciousList.find((x: any) => x.name?.toLowerCase().includes('brahma'));
  const brahma = brahmaObj?.display || (brahmaObj?.start && brahmaObj?.end ? `${formatTime12h(brahmaObj.start)} – ${formatTime12h(brahmaObj.end)}` : (p.brahma_range || formatTime12h(p.brahma)));

  // 9. Inauspicious (Ashubh Kaal)
  const inauspiciousList = Array.isArray(c3.inauspicious) ? c3.inauspicious : [];
  const rahuObj = inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('rahu'));
  const rahuKaal = rahuObj?.display || (rahuObj?.start && rahuObj?.end ? `${formatTime12h(rahuObj.start)} – ${formatTime12h(rahuObj.end)}` : (p.rahu_kaal_range || formatTime12h(p.rahu_kaal)));

  const yamaObj = inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('yama'));
  const yamagandam = yamaObj?.display || (yamaObj?.start && yamaObj?.end ? `${formatTime12h(yamaObj.start)} – ${formatTime12h(yamaObj.end)}` : (p.yamaganda_range || formatTime12h(p.yamaganda)));

  const guliObj = inauspiciousList.find((x: any) => x.name?.toLowerCase().includes('guli'));
  const gulikKaal = guliObj?.display || (guliObj?.start && guliObj?.end ? `${formatTime12h(guliObj.start)} – ${formatTime12h(guliObj.end)}` : (p.gulika_range || formatTime12h(p.gulika)));

  // 10. Choghadiya (4 key auspicious daytime/poster slots)
  const choghadiyaItems = c3.choghadiya?.poster_items || p.choghadiya_poster_items;
  let choghadiyaLines: string[] = [];
  if (Array.isArray(choghadiyaItems) && choghadiyaItems.length >= 4) {
    choghadiyaLines = choghadiyaItems.slice(0, 4).map((it: any) => it.display || `${it.name} का चौघड़िया ${it.time || it.start + '–' + it.end} तक`);
  } else {
    const shubhT = p.shubh_choghadiya || c3.choghadiya?.auspicious?.shubh;
    const charT = p.char_choghadiya || c3.choghadiya?.auspicious?.char;
    const labhT = p.labh_choghadiya || c3.choghadiya?.auspicious?.labh;
    const amritT = p.amrit_choghadiya || c3.choghadiya?.auspicious?.amrit;

    choghadiyaLines = [
      shubhT ? `शुभ का चौघड़िया ${String(shubhT).replace(' से ', '–')} तक` : 'शुभ का चौघड़िया उपलब्ध नहीं',
      charT ? `चर का चौघड़िया ${String(charT).replace(' से ', '–')} तक` : 'चर का चौघड़िया उपलब्ध नहीं',
      labhT ? `लाभ का चौघड़िया ${String(labhT).replace(' से ', '–')} तक` : 'लाभ का चौघड़िया उपलब्ध नहीं',
      amritT ? `अमृत का चौघड़िया ${String(amritT).replace(' से ', '–')} तक` : 'अमृत का चौघड़िया उपलब्ध नहीं'
    ];
  }

  // 11. Festival & Vrat
  const festivals = Array.isArray(c4.festivals) ? c4.festivals : [];
  let festivalTitle = '';
  if (festivals.length > 0 && festivals[0].name) {
    festivalTitle = festivals[0].name;
  } else if (props?.title && !props.title.toLowerCase().includes('पंचांग')) {
    festivalTitle = props.title;
  } else {
    festivalTitle = 'कोई प्रमुख व्रत या पर्व नहीं';
  }

  // 12. Disha Shool
  let disha = c4.disha_shool?.direction || (p.disha_shool ? p.disha_shool.split(' ')[0] : '');
  if (disha) {
    disha = String(disha).replace(/\s*\([A-Za-z]+\)/g, '').replace(/दिशा/g, '').trim();
  }
  const dishaGuidance = disha
    ? `आज ${disha} दिशा में दिशा शूल रहेगा। इसलिए आज ${disha} दिशा में यात्रा करने से बचें। यदि आवश्यक हो तो पहले उपाय करके ही प्रस्थान करें।`
    : 'दिशा शूल की जानकारी उपलब्ध नहीं है।';

  return {
    formattedHindiDate,
    hindiDay,
    hindiMonth,
    hindiPaksha,
    hindiTithi,
    hindiNakshatra,
    sunrise,
    sunset,
    moonrise,
    moonset,
    abhijit,
    amritKaal,
    brahma,
    rahuKaal,
    yamagandam,
    gulikKaal,
    choghadiyaLines,
    festivalTitle,
    disha,
    dishaGuidance
  };
}
