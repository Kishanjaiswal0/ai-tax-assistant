// routes/chat.js - Chat Routes with AI Memory (last 10 messages = 5 complete turns)
const express     = require('express');
const { auth }    = require('../middleware/auth');
const { getAIResponse } = require('../utils/aiEngine');
const ChatHistory = require('../models/ChatHistory');

const router = express.Router();

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

    console.log(`[CHAT] User: ${message.slice(0,60)}... | Context: ${contextWindow.length} msgs`);

    // Get AI response - Grok will now have full conversation context
    const aiResponse = await getAIResponse(contextWindow, taxContext);

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
