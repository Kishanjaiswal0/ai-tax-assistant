// src/utils/languageDetection.js - Smart language detection
export const detectLanguage = (text) => {
  if (!text) return 'en';

  // Devanagari script detection (Hindi/Marathi)
  const devanagariPattern = /[\u0900-\u097F]/g;
  const devanagariChars = (text.match(devanagariPattern) || []).length;
  const devanagariRatio = devanagariChars / text.length;

  if (devanagariRatio > 0.3) return 'hi';

  // Hinglish detection (Hindi + English mix)
  const hinglishPatterns = [
    /\b(namaste|haan|nahi|kya|aap|tera|mera|kaise|kitna|lakhs|crore)\b/gi,
    /\b(tax|income|deduction|itr|regime)\b.*[\u0900-\u097F]/gi,
  ];

  const hinglishMatches = hinglishPatterns.reduce((count, pattern) => {
    return count + (text.match(pattern) || []).length;
  }, 0);

  if (hinglishMatches > 0) return 'hi';

  return 'en';
};

export const isHindiOrHinglish = (text) => {
  const detected = detectLanguage(text);
  return detected === 'hi';
};
