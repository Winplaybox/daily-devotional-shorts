import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHindiTtsVoice } from '../src/pipeline.js';

test('defaults narration to a Hindi neural voice', () => {
  assert.equal(resolveHindiTtsVoice(''), 'hi-IN-SwaraNeural');
});

test('accepts an explicitly configured Hindi neural voice', () => {
  assert.equal(resolveHindiTtsVoice('hi-IN-MadhurNeural'), 'hi-IN-MadhurNeural');
});

test('rejects English and malformed voice overrides', () => {
  assert.equal(resolveHindiTtsVoice('en-US-AriaNeural'), 'hi-IN-SwaraNeural');
  assert.equal(resolveHindiTtsVoice('hi-IN-Swara'), 'hi-IN-SwaraNeural');
});
