import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { mapPanchangData, formatTime12h } from '../src/panchangMapper.js';
import { buildHindiNarration } from '../src/pipeline.js';

describe('1. Date and Weekday Consistency Tests', () => {
  const testDates = [
    { date: '2026-10-17', expectedDayHi: 'शनिवार', expectedDayEn: 'Saturday', slot: 'morning' },
    { date: '2026-11-04', expectedDayHi: 'बुधवार', expectedDayEn: 'Wednesday', slot: 'morning' },
    { date: '2026-11-08', expectedDayHi: 'रविवार', expectedDayEn: 'Sunday', slot: 'morning' }
  ];

  for (const tc of testDates) {
    test(`Astronomical engine output for ${tc.date} should be consistent`, () => {
      const outJson = path.resolve(`./out/test_engine_${tc.date}.json`);
      execSync(`python engine/panchang_engine.py --date ${tc.date} --out "${outJson}"`, { stdio: 'pipe' });
      assert.ok(fs.existsSync(outJson), `Expected output file ${outJson} to exist`);

      const raw = JSON.parse(fs.readFileSync(outJson, 'utf8'));
      assert.equal(raw.date_meta.gregorian_date, tc.date);
      assert.equal(raw.date_meta.day_of_week, tc.expectedDayEn);
      assert.equal(raw.date_meta.day_of_week_hi, tc.expectedDayHi);
      assert.equal(raw.panchang_raw.weekday, tc.expectedDayHi);
      assert.ok(raw.date_meta.vikram_samvat >= 2080);
      assert.ok(raw.date_meta.shaka_samvat >= 1940);
      assert.ok(raw.dateDisplay.includes('2026'));
      assert.ok(raw.card_1_essence.tithi.name.length > 0);
      assert.ok(raw.card_1_essence.nakshatra.name.length > 0);
      assert.ok(raw.card_2_nature.solar.sunrise.includes('AM'));
      assert.ok(raw.card_2_nature.solar.sunset.includes('PM'));
      assert.ok(raw.card_3_muhurat.choghadiya.poster_items.length >= 4);
    });
  }
});

describe('2. Dynamic Field Mapping Tests', () => {
  test('Full structured cards payload maps all 12 poster sections correctly', () => {
    const mockProps = {
      religion: 'SANATANA DHARMA',
      title: 'दीपावली (लक्ष्मी पूजन)',
      dateDisplay: '08 नवम्बर 2026',
      date_meta: {
        gregorian_date: '2026-11-08',
        day_of_week: 'Sunday',
        day_of_week_hi: 'रविवार',
        vikram_samvat: 2083,
        shaka_samvat: 1948,
        ayana: 'दक्षिणायन',
        ritu: 'हेमन्त',
        month_amanta: 'कार्तिक',
        paksha: 'कृष्ण पक्ष',
        tithi_number: 30
      },
      card_1_essence: {
        tithi: { raw_name: 'अमावस्या', name: 'कृष्ण पक्ष अमावस्या' },
        nakshatra: { name: 'स्वाति' },
        yoga: { name: 'आयुष्मान' },
        karana: { first: 'नाग' }
      },
      card_2_nature: {
        solar: { sunrise: '06:36 AM', sunset: '05:43 PM' },
        lunar: { moonrise: '05:48 AM', moonset: '05:12 PM' }
      },
      card_3_muhurat: {
        auspicious: [
          { name: 'Abhijit Muhurat', display: '11:47 AM – 12:32 PM' },
          { name: 'Amrit Kaal', display: '02:15 PM – 03:45 PM' },
          { name: 'Brahma Muhurat', display: '05:01 AM – 05:48 AM' }
        ],
        inauspicious: [
          { name: 'Rahu Kaal', display: '04:20 PM – 05:43 PM' },
          { name: 'Yamagandam', display: '12:09 PM – 01:33 PM' },
          { name: 'Gulika Kaal', display: '02:56 PM – 04:20 PM' }
        ],
        choghadiya: {
          poster_items: [
            { name: 'शुभ', display: 'शुभ का चौघड़िया 08:00 AM – 09:23 AM तक' },
            { name: 'चर', display: 'चर का चौघड़िया 12:09 PM – 01:33 PM तक' },
            { name: 'लाभ', display: 'लाभ का चौघड़िया 01:33 PM – 02:56 PM तक' },
            { name: 'अमृत', display: 'अमृत का चौघड़िया 02:56 PM – 04:20 PM तक' }
          ]
        }
      },
      card_4_cultural: {
        festivals: [{ name: 'दीपावली (लक्ष्मी पूजन)', description: 'कार्तिक अमावस्या' }],
        disha_shool: { direction: 'पश्चिम', guidance: 'आज पश्चिम दिशा में दिशा शूल रहेगा।' }
      }
    };

    const mapped = mapPanchangData(mockProps);
    assert.equal(mapped.formattedHindiDate, '08 नवम्बर 2026');
    assert.equal(mapped.hindiDay, 'रविवार');
    assert.equal(mapped.hindiMonth, 'कार्तिक माह');
    assert.equal(mapped.hindiPaksha, 'कृष्ण पक्ष');
    assert.equal(mapped.hindiTithi, 'अमावस्या तिथि');
    assert.equal(mapped.hindiNakshatra, 'स्वाति');
    assert.equal(mapped.sunrise, '06:36 AM');
    assert.equal(mapped.sunset, '05:43 PM');
    assert.equal(mapped.moonrise, '05:48 AM');
    assert.equal(mapped.moonset, '05:12 PM');
    assert.equal(mapped.abhijit, '11:47 AM – 12:32 PM');
    assert.equal(mapped.amritKaal, '02:15 PM – 03:45 PM');
    assert.equal(mapped.brahma, '05:01 AM – 05:48 AM');
    assert.equal(mapped.rahuKaal, '04:20 PM – 05:43 PM');
    assert.equal(mapped.yamagandam, '12:09 PM – 01:33 PM');
    assert.equal(mapped.gulikKaal, '02:56 PM – 04:20 PM');
    assert.equal(mapped.choghadiyaLines.length, 4);
    assert.equal(mapped.choghadiyaLines[0], 'शुभ का चौघड़िया 08:00 AM – 09:23 AM तक');
    assert.equal(mapped.festivalTitle, 'दीपावली (लक्ष्मी पूजन)');
    assert.ok(mapped.dishaGuidance.includes('पश्चिम'));
  });
});

