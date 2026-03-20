'use strict';

/**
 * Calculate word-by-word timings from narration text and audio duration.
 *
 * Uses a heuristic that adds weight to punctuation pauses:
 *  - period/question/exclamation: +300ms pause
 *  - comma/semicolon: +150ms pause
 *
 * Returns array of { word, startMs, endMs, progress } for subtitle rendering.
 */
function calculateWordTimings(text, durationMs) {
  if (!text || durationMs <= 0) return [];

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // Assign relative weight to each word based on length + punctuation pause
  const weights = words.map(w => {
    let weight = Math.max(w.length, 2); // min 2 chars equivalent
    const lastChar = w[w.length - 1];
    if ('.!?'.includes(lastChar)) weight += 6; // ~300ms at avg rate
    else if (',;:'.includes(lastChar)) weight += 3; // ~150ms at avg rate
    return weight;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const timings = [];
  let currentMs = 0;

  for (let i = 0; i < words.length; i++) {
    const wordDuration = (weights[i] / totalWeight) * durationMs;
    timings.push({
      word: words[i],
      index: i,
      startMs: Math.round(currentMs),
      endMs: Math.round(currentMs + wordDuration),
      progress: currentMs / durationMs
    });
    currentMs += wordDuration;
  }

  return timings;
}

/**
 * Split text into sentences for subtitle display.
 * Returns array of { text, words[], startMs, endMs }.
 */
function calculateSentenceTimings(text, durationMs) {
  const wordTimings = calculateWordTimings(text, durationMs);
  if (wordTimings.length === 0) return [];

  // Split into sentences
  const sentences = (text.match(/[^.!?]+[.!?]+[\s]?|[^.!?]+$/g) || [text])
    .map(s => s.trim()).filter(Boolean);

  const result = [];
  let wordIdx = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).filter(Boolean);
    const sentenceTimings = wordTimings.slice(wordIdx, wordIdx + sentenceWords.length);
    if (sentenceTimings.length > 0) {
      result.push({
        text: sentence,
        words: sentenceTimings,
        startMs: sentenceTimings[0].startMs,
        endMs: sentenceTimings[sentenceTimings.length - 1].endMs
      });
    }
    wordIdx += sentenceWords.length;
  }

  return result;
}

/**
 * Get the current subtitle state at a given time.
 * Returns { sentence, activeWordIndex, words[] } or null.
 */
function getSubtitleAt(sentenceTimings, timeMs) {
  for (const sentence of sentenceTimings) {
    if (timeMs >= sentence.startMs && timeMs <= sentence.endMs) {
      let activeWordIndex = 0;
      for (let i = 0; i < sentence.words.length; i++) {
        if (timeMs >= sentence.words[i].startMs) activeWordIndex = i;
      }
      return { sentence: sentence.text, activeWordIndex, words: sentence.words };
    }
  }
  return null;
}

module.exports = { calculateWordTimings, calculateSentenceTimings, getSubtitleAt };
