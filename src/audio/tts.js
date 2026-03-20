'use strict';

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const TTS_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';
const CHUNK_MAX_CHARS = 1500;

// Wrap raw PCM data in a WAV header
function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

// Get WAV duration from buffer
function getWavDuration(wavBuffer) {
  if (wavBuffer.length < 44) return 0;
  const sampleRate = wavBuffer.readUInt32LE(24);
  const bitsPerSample = wavBuffer.readUInt16LE(34);
  const numChannels = wavBuffer.readUInt16LE(22);
  const dataSize = wavBuffer.readUInt32LE(40);
  const bytesPerSample = bitsPerSample / 8;
  return dataSize / (sampleRate * numChannels * bytesPerSample);
}

async function callGeminiTTS(text, speechConfig, apiKey) {
  const res = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig }
    }),
    signal: AbortSignal.timeout(120000)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini TTS API ${res.status}: ${err.substring(0, 200)}`);
  }

  const data = await res.json();
  const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!audioData?.data) throw new Error('No audio data returned from Gemini TTS');

  return Buffer.from(audioData.data, 'base64');
}

function splitIntoChunks(text) {
  if (text.length <= CHUNK_MAX_CHARS) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if (current.length + s.length > CHUNK_MAX_CHARS && current) {
      chunks.push(current);
      current = s;
    } else {
      current += (current ? ' ' : '') + s;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Generate TTS audio for text and save as WAV.
 *
 * @param {string} text - Text to synthesize
 * @param {object} options
 * @param {string} options.voice - Gemini voice name (default 'Kore')
 * @param {string} options.outputDir - Directory to save WAV file
 * @param {string} options.filename - Optional filename (default: uuid.wav)
 * @param {string} options.apiKey - Gemini API key (default: GEMINI_API_KEY env)
 * @returns {Promise<{path: string, duration: number, wordCount: number}>}
 */
async function generateTTS(text, options = {}) {
  const {
    voice = 'Kore',
    outputDir = process.cwd(),
    filename,
    apiKey = process.env.GEMINI_API_KEY
  } = options;

  if (!apiKey) throw new Error('Gemini API key required (set GEMINI_API_KEY or pass options.apiKey)');
  if (!text || !text.trim()) throw new Error('Text is required for TTS generation');

  const speechConfig = {
    voiceConfig: {
      prebuiltVoiceConfig: { voiceName: voice }
    }
  };

  const chunks = splitIntoChunks(text);
  console.log(`[vforge:tts] ${chunks.length} chunk(s), ${text.length} chars`);

  const pcmBuffers = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[vforge:tts] Chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
    const buf = await callGeminiTTS(chunks[i], speechConfig, apiKey);
    pcmBuffers.push(buf);

    // Rate limiting pause between chunks
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const combinedPCM = Buffer.concat(pcmBuffers);
  const wavBuffer = pcmToWav(combinedPCM, 24000, 1, 16);
  const duration = getWavDuration(wavBuffer);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outFile = filename || `${uuidv4()}.wav`;
  const outPath = path.join(outputDir, outFile);
  fs.writeFileSync(outPath, wavBuffer);

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  console.log(`[vforge:tts] Saved: ${outPath} (${duration.toFixed(1)}s, ${wordCount} words)`);

  return { path: outPath, duration, wordCount };
}

/**
 * Generate TTS for all scenes in a project.
 */
async function generateProjectTTS(project) {
  const outputDir = path.join(project._dir, 'audio');

  for (let i = 0; i < project.scenes.length; i++) {
    const scene = project.scenes[i];
    if (!scene.narration) {
      console.log(`[vforge:tts] Scene "${scene.id}": no narration, skipping`);
      continue;
    }

    console.log(`[vforge:tts] Scene "${scene.id}" (${i + 1}/${project.scenes.length})...`);
    const result = await generateTTS(scene.narration, {
      voice: project.audio?.tts?.voice || 'Kore',
      outputDir,
      filename: `${scene.id}.wav`,
      apiKey: project.audio?.tts?.apiKey
    });

    scene._audioPath = result.path;
    scene._audioDuration = result.duration;
    scene._wordCount = result.wordCount;

    // Pause between scenes
    if (i < project.scenes.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return project;
}

module.exports = { generateTTS, generateProjectTTS, pcmToWav, getWavDuration };
