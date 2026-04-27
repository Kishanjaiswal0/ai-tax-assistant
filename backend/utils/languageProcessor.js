// utils/languageProcessor.js
// ─── LANGUAGE PRE-PROCESSING LAYER ────────────────────────────
// Adds a language-constraint prefix to the user message so the AI
// always responds in the correct language. Pure additive — does NOT
// touch existing API call logic.
// ──────────────────────────────────────────────────────────────

/**
 * Maps a language code to a Devanagari / Latin script range for
 * basic auto-detection when `language === 'auto'`.
 */
const detectLanguageFromText = (text = '') => {
  // Devanagari block: U+0900–U+097F (Hindi, Bhojpuri written in Devanagari)
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const devanagariRatio = text.length > 0 ? devanagariCount / text.length : 0;
  if (devanagariRatio > 0.25) return 'hi';

  // Gurmukhi block: U+0A00–U+0A7F (Punjabi script)
  const gurmukhiCount = (text.match(/[\u0A00-\u0A7F]/g) || []).length;
  const gurmukhiRatio = text.length > 0 ? gurmukhiCount / text.length : 0;
  if (gurmukhiRatio > 0.15) return 'punjabi';

  // Common Bhojpuri romanized words (a small curated list)
  const bhojpuriPattern =
    /\b(hamra|hamar|hamke|tohar|tohre|kaisan|kaisi|bani|bate|kari|chalat|chalte|jai|raho|kuch|naikhe|na|ba|haa)\b/gi;
  if ((text.match(bhojpuriPattern) || []).length >= 2) return 'bhojpuri';

  // Common romanized Punjabi words
  const punjabiPattern =
    /\b(tussi|tenu|menu|assi|karo|kita|paise|rupaye|lagda|lagdi|nahi|haan|kyon|kive|kiddan|shukriya|sat sri akal|waheguru)\b/gi;
  if ((text.match(punjabiPattern) || []).length >= 2) return 'punjabi';

  // Hinglish / romanized Hindi keywords
  const hinglishPattern =
    /\b(namaste|haan|nahi|kya|aap|tera|mera|kaise|kitna|lakh|crore|bhai|yaar|ji|ek|do|teen)\b/gi;
  if ((text.match(hinglishPattern) || []).length >= 1) return 'hi';

  return 'en';
};

/**
 * Returns a short, clear system-level language instruction that is
 * prepended to the user message BEFORE the AI sees it.
 *
 * @param {string} language  - 'en' | 'hi' | 'bhojpuri' | 'auto'
 * @param {string} userText  - the raw user message (used for auto-detect)
 * @returns {{ resolvedLang: string, instruction: string }}
 */
const buildLanguageInstruction = (language = 'auto', userText = '') => {
  let resolvedLang = language;

  if (language === 'auto') {
    resolvedLang = detectLanguageFromText(userText);
  }

  const instructions = {
    en:      `[LANGUAGE INSTRUCTION] You MUST respond ONLY in English. Do NOT use Hindi, Punjabi, Bhojpuri, or any other language, even if the user wrote in another language.`,
    hi:      `[LANGUAGE INSTRUCTION] आपको केवल हिंदी में जवाब देना है। अंग्रेजी या कोई और भाषा उपयोग मत करें।`,
    bhojpuri:`[LANGUAGE INSTRUCTION] Raur jawab SIRF Bhojpuri mein dena hoga. Hindi aur English ke shabd minimum rakhein. Bhojpuri grammar aur shabd upyog karein jaise "ba", "bani", "hamar", "tohar", "kari", etc.`,
    punjabi: `[LANGUAGE INSTRUCTION] ਤੁਸੀਂ ਸਿਰਫ਼ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦੇਣਾ ਹੈ। ਅੰਗਰੇਜ਼ੀ ਯਾ ਹੋਰ ਕੋਈ ਭਾਸ਼ਾ ਵਰਤੋ ਨਾ ਕਰੋ। Respond ONLY in Punjabi (Gurmukhi script). Tax terms in Punjabi: ਟੈਕਸ, ਆਮਦਨ, ਕਟੌਤੀ, ਨਿਵੇਸ਼, ਐਲਾਨਯਾਬੀ।`,
  };

  const instruction = instructions[resolvedLang] || instructions.en;

  return { resolvedLang, instruction };
};

/**
 * Injects the language instruction as a system-level prefix on the
 * LAST user message in the messages array (non-destructive copy).
 *
 * @param {Array}  messages  - OpenAI-style [{role, content}, ...]
 * @param {string} language  - 'en' | 'hi' | 'bhojpuri' | 'auto'
 * @returns {{ messages: Array, resolvedLang: string }}
 */
const injectLanguageInstruction = (messages = [], language = 'auto') => {
  if (!messages.length) return { messages, resolvedLang: 'en' };

  // Work on a shallow copy – do NOT mutate the original array
  const msgCopy = messages.map(m => ({ ...m }));

  // Find the last user message to get the raw text for auto-detect
  const lastUserMsg = [...msgCopy].reverse().find(m => m.role === 'user');
  const userText = lastUserMsg?.content || '';

  const { resolvedLang, instruction } = buildLanguageInstruction(language, userText);

  // Prepend the instruction to the last user message
  const lastIdx = msgCopy.length - 1;
  if (msgCopy[lastIdx].role === 'user') {
    msgCopy[lastIdx] = {
      ...msgCopy[lastIdx],
      content: `${instruction}\n\n${msgCopy[lastIdx].content}`
    };
  }

  console.log(`[LANG] Language resolved: ${resolvedLang} (requested: ${language})`);
  return { messages: msgCopy, resolvedLang };
};

module.exports = { injectLanguageInstruction, detectLanguageFromText, buildLanguageInstruction };