describe('3. Missing Optional Fields Handling', () => {
  test('Empty or null props fallback to "उपलब्ध नहीं" with zero hardcoded leaks', () => {
    const emptyProps = {};
    const mapped = mapPanchangData(emptyProps);

    assert.equal(mapped.formattedHindiDate, 'उपलब्ध नहीं');
    assert.equal(mapped.hindiDay, 'उपलब्ध नहीं');
    assert.equal(mapped.hindiMonth, 'उपलब्ध नहीं');
    assert.equal(mapped.hindiPaksha, 'उपलब्ध नहीं');
    assert.equal(mapped.hindiTithi, 'उपलब्ध नहीं');
    assert.equal(mapped.hindiNakshatra, 'उपलब्ध नहीं');
    assert.equal(mapped.sunrise, 'उपलब्ध नहीं');
    assert.equal(mapped.sunset, 'उपलब्ध नहीं');
    assert.equal(mapped.moonrise, 'उपलब्ध नहीं');
    assert.equal(mapped.moonset, 'उपलब्ध नहीं');
    assert.equal(mapped.abhijit, 'उपलब्ध नहीं');
    assert.equal(mapped.amritKaal, 'उपलब्ध नहीं');
    assert.equal(mapped.brahma, 'उपलब्ध नहीं');
    assert.equal(mapped.rahuKaal, 'उपलब्ध नहीं');
    assert.equal(mapped.yamagandam, 'उपलब्ध नहीं');
    assert.equal(mapped.gulikKaal, 'उपलब्ध नहीं');
    assert.equal(mapped.festivalTitle, 'कोई प्रमुख व्रत या पर्व नहीं');
    assert.equal(mapped.dishaGuidance, 'दिशा शूल की जानकारी उपलब्ध नहीं है।');
    assert.equal(mapped.choghadiyaLines[0], 'शुभ का चौघड़िया उपलब्ध नहीं');
  });

  test('Missing moonrise or abhijit does not cause fabricated timings in narration', () => {
    const partialData = {
      dateDisplay: '04 नवम्बर 2026',
      panchang_raw: {
        weekday: 'बुधवार',
        hindu_month: 'कार्तिक',
        paksha: 'कृष्ण पक्ष',
        tithi_clean: 'एकादशी',
        sunrise: '06:33 AM',
        sunset: '05:46 PM'
        // moonrise, abhijit missing intentionally
      }
    };

    const narration40 = buildHindiNarration(partialData, 40);
    const narration60 = buildHindiNarration(partialData, 60);

    // Narration must never speak "उपलब्ध नहीं"
    assert.ok(!narration40.includes('उपलब्ध नहीं'), '40s narration should not contain "उपलब्ध नहीं"');
    assert.ok(!narration60.includes('उपलब्ध नहीं'), '60s narration should not contain "उपलब्ध नहीं"');
    // Narration must contain the present values
    assert.ok(narration40.includes('04 नवम्बर 2026'));
    assert.ok(narration40.includes('बुधवार'));
    assert.ok(narration60.includes('कार्तिक'));
  });
});

