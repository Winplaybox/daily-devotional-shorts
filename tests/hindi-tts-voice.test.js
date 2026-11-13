import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHindiNarration, buildHindiTtsArgs, resolveHindiTtsVoice } from '../src/pipeline.js';
import { getAfternoonSlotContent } from '../src/editorial/slot-content.js';

test('defaults narration to the approved Hindi neural voice', () => {
  assert.equal(resolveHindiTtsVoice(''), 'hi-IN-SwaraNeural');
  assert.equal(resolveHindiTtsVoice('   '), 'hi-IN-SwaraNeural');
});

test('accepts an explicitly configured supported Hindi neural voice', () => {
  assert.equal(resolveHindiTtsVoice('hi-IN-MadhurNeural'), 'hi-IN-MadhurNeural');
});

test('rejects English and unknown voice overrides', () => {
  assert.equal(resolveHindiTtsVoice('en-US-AriaNeural'), 'hi-IN-SwaraNeural');
  assert.equal(resolveHindiTtsVoice('hi-IN-UnknownNeural'), 'hi-IN-SwaraNeural');
  assert.equal(resolveHindiTtsVoice('hi-IN-Swara'), 'hi-IN-SwaraNeural');
});

test('builds argv for Edge TTS without shell interpolation of narration text', () => {
  const narration = 'नमस्कार। आज का पंचांग; $(echo should-not-run) "विशेष"';
  const args = buildHindiTtsArgs({
    configuredVoice: 'en-US-AriaNeural',
    text: narration,
    rate: '+10%',
    outputPath: 'out/narration.mp3',
  });

  assert.deepEqual(args, [
    '-m', 'edge_tts',
    '--voice', 'hi-IN-SwaraNeural',
    '--rate=+10%',
    '--text', narration,
    '--write-media', 'out/narration.mp3',
  ]);
  assert.equal(args.filter((value) => value === narration).length, 1);
});

test('rejects empty narration, missing output path and unconfigured speech rates', () => {
  assert.throws(() => buildHindiTtsArgs({ text: '', rate: '+10%', outputPath: 'out.mp3' }), TypeError);
  assert.throws(() => buildHindiTtsArgs({ text: 'नमस्कार', rate: '+10%', outputPath: '' }), TypeError);
  assert.throws(() => buildHindiTtsArgs({ text: 'नमस्कार', rate: '+50%', outputPath: 'out.mp3' }), TypeError);
});


const afternoonSlotFixture = {
  slot: 'afternoon',
  title: 'आज का शुभ चौघड़िया (मंगलवार)',
  dateDisplay: '10 नवंबर 2026',
  date_meta: { day_of_week_hi: 'मंगलवार', month_amanta: 'कार्तिक', paksha: 'शुक्ल पक्ष' },
  card_1_essence: {
    tithi: { raw_name: 'प्रतिपदा' },
    nakshatra: { name: 'विशाखा' },
  },
  label1: 'अमृत चौघड़िया',
  val1: '12:10 PM से 01:34 PM',
  label2: 'शुभ चौघड़िया',
  val2: '02:57 PM से 04:20 PM',
  label3: 'शुभ अभिजीत मुहूर्त',
  val3: '11:48 AM से 12:32 PM',
  footer: 'दिशाशूल: उत्तर दिशा | राहुकाल: 02:57 PM से 04:20 PM',
};

test('afternoon poster content uses its own title and all three editorial highlights', () => {
  const content = getAfternoonSlotContent(afternoonSlotFixture);
  assert.equal(content.title, afternoonSlotFixture.title);
  assert.deepEqual(content.highlights, [
    { label: 'अमृत चौघड़िया', value: '12:10 PM से 01:34 PM' },
    { label: 'शुभ चौघड़िया', value: '02:57 PM से 04:20 PM' },
    { label: 'शुभ अभिजीत मुहूर्त', value: '11:48 AM से 12:32 PM' },
  ]);
  assert.equal(content.footer, afternoonSlotFixture.footer);
});

test('afternoon narration speaks its slot-specific title and values instead of the generic morning script', () => {
  const afternoonText = buildHindiNarration(afternoonSlotFixture, 40);
  const morningText = buildHindiNarration({
    ...afternoonSlotFixture,
    slot: 'morning',
    title: 'गोवर्धन पूजा / अन्नकूट महोत्सव',
  }, 40);

  assert.notEqual(afternoonText, morningText);
  assert.ok(afternoonText.includes('आज का शुभ चौघड़िया'));
  assert.ok(afternoonText.includes('अमृत चौघड़िया'));
  assert.ok(afternoonText.includes('दोपहर 12:10 से 1:34 तक'));
  assert.ok(afternoonText.includes('शुभ चौघड़िया'));
  assert.ok(afternoonText.includes('दोपहर 2:57 से शाम 4:20 तक'));
  assert.ok(afternoonText.includes('शुभ अभिजीत मुहूर्त'));
  assert.ok(afternoonText.includes('सुबह 11:48 से दोपहर 12:32 तक'));
  assert.ok(!/\b(AM|PM)\b/.test(afternoonText), 'narration must not read AM/PM in English');
  assert.ok(!morningText.includes('अमृत चौघड़िया'));
});

test('afternoon poster component renders the validated slot-specific content', () => {
  const source = fs.readFileSync(new URL('../src/PanchangVideo.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('getAfternoonSlotContent(props)'));
  assert.ok(source.includes('afternoonSlotContent.title'));
  assert.ok(source.includes('afternoonSlotContent.highlights.map'));
});

test('afternoon slot fails closed when its three labelled time highlights are incomplete', () => {
  assert.throws(
    () => getAfternoonSlotContent({ ...afternoonSlotFixture, val2: '' }),
    /exactly three labelled time highlights/,
  );
  assert.equal(getAfternoonSlotContent({ ...afternoonSlotFixture, slot: 'morning' }), null);
});

test('TTS provider order is Kokoro, then Gemini, then Edge, with Edge always last', async () => {
  const { resolveTtsProviders } = await import('../src/pipeline.js');
  assert.deepEqual(resolveTtsProviders(''), ['kokoro', 'gemini', 'edge']);
  assert.deepEqual(resolveTtsProviders('gemini,kokoro'), ['gemini', 'kokoro', 'edge']);
  assert.deepEqual(resolveTtsProviders('edge'), ['edge']);
  assert.deepEqual(resolveTtsProviders('bogus'), ['kokoro', 'gemini', 'edge']);
});

test('rejects narration audio that is implausible for the script or cannot fit the video', async () => {
  const { isAcceptableNarrationDuration } = await import('../src/pipeline.js');
  const text = 'क'.repeat(245); // ~35s of Hindi speech
  assert.equal(isAcceptableNarrationDuration({ seconds: 35, text, targetSec: 36.5, maxTempo: 1.12 }), true);
  assert.equal(isAcceptableNarrationDuration({ seconds: 12, text, targetSec: 36.5, maxTempo: 1.12 }), false); // truncated / wrong language
  assert.equal(isAcceptableNarrationDuration({ seconds: 48, text, targetSec: 36.5, maxTempo: 1.12 }), false); // too long to fit
  assert.equal(isAcceptableNarrationDuration({ seconds: NaN, text, targetSec: 36.5, maxTempo: 1.12 }), false);
});
