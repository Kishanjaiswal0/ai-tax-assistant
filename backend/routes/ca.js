// routes/ca.js - CA Profile CRUD + Browse
const express = require('express');
const { auth, caOnly } = require('../middleware/auth');
const CAProfile = require('../models/CAProfile');

const router = express.Router();

// ── GET /api/ca  (browse all available CAs) ───────────────────
router.get('/', async (req, res) => {
  try {
    const { city, specialization, minExp, minRating } = req.query;
    const q = { isAvailable: true };
    if (city)           q.city              = new RegExp(city, 'i');
    if (specialization) q.specializations   = specialization;
    if (minExp)         q.experience        = { $gte: Number(minExp) };
    if (minRating)      q.rating            = { $gte: Number(minRating) };

    const cas = await CAProfile.find(q).sort({ rating: -1, experience: -1 });
    res.json({ success: true, cas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ca/my-profile  (CA views own profile) ────────────
router.get('/my-profile', auth, caOnly, async (req, res) => {
  try {
    const profile = await CAProfile.findOne({ userId: req.userId });
    res.json({ success: true, profile });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/ca/:id ───────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const ca = await CAProfile.findById(req.params.id);
    if (!ca) return res.status(404).json({ error: 'CA not found.' });
    res.json({ success: true, ca });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/ca/profile  (CA creates / updates profile) ──────
router.post('/profile', auth, caOnly, async (req, res) => {
  try {
    const {
      registrationNumber, experience, specializations,
      about, city, state, languages, consultationFee, phone
    } = req.body;

    if (!registrationNumber || experience === undefined)
      return res.status(400).json({ error: 'registrationNumber and experience are required.' });

    let profile = await CAProfile.findOne({ userId: req.userId });
    const data  = {
      name: req.user.name, email: req.user.email,
      phone, registrationNumber, experience: Number(experience),
      specializations, about, city, state, languages,
      consultationFee: Number(consultationFee) || 0
    };

    if (profile) {
      Object.assign(profile, data);
      await profile.save();
    } else {
      profile = await CAProfile.create({ userId: req.userId, ...data });
    }

    res.json({ success: true, profile, message: 'Profile saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/ca/availability  (toggle available) ────────────
router.patch('/availability', auth, caOnly, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    await CAProfile.updateOne({ userId: req.userId }, { isAvailable });
    res.json({ success: true, isAvailable });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
