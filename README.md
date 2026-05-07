# 🧾 AI Tax Filing Assistant – Complete Setup Guide

## 🌟 Project Overview
Full-stack AI-powered Indian Income Tax assistant with:
- 🤖 AI chatbot (Grok / Ollama / Rule-based fallback)
- 📊 Tax Calculator (Old vs New Regime, FY 2024-25)
- 🧠 Fuzzy Logic engine for regime recommendations
- 📈 What-if Simulation with sliders
- 🎯 Goal-based tax planning
- 📂 Document upload with mock Form 16 extraction
- 🤝 CA consultation marketplace
- 📜 Chat history (MongoDB Atlas)
- 🎤 Voice input (Web Speech API)
- 🇮🇳/🇺🇸 English + Hindi UI

---

## 📁 Folder Structure
```
ai-tax-assistant/
├── backend/
│   ├── server.js              # Express server entry
│   ├── .env.example           # Environment template
│   ├── models/
│   │   ├── User.js            # User schema (bcrypt auth)
│   │   ├── CAProfile.js       # CA profile schema
│   │   ├── ChatHistory.js     # Chat sessions
│   │   └── Consultation.js    # CA consultation requests
│   ├── middleware/
│   │   └── auth.js            # JWT + role guards
│   ├── routes/
│   │   ├── auth.js            # Signup/Login/Profile
│   │   ├── chat.js            # AI chat + memory
│   │   ├── tax.js             # Tax calc + simulation + goals
│   │   ├── ca.js              # CA profiles CRUD
│   │   ├── consultation.js    # Consultation requests
│   │   └── documents.js       # File upload (mock)
│   └── utils/
│       ├── taxEngine.js       # Full tax engine + fuzzy logic
│       └── aiEngine.js        # HuggingFace / Ollama / fallback
└── frontend/
    ├── public/index.html
    └── src/
        ├── App.js             # Routes + providers
        ├── App.css            # Global design system
        ├── index.js           # React entry
        ├── context/
        │   └── AuthContext.js # Global auth + theme + lang
        ├── utils/
        │   ├── api.js         # Axios API helpers
        │   ├── taxEngine.js   # Client-side tax calculator
        │   └── i18n.js        # English + Hindi translations
        └── components/
            ├── Auth/          # AuthPage (Login + Signup)
            ├── Layout/        # Sidebar + Layout shell
            ├── Dashboard/     # Home dashboard
            ├── Chat/          # AI Chatbot + voice input
            ├── Calculator/    # Tax Calculator
            ├── Simulation/    # What-if sliders
            ├── Goals/         # Goal-based planning
            ├── Documents/     # File upload + checklist
            ├── CA/            # Browse CAs + CA profile
            └── History/       # Chat history viewer
```

---

## 🚀 Step-by-Step Setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account (free tier)
- Git

### Step 1: MongoDB Atlas Setup
1. Go to https://cloud.mongodb.com and sign up (free)
2. Create a new cluster (M0 Free tier)
3. Create a database user: Security → Database Access → Add User
4. Whitelist your IP: Security → Network Access → Add IP Address → Allow from anywhere (0.0.0.0/0)
5. Get connection string: Databases → Connect → Connect your application
   - Copy: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`

### Step 2: Backend Setup
```bash
cd ai-tax-assistant/backend

# Copy and configure environment
cp .env.example .env
# Edit .env with your values:
#   MONGODB_URI=mongodb+srv://...
#   JWT_SECRET=your_random_32_char_secret

# Install dependencies
npm install

# Start backend
npm run dev   # development (with nodemon)
# or
npm start     # production
```
Backend runs on: http://localhost:5000

### Step 3: AI Model Setup (choose one)

**Option A: HuggingFace (Recommended – Free)**
1. Sign up at https://huggingface.co
2. Get API token: Settings → Access Tokens → New Token
3. Add to `.env`:
   ```
   HUGGINGFACE_API_KEY=hf_your_token_here
   HF_MODEL=mistralai/Mistral-7B-Instruct-v0.1
   ```

**Option B: Ollama (100% Local – No API key)**
1. Install: https://ollama.com/download
2. Pull model: `ollama pull mistral`
3. Start: `ollama serve`
4. Add to `.env`:
   ```
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=mistral
   ```

**Option C: No setup needed!**
The app includes a smart rule-based fallback with comprehensive Indian tax knowledge.

### Step 4: Frontend Setup
```bash
cd ai-tax-assistant/frontend

