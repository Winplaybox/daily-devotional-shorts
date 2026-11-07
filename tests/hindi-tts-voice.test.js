import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHindiTtsArgs, resolveHindiTtsVoice } from '../src/pipeline.js';

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
    rate: '+18%',
    outputPath: 'out/narration.mp3',
  });

  assert.deepEqual(args, [
    '-m', 'edge_tts',
    '--voice', 'hi-IN-SwaraNeural',
    '--rate=+18%',
    '--text', narration,
    '--write-media', 'out/narration.mp3',
  ]);
  assert.equal(args.filter((value) => value === narration).length, 1);
});

test('rejects empty narration, missing output path and unconfigured speech rates', () => {
  assert.throws(() => buildHindiTtsArgs({ text: '', rate: '+18%', outputPath: 'out.mp3' }), TypeError);
  assert.throws(() => buildHindiTtsArgs({ text: 'नमस्कार', rate: '+18%', outputPath: '' }), TypeError);
  assert.throws(() => buildHindiTtsArgs({ text: 'नमस्कार', rate: '+50%', outputPath: 'out.mp3' }), TypeError);
});
