// src/utils/languageDetection.js - Smart language detection (en / hi / bhojpuri)

// Common romanized Bhojpuri words that are distinct from Hindi
const BHOJPURI_KEYWORDS = [
  'hamra','hamar','hamke','tohar','tohre','kaisan','kaisi',
  'bani','bate','kari','chalat','chalte','naikhe','haa',
  'jai hind','raura','hau','aahe','bada','lagata','bada ba',
  'kha','piya','bhail','bhailau','banal','banl'
];

// Common romanized Punjabi words distinct enough to identify
const PUNJABI_KEYWORDS = [
  'tussi','tenu','menu','assi','karo','kita','paise','rupaye',
  'lagda','lagdi','kiddan','shukriya','sat sri akal','waheguru',
  'kive','changa','oye','paisa','dass','dasso'
];

/**
 * Detects the language of a given text string.
 * @returns {'en'|'hi'|'bhojpuri'|'punjabi'}
 */
export const detectLanguage = (text) => {
  if (!text) return 'en';

  // 1. Gurmukhi script detection (Punjabi)
  const gurmukhiCount = (text.match(/[\u0A00-\u0A7F]/g) || []).length;
  if (text.length > 0 && gurmukhiCount / text.length > 0.15) return 'punjabi';

  // 2. Devanagari script detection – broad Hindi/Bhojpuri bucket
  const devanagariPattern = /[\u0900-\u097F]/g;
  const devanagariChars   = (text.match(devanagariPattern) || []).length;
  const devanagariRatio   = devanagariChars / text.length;
  if (devanagariRatio > 0.3) return 'hi';

  const lower = text.toLowerCase();

  // 3. Romanized Punjabi keyword detection (2+ words = Punjabi)
  const punjabiHits = PUNJABI_KEYWORDS.filter(w => lower.includes(w)).length;
  if (punjabiHits >= 2) return 'punjabi';

  // 4. Romanized Bhojpuri keyword detection (2+ distinct words = Bhojpuri)
  const bhojpuriHits = BHOJPURI_KEYWORDS.filter(w => lower.includes(w)).length;
  if (bhojpuriHits >= 2) return 'bhojpuri';

  // 5. Hinglish detection (Hindi + English mix)
  const hinglishPatterns = [
    /\b(namaste|haan|nahi|kya|aap|tera|mera|kaise|kitna|lakhs|crore)\b/gi,
    /\b(tax|income|deduction|itr|regime)\b.*[\u0900-\u097F]/gi,
  ];
  const hinglishMatches = hinglishPatterns.reduce(
    (count, pattern) => count + (text.match(pattern) || []).length, 0
  );
  if (hinglishMatches > 0) return 'hi';

  return 'en';
};

export const isHindiOrHinglish = (text) => {
  const detected = detectLanguage(text);
  return detected === 'hi' || detected === 'bhojpuri';
};

export const isBhojpuri  = (text) => detectLanguage(text) === 'bhojpuri';
export const isPunjabi   = (text) => detectLanguage(text) === 'punjabi';
