// src/utils/textToSpeech.js - Web Speech API wrapper
// Supports: en-IN · hi-IN · pa-IN (Punjabi, with hi-IN fallback)

// ─── VOICE LOCALE RESOLUTION ──────────────────────────────────

/**
 * Resolve the preferred BCP-47 locale for SpeechSynthesis output.
 * Bhojpuri → hi-IN (Devanagari/Hindi voice is the closest match).
 * Punjabi  → pa-IN (preferred); browser will fall back via VOICE_FALLBACKS.
 */
export const resolveVoiceLocale = (lang = 'en') => {
  switch (lang) {
    case 'hi':
    case 'bhojpuri': return 'hi-IN';
    case 'punjabi':  return 'pa-IN';
    case 'en':
    default:         return 'en-IN';
  }
};

/**
 * Resolve the BCP-47 locale for SpeechRecognition (microphone input).
 */
export const getSpeechRecognitionLocale = (lang = 'en') => {
  switch (lang) {
    case 'hi':
    case 'bhojpuri': return 'hi-IN';
    case 'punjabi':  return 'pa-IN';
    case 'en':
    default:         return 'en-IN';
  }
};

// ─── VOICE FALLBACK CHAINS ────────────────────────────────────
// pa-IN (Punjabi) is NOT shipped in Chrome/Edge/Firefox by default.
// We cascade through alternatives so the user always hears audio.
const VOICE_FALLBACKS = {
  'pa-IN': ['pa-IN', 'pa', 'hi-IN', 'hi', 'en-IN', 'en-US'],
  'hi-IN': ['hi-IN', 'hi', 'en-IN', 'en-US'],
  'en-IN': ['en-IN', 'en-GB', 'en-US', 'en'],
};

/**
 * Find the best available browser voice for a given BCP-47 locale.
 * Falls through the VOICE_FALLBACKS chain until a match is found.
 * Returns null if no voice is available at all (browser will use default).
 */
const findBestVoice = (voices, bcp47) => {
  if (!voices || !voices.length) return null;
  const chain = VOICE_FALLBACKS[bcp47] || [bcp47, bcp47.split('-')[0]];
  for (const locale of chain) {
    // Exact match first
    const exact = voices.find(v => v.lang === locale);
    if (exact) return exact;
    // Prefix match (e.g. 'pa' matches 'pa-Guru-IN' on some systems)
    const prefix = voices.find(v => v.lang.startsWith(locale.split('-')[0]));
    if (prefix) return prefix;
  }
  return null;
};

// ─── CORE SPEAK IMPLEMENTATION ────────────────────────────────
const _doSpeak = (text, bcp47, onEnd) => {
  const utterance   = new SpeechSynthesisUtterance(text);
  utterance.lang    = bcp47;
  utterance.rate    = 1;
  utterance.pitch   = 1;
  utterance.volume  = 1;
  if (onEnd) utterance.onend = onEnd;

  const voices = window.speechSynthesis.getVoices();
  const voice  = findBestVoice(voices, bcp47);
  if (voice) {
    utterance.voice = voice;
    // Re-set lang to the actual voice locale so the engine is happy
    utterance.lang  = voice.lang;
  }

  window.speechSynthesis.speak(utterance);
};

// ─── PUBLIC API ───────────────────────────────────────────────

/**
 * Speak text using the Web Speech API.
 * Handles async voice loading and pa-IN → hi-IN fallback automatically.
 *
 * @param {string}   text  - Plain text (strip markdown before calling)
 * @param {string}   lang  - Short code ('en'|'hi'|'bhojpuri'|'punjabi')
 *                          OR full BCP-47 tag ('en-IN','hi-IN','pa-IN')
 * @param {Function} onEnd - Called when speech finishes
 */
export const speak = (text, lang = 'en-IN', onEnd = null) => {
  if (!window.speechSynthesis) return false;

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  const bcp47  = lang.includes('-') ? lang : resolveVoiceLocale(lang);
  const voices = window.speechSynthesis.getVoices();

  if (voices.length > 0) {
    // Voices already loaded — speak immediately
    try {
      _doSpeak(text, bcp47, onEnd);
      return true;
    } catch (err) {
      console.error('[TTS] Speak error:', err);
      return false;
    }
  }

  // Voices not yet loaded (first call) — wait for voiceschanged event
  const onVoicesReady = () => {
    try {
      _doSpeak(text, bcp47, onEnd);
    } catch (err) {
      console.error('[TTS] Speak error (deferred):', err);
    }
  };
  window.speechSynthesis.addEventListener('voiceschanged', onVoicesReady, { once: true });
  return true;
};

export const stopSpeech = () => {
  try {
    window.speechSynthesis?.cancel();
    return true;
  } catch (err) {
    console.error('[TTS] Stop error:', err);
    return false;
  }
};

export const isSpeaking     = () => window.speechSynthesis?.speaking || false;
export const isTTSSupported = () => !!window.speechSynthesis;
