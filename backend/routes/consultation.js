// routes/consultation.js - Consultation requests (User ↔ CA)
const express      = require('express');
const { auth, caOnly } = require('../middleware/auth');
const Consultation = require('../models/Consultation');
const CAProfile    = require('../models/CAProfile');

const router = express.Router();

// ── POST /api/consultations  (user books a consultation) ──────
router.post('/', auth, async (req, res) => {
  try {
    const { caProfileId, topic, description, preferredDate, preferredTime, income, complexity } = req.body;
    if (!caProfileId || !topic)
      return res.status(400).json({ error: 'caProfileId and topic are required.' });

    const caProfile = await CAProfile.findById(caProfileId);
    if (!caProfile) return res.status(404).json({ error: 'CA profile not found.' });

    const consultation = await Consultation.create({
      userId      : req.userId,
      caId        : caProfile.userId,
      caProfileId,
      userName    : req.user.name,
      caName      : caProfile.name,
      topic, description,
      preferredDate : preferredDate ? new Date(preferredDate) : undefined,
      preferredTime,
      income      : Number(income) || undefined,
      complexity,
      fee         : caProfile.consultationFee
    });

    res.status(201).json({ success: true, consultation, message: 'Consultation request sent!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/consultations/my  (user sees own requests) ───────
router.get('/my', auth, async (req, res) => {
  try {
    const list = await Consultation.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, consultations: list });
  } catch (_) { res.json({ consultations: [] }); }
});

// ── GET /api/consultations/ca-requests  (CA sees own queue) ───
router.get('/ca-requests', auth, caOnly, async (req, res) => {
  try {
    const list = await Consultation.find({ caId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, consultations: list });
  } catch (_) { res.json({ consultations: [] }); }
});

// ── PATCH /api/consultations/:id/status  (CA accept/reject) ───
router.patch('/:id/status', auth, caOnly, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const c = await Consultation.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Consultation not found.' });
    if (c.caId.toString() !== req.userId)
      return res.status(403).json({ error: 'Not authorized.' });

    c.status = status;
    if (notes) c.notes = notes;
    await c.save();

    // Increment CA's totalConsultations on complete
    if (status === 'completed') {
      await CAProfile.updateOne({ userId: req.userId }, { $inc: { totalConsultations: 1 } });
    }

    res.json({ success: true, consultation: c });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/consultations/:id/message  (in-thread message) ──
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required.' });
    const c = await Consultation.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found.' });

    const isParticipant =
      c.userId.toString() === req.userId || c.caId.toString() === req.userId;
    if (!isParticipant) return res.status(403).json({ error: 'Not authorized.' });

    c.messages.push({ senderId: req.userId, senderName: req.user.name, senderRole: req.user.role, content });
    await c.save();
    res.json({ success: true, message: 'Message sent.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
