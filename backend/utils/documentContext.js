// utils/documentContext.js
// ─── DOCUMENT CONTEXT LAYER ────────────────────────────────────
// Stores extracted document text in an in-memory Map (per-user).
// Provides a helper to build a document-augmented context prefix
// that is prepended to the user's message before the AI sees it.
//
// Constraints:
//  - No disk writes; purely in-memory for demo safety.
//  - Works transparently when no document is stored.
//  - Does NOT change AI call logic – only enriches the message content.
// ──────────────────────────────────────────────────────────────

/** In-memory store: userId → { filename, text, uploadedAt } */
const docStore = new Map();

const MAX_CONTEXT_CHARS = 1500; // Keep injected doc text short to stay within token limits

/**
 * Store extracted text for a user (replaces previous doc if any).
 * @param {string} userId
 * @param {string} filename
 * @param {string} text      - extracted plain text
 */
const storeDocumentText = (userId, filename, text = '') => {
  const truncated = text.slice(0, 6000); // raw cap before trimming for context
  docStore.set(userId, {
    filename,
    text: truncated,
    uploadedAt: new Date().toISOString()
  });
  console.log(`[DOC-CTX] Stored document for user ${userId}: "${filename}" (${truncated.length} chars)`);
};

/**
 * Clear stored document for a user.
 */
const clearDocumentText = (userId) => {
  docStore.delete(userId);
  console.log(`[DOC-CTX] Cleared document for user ${userId}`);
};

/**
 * Get stored document entry for a user (or null).
 */
const getDocumentEntry = (userId) => docStore.get(userId) || null;

/**
 * Build a context-injection prefix from stored document text.
 * Returns empty string if no document is stored.
 *
 * @param {string} userId
 * @param {string} userQuery  - the current user question
 * @returns {string}          - prefix to prepend to the user message
 */
const buildDocumentContextPrefix = (userId, userQuery = '') => {
  const entry = getDocumentEntry(userId);
  if (!entry) return '';

  // Trim the doc text to avoid blowing up the context window
  const docSnippet = entry.text.slice(0, MAX_CONTEXT_CHARS);

  return `[DOCUMENT CONTEXT] The user has uploaded a document: "${entry.filename}". ` +
    `Use the following extracted content to answer their question if relevant:\n` +
    `---\n${docSnippet}\n---\n` +
    `User question: `;
};

/**
 * Inject document context as a prefix onto the LAST user message
 * in the messages array (non-destructive copy).
 *
 * @param {Array}  messages  - OpenAI-style [{role, content}, ...]
 * @param {string} userId
 * @returns {Array}          - new messages array (original unchanged)
 */
const injectDocumentContext = (messages = [], userId = '') => {
  if (!userId || !docStore.has(userId)) return messages;

  const msgCopy = messages.map(m => ({ ...m }));
  const lastIdx = msgCopy.length - 1;

  if (msgCopy[lastIdx].role === 'user') {
    const prefix = buildDocumentContextPrefix(userId, msgCopy[lastIdx].content);
    if (prefix) {
      msgCopy[lastIdx] = {
        ...msgCopy[lastIdx],
        content: `${prefix}${msgCopy[lastIdx].content}`
      };
      console.log(`[DOC-CTX] Injected document context for user ${userId}`);
    }
  }

  return msgCopy;
};

/**
 * Basic text extractor for buffers.
 * - For plain-text: direct decode.
 * - For PDF: strips binary noise and extracts readable ASCII/UTF-8 chunks.
 * - For images: returns a placeholder (no OCR in this layer).
 *
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @param {string} originalname
 * @returns {string}
 */
const extractTextFromBuffer = (buffer, mimetype, originalname) => {
  if (!buffer || !buffer.length) return '';

  if (mimetype === 'text/plain') {
    return buffer.toString('utf-8');
  }

  if (mimetype === 'application/pdf') {
    // Lightweight PDF text extraction: find BT...ET blocks or readable ASCII runs
    const raw = buffer.toString('latin1');
    // Extract text between BT (Begin Text) and ET (End Text) markers
    const btEtMatches = [...raw.matchAll(/BT\s*([\s\S]*?)\s*ET/g)]
      .map(m => m[1])
      .join('\n');

    // Extract parenthesized strings (common PDF text encoding)
    const parenStrings = [...(btEtMatches || raw).matchAll(/\(([^)]{2,200})\)/g)]
      .map(m => m[1].replace(/\\n/g, '\n').replace(/\\r/g, ''))
      .filter(s => /[a-zA-Z₹\u0900-\u097F]/.test(s)); // keep only human-readable

    const extracted = parenStrings.join(' ').replace(/\s+/g, ' ').trim();

    if (extracted.length > 30) return extracted;

    // Fallback: grab long readable ASCII runs from raw bytes
    const asciiRuns = (raw.match(/[ -~\u0900-\u097F]{8,}/g) || [])
      .filter(s => /[a-zA-Z]/.test(s))
      .join(' ')
      .trim();

    return asciiRuns.slice(0, 6000) || `[PDF content from ${originalname} – text extraction limited]`;
  }

  if (['image/jpeg', 'image/png', 'image/jpg'].includes(mimetype)) {
    // No OCR available – return a structured placeholder so AI knows about the upload
    return `[Image document "${originalname}" uploaded. No OCR available; please refer to the document checklist for manual review.]`;
  }

  return `[Unsupported document format: ${mimetype}]`;
};

module.exports = {
  storeDocumentText,
  clearDocumentText,
  getDocumentEntry,
  injectDocumentContext,
  extractTextFromBuffer,
};