# Install dependencies
npm install

# Start frontend
npm start
```
Frontend runs on: http://localhost:3000

---

## 🧪 Sample Test Data

### Test User Accounts (created by seeder)
| Role | Email | Password |
|------|-------|----------|
| User | user@demo.com | demo123 |
| CA   | ca@demo.com   | demo123 |

Or create your own via the Signup page.

### CA Accounts (auto-seeded)
| Name | Email | Specialization |
|------|-------|----------------|
| CA Rajesh Kumar | rajesh.ca@example.com | ITR Filing, Tax Planning |
| CA Priya Sharma | priya.ca@example.com  | International Taxation |
| CA Amit Patel   | amit.ca@example.com   | Corporate Tax, GST |
| CA Sneha Reddy  | sneha.ca@example.com  | Investment Advisory |

### Sample Tax Scenarios
| Scenario | Income | Deductions | Best Regime |
|----------|--------|------------|-------------|
| Fresher | ₹6L | ₹0 | New (zero tax!) |
| Mid-career | ₹12L | 80C+NPS+80D | Old |
| High earner | ₹25L | ₹2L max | New |
| Senior citizen | ₹8L | ₹2L | Old |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register user/CA |
| POST | /api/auth/login  | Login |
| GET  | /api/auth/me     | Get profile |
| PUT  | /api/auth/profile| Update profile |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat/message | Send message |
| GET  | /api/chat/sessions | List sessions |
| GET  | /api/chat/session/:id | Get messages |
| DELETE | /api/chat/session/:id | Delete |

### Tax
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tax/calculate | Calculate tax |
| POST | /api/tax/simulate  | What-if scenarios |
| POST | /api/tax/goal-strategy | Goal planning |
| POST | /api/tax/optimize  | Deduction tips |

### CA & Consultations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/ca  | Browse all CAs |
| POST | /api/ca/profile | CA creates profile |
| POST | /api/consultations | Book consultation |
| GET  | /api/consultations/my | User's requests |
| GET  | /api/consultations/ca-requests | CA's queue |
| PATCH | /api/consultations/:id/status | Accept/Reject |

---

## 🧠 Architecture Highlights

### Fuzzy Logic Engine (taxEngine.js)
```
Income Level  →  { low, medium, high }   (continuous, not binary)
Deduction Level → { low, medium, high }   (as ratio of income)
Complexity     → { low, medium, high }

Rules:
R1: income.high ∧ ded.low    → New Regime (strong)
R2: income.medium ∧ ded.high → Old Regime (strong)  
R3: income.high ∧ ded.high   → Old Regime + suggest CA
R4: complexity.high           → Suggest CA
R5: income.low                → New Regime (simpler)
```

### AI Memory (Chat Context)
- Last 10 messages (5 turns) sent with each request
- Tax context (income, deductions, age) extracted and persisted
- Session stored in MongoDB Atlas

### Tax Engine Accuracy
- FY 2024-25 slabs with Budget 2024 updates
- New Regime: ₹75K std deduction, zero tax up to ₹7L
- Old Regime: Full deduction support (80C, 80D, HRA, 24b, NPS)
- 4% Health & Education Cess on all regimes
- Senior citizen exemption limits

---

## 🔒 Security Features
- JWT tokens (7-day expiry)
- bcrypt password hashing (12 rounds)
- Role-based access (user vs CA routes)
- Rate limiting (200/15min global, 30/min chat)
- CORS restricted to frontend URL
- No sensitive data in client storage

---

## ⚠️ Disclaimer
This application provides **AI-generated tax guidance only**. It is NOT a substitute for professional advice from a qualified Chartered Accountant. Always verify calculations and consult a CA before filing your ITR.

Official Resources:
- 🏛️ Income Tax e-Filing: https://www.incometax.gov.in
- 📋 TRACES Portal: https://www.tdscpc.gov.in
- 🏦 NPS eNPS: https://enps.nsdl.com
