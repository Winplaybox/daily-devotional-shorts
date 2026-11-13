// Converts Panchang clock times into natural spoken/displayed Hindi so TTS never
// reads "AM"/"PM" in English and the day-part word matches the real hour.

const TIME_RE = /(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm|प्रातः|सायं)?/g;

function toParts(match) {
  let hour = Number(match[1]);
  const minute = match[2];
  const marker = (match[3] || '').toUpperCase();
  if (marker === 'PM' || marker === 'सायं') {
    if (hour < 12) hour += 12;
  } else if ((marker === 'AM' || marker === 'प्रातः') && hour === 12) {
    hour = 0;
  }
  return { hour24: hour % 24, minute };
}

export function dayPart(hour24) {
  if (hour24 >= 4 && hour24 < 12) return 'सुबह';
  if (hour24 >= 12 && hour24 < 16) return 'दोपहर';
  if (hour24 >= 16 && hour24 < 19) return 'शाम';
  return 'रात';
}

function clock({ hour24, minute }) {
  const h12 = hour24 % 12 || 12;
  return `${h12}:${minute}`;
}

export function parseTimes(value) {
  if (!value) return [];
  return [...String(value).matchAll(TIME_RE)].map(toParts);
}

/** "06:24 AM" -> "सुबह 6:24" */
export function spokenTime(value) {
  const [first] = parseTimes(value);
  if (!first) return '';
  return `${dayPart(first.hour24)} ${clock(first)}`;
}

/**
 * "04:19 PM से 05:42 PM" -> "शाम 4:19 से 5:42 तक"
 * "11:49 AM – 12:33 PM"  -> "सुबह 11:49 से दोपहर 12:33 तक"
 */
export function spokenRange(value, { suffix = ' तक' } = {}) {
  const times = parseTimes(value);
  if (times.length === 0) return '';
  if (times.length === 1) return spokenTime(value);
  const [start, end] = times;
  const startPart = dayPart(start.hour24);
  const endPart = dayPart(end.hour24);
  const endText = startPart === endPart ? clock(end) : `${endPart} ${clock(end)}`;
  return `${startPart} ${clock(start)} से ${endText}${suffix}`;
}

/** Compact on-screen form: "शाम 4:19 – 5:42" */
export function displayRange(value) {
  const times = parseTimes(value);
  if (times.length === 0) return '';
  if (times.length === 1) return spokenTime(value);
  const [start, end] = times;
  const startPart = dayPart(start.hour24);
  const endPart = dayPart(end.hour24);
  return startPart === endPart
    ? `${startPart} ${clock(start)} – ${clock(end)}`
    : `${startPart} ${clock(start)} – ${endPart} ${clock(end)}`;
}
