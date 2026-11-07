import test from "node:test";
import assert from "node:assert/strict";
import { validateRenderedVideoMetadata } from "../src/video/render-qc.js";

const validProbe = {
  format: { duration: "39.8" },
  streams: [
    { codec_type: "video", width: 1080, height: 1920 },
    { codec_type: "audio" },
  ],
};

test("accepts a valid 1080x1920 video with audio and expected duration", () => {
  const result = validateRenderedVideoMetadata({ fileSize: 12345, probe: validProbe, expectedDurationSeconds: 40 });
  assert.equal(result.width, 1080);
  assert.equal(result.hasAudio, true);
});

test("rejects empty files, missing audio, wrong dimensions and wrong duration", () => {
  assert.throws(() => validateRenderedVideoMetadata({ fileSize: 0, probe: validProbe, expectedDurationSeconds: 40 }), /missing or empty/);
  assert.throws(() => validateRenderedVideoMetadata({ fileSize: 1, probe: { ...validProbe, streams: [validProbe.streams[0]] }, expectedDurationSeconds: 40 }), /no audio stream/);
  assert.throws(() => validateRenderedVideoMetadata({ fileSize: 1, probe: { ...validProbe, streams: [{ ...validProbe.streams[0], width: 720 }] }, expectedDurationSeconds: 40 }), /1080x1920/);
  assert.throws(() => validateRenderedVideoMetadata({ fileSize: 1, probe: { ...validProbe, format: { duration: "25" } }, expectedDurationSeconds: 40 }), /outside the expected/);
});