describe('4. Time Formatting and Midnight-Crossing Ranges', () => {
  test('formatTime12h handles various formats and ranges across midnight', () => {
    assert.equal(formatTime12h(undefined), 'उपलब्ध नहीं');
    assert.equal(formatTime12h(''), 'उपलब्ध नहीं');
    assert.equal(formatTime12h('—'), 'उपलब्ध नहीं');
    assert.equal(formatTime12h('06:24 AM'), '06:24 AM');
    assert.equal(formatTime12h('18:30:00'), '06:30 PM');
    assert.equal(formatTime12h('00:15:00'), '12:15 AM');
    assert.equal(formatTime12h('11:49 AM से 12:35 PM'), '11:49 AM – 12:35 PM');
    assert.equal(formatTime12h('11:45 PM – 01:15 AM'), '11:45 PM – 01:15 AM');
    assert.equal(formatTime12h('23:30:00 – 01:30:00'), '11:30 PM – 01:30 AM');
  });
});

describe('5. Source Code Audit: No Hardcoded Panchang Timings in Poster', () => {
  test('src/PanchangVideo.tsx contains zero hardcoded fallback timing literals', () => {
    const videoSource = fs.readFileSync(path.resolve('./src/PanchangVideo.tsx'), 'utf8');

    const bannedLiterals = [
      "'06:23 AM'",
      "'05:56 PM'",
      "'12:23 PM'",
      "'10:36 PM'",
      "'11:43 AM – 12:29 PM'",
      "'02:10 AM – 03:40 AM'",
      "'04:51 AM – 05:40 AM'",
      "'09:17 AM – 10:40 AM'",
      "'01:32 PM – 02:56 PM'",
      "'06:28 AM – 07:52 AM'",
      "'2026-10-17'",
      "'शारदीय नवरात्रि का सातवें दिन (माँ कालरात्रि की पूजा)'",
      "शुभ का चौघड़िया 07:51 AM–09:16 AM तक"
    ];

    for (const lit of bannedLiterals) {
      assert.ok(
        !videoSource.includes(lit),
        `Banned hardcoded literal found in PanchangVideo.tsx: ${lit}`
      );
    }
  });
});

