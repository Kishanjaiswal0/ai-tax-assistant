// routes/documents.js - Document Upload (mock Form 16 extraction)
const express = require('express');
const multer  = require('multer');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Store in memory (no disk) for demo; switch to diskStorage for production
const upload = multer({
  storage : multer.memoryStorage(),
  limits  : { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = ['application/pdf','image/jpeg','image/png','image/jpg'].includes(file.mimetype);
    cb(ok ? null : new Error('Only PDF/JPG/PNG allowed.'), ok);
  }
});

// ── POST /api/documents/upload ────────────────────────────────
router.post('/upload', auth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const docType = req.body.docType || 'Form 16';

    // ── Mock extracted data (simulates OCR / PDF parse) ──────
    const extracted = mockExtract(docType, req.file.originalname);

    res.json({
      success       : true,
      filename      : req.file.originalname,
      size          : req.file.size,
      type          : docType,
      extractedData : extracted,
      note          : '⚠️ This is simulated extraction for demo purposes.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/documents/checklist ──────────────────────────────
router.get('/checklist', auth, (req, res) => {
  res.json({
    success   : true,
    checklist : [
      { id:1, doc:'Form 16 (Part A + Part B from employer)',           required:true,  section:'Salary' },
      { id:2, doc:'Form 26AS / Annual Information Statement (AIS)',    required:true,  section:'Verification' },
      { id:3, doc:'Bank Interest Certificate (FD/Savings)',            required:false, section:'Other Income' },
      { id:4, doc:'80C Investment Proofs (PPF passbook, ELSS, LIC)',   required:false, section:'Deductions' },
      { id:5, doc:'Health Insurance Premium Receipt (80D)',             required:false, section:'Deductions' },
      { id:6, doc:'Home Loan Annual Statement (for Sec 24b + 80C)',    required:false, section:'Deductions' },
      { id:7, doc:'Rent Receipts + Landlord PAN (for HRA)',            required:false, section:'Deductions' },
      { id:8, doc:'NPS Transaction Statement (80CCD)',                  required:false, section:'Deductions' },
      { id:9, doc:'Capital Gains Statement (broker / fund house)',      required:false, section:'Capital Gains' },
      { id:10,doc:'Aadhaar + PAN card copy',                           required:true,  section:'Identity' }
    ]
  });
});

// ─── Mock extraction logic ────────────────────────────────────
const mockExtract = (docType, filename) => {
  const base = {
    'Form 16' : {
      documentType    : 'Form 16 (Part A & B)',
      financialYear   : '2024-25',
      assessmentYear  : '2025-26',
      employerName    : 'Infosys Limited',
      employerPAN     : 'AABCI1234C',
      employerTAN     : 'PUNE12345A',
      employeePAN     : 'ABCDE1234F',
      grossSalary     : 1200000,
      standardDed     : 50000,
      professionalTax : 2400,
      hraReceived     : 180000,
      tdsDeducted     : 72000,
      section80C      : 150000,
      section80D      : 25000,
      netTaxableIncome: 792600,
      autoFillData    : {
        grossIncome  : 1200000,
        deductions   : { section80C:150000, section80D:25000, hra:120000, standardDeduction:50000 },
        tdsDeducted  : 72000
      }
    },
    'Form 26AS' : {
      documentType    : 'Form 26AS / AIS',
      financialYear   : '2024-25',
      panNumber       : 'ABCDE1234F',
      tdsSalary       : 72000,
      tdsBank         : 3200,
      advanceTax      : 0,
      totalTaxPaid    : 75200,
      highValueTx     : [
        { description:'Mutual Fund Purchase', amount:250000 },
        { description:'Credit Card Spend',    amount:180000 }
      ]
    },
    'Investment Proof' : {
      documentType : 'Investment Certificate',
      section80C   : 150000,
      ppf          : 72000,
      elss         : 78000,
      nps          : 50000
    }
  };
  return base[docType] || base['Form 16'];
};

module.exports = router;
