// src/utils/textToSpeech.js - Web Speech API wrapper
export const speak = (text, lang = 'en-IN', onEnd = null) => {
  // Cancel any ongoing speech
  window.speechSynthesis?.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'bhojpuri' ? 'hi-IN' : 'en-IN';
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  if (onEnd) {
    utterance.onend = onEnd;
  }

  try {
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error('TTS Error:', err);
    return false;
  }
};

export const stopSpeech = () => {
  try {
    window.speechSynthesis?.cancel();
    return true;
  } catch (err) {
    console.error('Stop TTS Error:', err);
    return false;
  }
};

export const isSpeaking = () => {
  return window.speechSynthesis?.speaking || false;
};

export const isTTSSupported = () => {
  return !!window.speechSynthesis;
};