describe('6. Narration and Poster Data Consistency', () => {
  test('Narration text reflects the exact date, tithi, nakshatra, and muhurat values', () => {
    const dateData = {
      dateDisplay: '17 अक्टूबर 2026',
      title: 'दैनिक पंचांग (आश्विन)',
      date_meta: {
        gregorian_date: '2026-10-17',
        day_of_week_hi: 'शनिवार',
        paksha: 'शुक्ल पक्ष'
      },
      card_1_essence: {
        tithi: { raw_name: 'सप्तमी' },
        nakshatra: { name: 'मूल' },
        yoga: { name: 'अतिगण्ड' },
        karana: { first: 'गर' }
      },
      card_2_nature: {
        solar: { sunrise: '06:24 AM', sunset: '05:59 PM' },
        lunar: { moonrise: '12:14 PM', moonset: '10:55 PM' }
      },
      card_3_muhurat: {
        auspicious: [
          { name: 'Abhijit Muhurat', display: '11:49 AM – 12:35 PM' },
          { name: 'Brahma Muhurat', display: '04:48 AM – 05:36 AM' }
        ],
        inauspicious: [
          { name: 'Rahu Kaal', display: '09:18 AM – 10:45 AM' },
          { name: 'Yamagandam', display: '01:39 PM – 03:06 PM' }
        ]
      },
      card_4_cultural: {
        disha_shool: { direction: 'पूर्व' }
      }
    };

    const n40 = buildHindiNarration(dateData, 40);
    const n60 = buildHindiNarration(dateData, 60);

    // Verify 40s contains key essentials
    assert.ok(n40.includes('17 अक्टूबर 2026'));
    assert.ok(n40.includes('शनिवार'));
    assert.ok(n40.includes('सप्तमी'));
    assert.ok(n40.includes('मूल'));
    assert.ok(n40.includes('सुबह 6:24'));
    assert.ok(n40.includes('11:49'));
    assert.ok(n40.includes('सुबह 9:18 से 10:45 तक'));
    assert.ok(n40.startsWith('आज राहुकाल'), '40s narration must open with the Rahu Kaal hook');
    assert.ok(!/\b(AM|PM)\b/.test(n40 + n60), 'narration must not read AM/PM in English');
    assert.ok(n40.includes('पूर्व'));
    assert.ok(n40.includes('जय श्री राम'));

    // Verify 60s contains expanded details
    assert.ok(n60.includes('अतिगण्ड'));
    assert.ok(n60.includes('गर'));
    assert.ok(n60.includes('12:14'));
    assert.ok(n60.includes('10:55'));
    assert.ok(n60.includes('ब्रह्म मुहूर्त'));
    assert.ok(n60.includes('यमगण्ड'));
    assert.ok(n60.includes('ॐ नमो भगवते वासुदेवाय नमः'));
  });
});

describe('7. Full-Poster Structure & Approved Visual Ornaments Regression Test', () => {
  test('PanchangVideo preserves all required ornamental and structural elements', () => {
    const src = fs.readFileSync(path.resolve('./src/PanchangVideo.tsx'), 'utf8');

    // Mandala background
    assert.ok(src.includes('mandala-bg.jpg'), 'Mandala wallpaper layer preserved');
    // Gold ornamental borders
    assert.ok(src.includes('victorian_corner_1.svg'), 'Victorian corner flourishes preserved');
    assert.ok(src.includes('victorian_bar_2.svg'), 'Victorian divider bar preserved');
    // Marigold garlands & hanging bells
    assert.ok(src.includes('marigold_garland.png'), 'Marigold garland preserved');
    assert.ok(src.includes('SwayingBell'), 'Swaying bell component preserved');
    // Mangal Kalash & Diya
    assert.ok(src.includes('MangalKalash'), 'Mangal Kalash component preserved');
    assert.ok(src.includes('GlowingDiya'), 'Glowing Diya component preserved');
    // Progress bar at bottom
    assert.ok(src.includes('progressPct'), 'Timeline progress bar preserved');
    // All 7 sections
    assert.ok(src.includes('SECTION 1: CORE PANCHANG'));
    assert.ok(src.includes('SECTION 2: SURYA & CHANDRA TIMINGS'));
    assert.ok(src.includes('SECTION 3: SHUBH KAAL'));
    assert.ok(src.includes('SECTION 4: ASHUBH KAAL'));
    assert.ok(src.includes('SECTION 5: SLOT-SPECIFIC HIGHLIGHTS'));
    assert.ok(src.includes('SECTION 6: DISHA SHOOL & VISHESH PARV'));
    assert.ok(src.includes('SECTION 7: DEVOTIONAL ORNAMENTS'));
  });
});

describe('8. YouTube daily publishing gates', () => {
  test('scheduled runs always upload; manual runs upload unless publish is unticked', () => {
    const workflow = fs.readFileSync(path.resolve('./.github/workflows/daily-shorts-publisher.yml'), 'utf8');
    const pipeline = fs.readFileSync(path.resolve('./src/pipeline.js'), 'utf8');

    assert.ok(workflow.includes("AUTO_PUBLISH: 'true'"));
    assert.ok(workflow.includes("REQUEST_UPLOAD: ${{ github.event_name == 'schedule' || inputs.publish == true }}"));
    assert.match(workflow, /publish:\n\s+description:[^\n]*\n\s+required: true\n\s+default: true/);
    assert.ok(workflow.includes("PANCHANG_LOCATION_CONFIGURED: 'true'"));

    // The application still requires both gates before calling YouTube.
    assert.ok(pipeline.includes('if (uploadRequested && autoPublishEnabled)'));
  });
});
