// models/CAProfile.js - Chartered Accountant Profile
const mongoose = require('mongoose');

const caProfileSchema = new mongoose.Schema({
  userId             : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name               : { type: String, required: true },
  email              : { type: String, required: true },
  phone              : String,
  registrationNumber : { type: String, required: true },
  experience         : { type: Number, required: true, min: 0 }, // years
  specializations    : [{
    type: String,
    enum: ['ITR Filing','GST','Corporate Tax','International Taxation',
           'Tax Planning','Audit','Investment Advisory','Startup Taxation','NRI Taxation']
  }],
  about              : { type: String, maxlength: 600 },
  city               : String,
  state              : String,
  languages          : [String],
  consultationFee    : Number,               // per session in INR
  rating             : { type: Number, default: 4.5, min: 1, max: 5 },
  totalConsultations : { type: Number, default: 0 },
  isAvailable        : { type: Boolean, default: true },
  photo              : String,
  verified           : { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('CAProfile', caProfileSchema);
