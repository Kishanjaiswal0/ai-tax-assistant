// routes/chat.js - Chat Routes with AI Memory (last 10 messages = 5 complete turns)
const express     = require('express');
const multer      = require('multer');
const { auth }    = require('../middleware/auth');
const { getAIResponse } = require('../utils/aiEngine');
const ChatHistory = require('../models/ChatHistory');
const {
  storeDocumentText,
  clearDocumentText,
  getDocumentEntry,
  extractTextFromBuffer
} = require('../utils/documentContext');

const router = express.Router();

// In-memory multer for chat-embedded doc uploads (max 5 MB)
const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits : { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = ['application/pdf','text/plain','image/jpeg','image/png','image/jpg']
      .includes(file.mimetype);
    cb(ok ? null : new Error('Only PDF/TXT/JPG/PNG allowed.'), ok);
  }
});

// ── POST /api/chat/message ────────────────────────────────────
router.post('/message', auth, async (req, res) => {
  try {
    const { message, sessionId, history = [], taxContext = {}, language = 'en' } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required.' });

    const sid = sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

    // Build conversation context: maintain last 10 messages for better context
    // This gives Grok/AI full conversation memory for natural responses
    const contextWindow = history
      .slice(-10) // last 10 messages = 5 user-assistant turns
      .map(m => ({ 
        role: m.role, 
        content: m.content 
      }));
    
    // Add current user message
    contextWindow.push({ role: 'user', content: message });

    console.log(`[CHAT] User: ${message.slice(0,60)}... | Context: ${contextWindow.length} msgs | Lang: ${language}`);

    // Get AI response - passes language + userId for pre-processing layer
    const aiResponse = await getAIResponse(
      contextWindow,
      taxContext,
      { language, userId: req.userId }
    );

    if (!aiResponse) {
      return res.status(500).json({ error: 'Failed to get response from AI. Please try again.' });
    }

    // Persist to MongoDB
    try {
      let chat = await ChatHistory.findOne({ userId: req.userId, sessionId: sid });
      if (!chat) {
        chat = new ChatHistory({
          userId: req.userId,
          sessionId: sid,
          title: message.slice(0, 60) + (message.length > 60 ? '…' : ''),
          taxContext
        });
      }
      chat.messages.push({ role: 'user',      content: message    });
      chat.messages.push({ role: 'assistant', content: aiResponse });
      chat.updatedAt = new Date();
      if (taxContext && Object.keys(taxContext).length) chat.taxContext = taxContext;
      await chat.save();
    } catch (dbErr) {
      // Non-fatal – continue even if DB is down
      console.warn('[CHAT] MongoDB save skipped:', dbErr.message);
    }

    res.json({ success: true, response: aiResponse, sessionId: sid });
  } catch (err) {
    console.error('[CHAT] Error:', err.message);
    res.status(500).json({ error: 'Chat failed.', message: err.message });
  }
});

// ── POST /api/chat/upload-doc ────────────────────────────────
// Upload a document in-chat; extracted text stored per-user in memory
router.post('/upload-doc', auth, chatUpload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const text = extractTextFromBuffer(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    storeDocumentText(req.userId, req.file.originalname, text);

    res.json({
      success  : true,
      filename : req.file.originalname,
      size     : req.file.size,
      preview  : text.slice(0, 200) + (text.length > 200 ? '…' : ''),
      message  : '✅ Document uploaded! I will use this context to answer your next questions.'
    });
  } catch (err) {
    console.error('[CHAT/upload-doc]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/chat/clear-doc ────────────────────────────────
// Remove stored document context for the current user
router.delete('/clear-doc', auth, (req, res) => {
  clearDocumentText(req.userId);
  res.json({ success: true, message: 'Document context cleared.' });
});

// ── GET /api/chat/doc-status ──────────────────────────────────
router.get('/doc-status', auth, (req, res) => {
  const entry = getDocumentEntry(req.userId);
  res.json({ hasDocument: !!entry, document: entry ? { filename: entry.filename, uploadedAt: entry.uploadedAt } : null });
});

// ── GET /api/chat/sessions ────────────────────────────────────
router.get('/sessions', auth, async (req, res) => {
  try {
    const sessions = await ChatHistory
      .find({ userId: req.userId }, { sessionId:1, title:1, updatedAt:1, 'messages':{$slice:-1} })
      .sort({ updatedAt: -1 })
      .limit(30);
    res.json({ sessions });
  } catch (_) { res.json({ sessions: [] }); }
});

// ── GET /api/chat/session/:sessionId ─────────────────────────
router.get('/session/:sid', auth, async (req, res) => {
  try {
    const chat = await ChatHistory.findOne({ userId: req.userId, sessionId: req.params.sid });
    res.json({ chat: chat || null });
  } catch (_) { res.json({ chat: null }); }
});

// ── DELETE /api/chat/session/:sessionId ──────────────────────
router.delete('/session/:sid', auth, async (req, res) => {
  try {
    await ChatHistory.deleteOne({ userId: req.userId, sessionId: req.params.sid });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
