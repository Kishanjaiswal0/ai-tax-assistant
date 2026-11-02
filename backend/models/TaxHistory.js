// models/TaxHistory.js
// Stores users' tax calculation history

const mongoose = require('mongoose');

const taxHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  taxYear: {
    type: String,
    required: true,
    enum: ['FY2024-25', 'FY2025-26', 'TY2026-27']
  },

  grossIncome: {
    type: Number,
    required: true,
    min: 0
  },

  age: {
    type: String,
    default: 'below60'
  },

  residentialStatus: {
    type: String,
    default: 'resident',
    enum: ['resident', 'non-resident', 'not-ordinarily-resident']
  },

  deductions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  oldRegime: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  newRegime: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  recommendedRegime: {
    type: String,
    enum: ['old', 'new', 'equal'],
    required: true
  }

}, { timestamps: true });

// Fast user-specific history retrieval
taxHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('TaxHistory', taxHistorySchema);
