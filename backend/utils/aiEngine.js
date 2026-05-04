// utils/aiEngine.js
// AI Integration: Grok API → Ollama → Rule-based fallback
// ============================================================
const fetch = require('node-fetch');

// ─── PRE-PROCESSING MODULES (additive only, no existing logic changed) ────
const { injectLanguageInstruction }  = require('./languageProcessor');
const { injectDocumentContext }      = require('./documentContext');

// ─── SYSTEM PROMPT ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are TaxBot, an expert AI Tax Assistant for India (FY 2024-25).
You are a friendly, conversational chatbot that helps Indian taxpayers understand taxes.

Your expertise:
- ITR filing (ITR-1, ITR-2, ITR-3, ITR-4 form selection)
- Old vs New Tax Regime comparison with examples
- Deductions: 80C (₹1.5L), 80D, 80CCD(1B) NPS ₹50K, HRA, Section 24b home loan ₹2L
- Form 16, 26AS, TDS understanding
- Capital gains tax (STCG 20%, LTCG 12.5% above ₹1.25L on equity)
- GST basics for freelancers/business owners

TAX SLABS FY 2024-25:
🔵 OLD REGIME (Age < 60): 0-2.5L=0%, 2.5-5L=5%, 5-10L=20%, 10L+=30%. Rebate 87A up to ₹12,500 if income≤5L
🟢 NEW REGIME: 0-3L=0%, 3-7L=5%, 7-10L=10%, 10-12L=15%, 12-15L=20%, 15L+=30%. No tax up to ₹7L (87A rebate). Std deduction ₹75,000.

CONVERSATION STYLE:
- Be warm and Indian English friendly (use "tax" not "tax filing", "bhai" is okay)
- Use ₹ symbol and lakh/crore for amounts
- Format responses with emoji bullets and clear sections
- Ask clarifying questions when information is incomplete
- Suggest CA consultation for complex cases (income >20L, foreign income, capital gains, business)
- Use tables and examples to explain concepts
- Keep responses conversational but informative
- Remember context from previous messages in the conversation.
- IMPORTANT: When answering follow-up questions, DO NOT repeat the full explanation of the Old vs New Tax Regime unless explicitly asked. Only answer the specific follow-up question concisely.`;

// ─── GROK API (Primary - Real conversational AI) ─────────────────────────────
const callGrok = async (messages) => {
  const key   = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  if (!key || key === 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    console.warn('[AI] Grok API key not configured');
    return null;
  }

  try {
    console.log(`[AI] Calling Grok (${model}) with ${messages.length} context messages`);
    
    // Groq API endpoint - provides high-speed inference for various models
    const res = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method  : 'POST',
        headers : { 
          'Authorization': `Bearer ${key}`, 
          'Content-Type': 'application/json'
        },
        body    : JSON.stringify({
          model       : model,
          messages    : [
            { 
              role: 'system', 
              content: SYSTEM_PROMPT 
            },
            ...messages
          ],
          temperature : 0.3,
          max_tokens  : 1024,
          top_p       : 0.9,
          stream      : false
        }),
        timeout : 30000
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`[AI] Grok API error (${res.status}):`, errorText.slice(0, 200));
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    
    if (text) {
      console.log(`[AI] Grok response: ${text.slice(0, 80)}...`);
      return text;
    } else {
      console.warn('[AI] Grok returned empty response');
      return null;
    }
  } catch (err) {
    console.warn(`[AI] Grok API fetch failed: ${err.message}`);
    return null;
  }
};

// ─── OLLAMA LOCAL API ─────────────────────────────────────────
const callOllama = async (messages) => {
  const url   = process.env.OLLAMA_URL;
  const model = process.env.OLLAMA_MODEL || 'mistral';
  if (!url) return null;

  try {
    const res = await fetch(`${url}/api/chat`, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({
        model,
        messages : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        stream   : false,
        options  : { temperature: 0.7, num_predict: 600 }
      }),
      timeout : 30000
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.message?.content?.trim() || null;
  } catch (err) {
    console.warn('Ollama failed:', err.message);
    return null;
  }
};

// ─── INTENT CLASSIFICATION (Tax-Related Filter) ───────────────
const classifyQuery = async (messages) => {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    return 'TAX_RELATED'; // Default allow if API not configured
  }

  // Build a short history string for the classifier
  // We take the last 5 messages to provide enough context for follow-ups
  const contextMessages = messages.slice(-5).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

  const classificationPrompt = `You are a classifier that determines if a user query is related to tax, finance, deductions, investments, or financial planning in India.
Crucially, you must consider the conversation context. If the user's latest message is a follow-up question (like "explain in short", "give me more details", "what about the second option") to a previous tax-related discussion, it MUST be classified as TAX_RELATED.

Tax-related topics include: income tax, ITR filing, deductions (80C, 80D, NPS, HRA), tax regimes, GST, capital gains, investments, financial planning, salary, income, rent, insurance, loans.

NOT tax-related: programming, OOP, movies, sports, general knowledge, cooking, travel, etc.

Respond with ONLY "TAX_RELATED" or "NOT_RELATED" - no explanation.

Conversation Context:
${contextMessages}`;

  try {
    const res = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method  : 'POST',
        headers : { 
          'Authorization': `Bearer ${key}`, 
          'Content-Type': 'application/json'
        },
        body    : JSON.stringify({
          model       : 'llama-3.3-70b-versatile',
          messages    : [{ role: 'user', content: classificationPrompt }],
          temperature : 0.1,
          max_tokens  : 10,
          stream      : false
        }),
        timeout : 10000
      }
    );

    if (!res.ok) {
      console.warn(`[CLASSIFY] API error (${res.status}), defaulting to TAX_RELATED`);
      return 'TAX_RELATED';
    }

    const data = await res.json();
    const classification = data?.choices?.[0]?.message?.content?.trim().toUpperCase() || 'TAX_RELATED';
    
    // Fallback: If it still says NOT_RELATED, but the string is something that might be a follow-up, we can just allow it.
    // However, LLM with context should be smart enough now.
    console.log(`[CLASSIFY] context intent → ${classification}`);
    return classification;
  } catch (err) {
    console.warn(`[CLASSIFY] Error: ${err.message}, defaulting to TAX_RELATED`);
    return 'TAX_RELATED';
  }
};

// ─── RULE-BASED FALLBACK AI ───────────────────────────────────
const ruleBasedResponse = (userMsg, context = {}) => {
  const m = userMsg.toLowerCase();

  // Greetings
  if (/^(hi|hello|hey|namaste|helo|hii|namaskar|jai hind)/i.test(m)) {
    return `**Namaste! 🙏 Welcome to TaxBot – Your AI Tax Assistant for India**

I can help you with:
📊 **Tax Calculation** – Old vs New Regime comparison (FY 2024-25)
💰 **Deductions** – 80C, 80D, NPS, HRA, Home Loan and more
📋 **ITR Filing** – Which form to use, documents needed
🎯 **Tax Planning** – Strategies to save maximum tax legally
🤝 **CA Connect** – Refer you to expert Chartered Accountants

To calculate your tax, just tell me:
1. Your **annual income** (e.g., ₹10 lakh salary)
2. Your **age** (below 60 / 60-80 / above 80)
3. Any **investments/deductions** (80C, insurance, etc.)

What's your tax question today?`;
  }

  // Calculate / tax specific number
  if (/(\d+)\s*(lakh|l\b|lac|crore|cr\b|k\b|lakhs)/.test(m) || m.includes('calculate') || m.includes('my tax')) {
    const incMatch = m.match(/(\d+(?:\.\d+)?)\s*(lakh|l\b|lac|crore|cr\b|k\b)/i);
    if (incMatch) {
      let amt = parseFloat(incMatch[1]);
      const unit = incMatch[2].toLowerCase();
      if (unit.startsWith('l') || unit === 'lac') amt *= 100000;
      else if (unit.startsWith('cr')) amt *= 10000000;
      else if (unit === 'k') amt *= 1000;

      const { calculateTax } = require('./taxEngine');
      const result = calculateTax({ grossIncome: amt, age: context.age || 'below60', deductions: {} });
      const fmt = (n) => '₹' + n.toLocaleString('en-IN');

      return `**Tax Calculation for ${fmt(amt)} income (FY 2024-25)**

| Regime | Taxable Income | Tax + Cess | Effective Rate |
|--------|---------------|------------|----------------|
| 🔵 **Old Regime** | ${fmt(result.oldRegime.taxableIncome)} | **${fmt(result.oldRegime.totalTax)}** | ${result.oldRegime.effectiveRate}% |
| 🟢 **New Regime** | ${fmt(result.newRegime.taxableIncome)} | **${fmt(result.newRegime.totalTax)}** | ${result.newRegime.effectiveRate}% |

✅ **${result.recommendation.regime === 'new' ? 'New' : 'Old'} Regime saves you ${fmt(result.recommendation.savings)}**

${result.recommendation.message}

💡 This calculation assumes **no deductions**. With 80C + NPS + 80D investments, Old Regime could save more!

Want me to calculate with your actual deductions? Just share them!`;
    }
  }

  // 80C
  if (m.includes('80c') || m.includes('ppf') || m.includes('elss') || m.includes('lic premium')) {
    return `**Section 80C – Tax Saving Investments (Max ₹1.5 Lakh)**

| Investment | Return | Lock-in | Risk |
|------------|--------|---------|------|
| 🏆 **ELSS Mutual Fund** | 12-15% | 3 years | Medium |
| 🏦 **PPF** | 7.1% p.a. | 15 years | None |
| 📋 **EPF** (via employer) | 8.25% | Till retirement | None |
| 🛡️ **LIC Premium** | 5-6% | Policy term | None |
| 🏠 **Home Loan Principal** | — | Loan tenure | None |
| 💳 **5-yr Tax Saver FD** | 6-7% | 5 years | None |

💡 **Best combo:** ELSS (₹75K) + PPF (₹75K) = ₹1.5L full 80C utilised

🚀 **Bonus:** Invest ₹50,000 in **NPS** under **80CCD(1B)** – this is EXTRA over 80C!
**Total possible deduction = ₹2 Lakh**`;
  }

  // NPS
  if (m.includes('nps') || m.includes('national pension') || m.includes('80ccd')) {
    return `**NPS – National Pension System Tax Benefits**

🎯 **Dual tax advantage:**
- ₹1.5L under 80C (combined with other 80C investments)
- **Extra ₹50,000 under 80CCD(1B)** – over and above 80C limit!

📊 **Tax Saving Example:**
For someone in 30% bracket:
- ₹50,000 NPS → saves **₹15,600** in tax (30% + 4% cess)

🔄 **NPS Returns:** 10-12% (mix of equity + debt)
🔒 **Lock-in:** Till age 60 (40% annuity mandatory)

**How to open NPS:** 
→ Go to eNPS: enps.nsdl.com
→ Open Tier I account (tax benefits)
→ Min ₹500/year contribution`;
  }

  // New regime
  if (m.includes('new regime') || m.includes('new tax regime') || m.includes('budget 2024')) {
    return `**New Tax Regime – FY 2024-25 (Updated Budget 2024)**

📋 **Tax Slabs:**
| Income Slab | Rate |
|-------------|------|
| Up to ₹3 Lakh | NIL |
| ₹3L – ₹7L | 5% |
| ₹7L – ₹10L | 10% |
| ₹10L – ₹12L | 15% |
| ₹12L – ₹15L | 20% |
| Above ₹15L | 30% |

✅ **Key benefits:**
- **Zero tax up to ₹7 Lakh** (87A rebate)
- **₹75,000 Standard Deduction** (Budget 2024 increase from ₹50K)
- No need to manage multiple investments/proofs

❌ **Not available:** 80C, 80D, HRA, home loan interest, NPS (80CCD)

📌 **New regime suits you if:** Total deductions < ₹3.75 Lakh (break-even point ~FY25)

Use our **Tax Calculator** tab for your personal comparison!`;
  }

  // Old regime
  if (m.includes('old regime') || m.includes('old tax')) {
    return `**Old Tax Regime – FY 2024-25**

📋 **Tax Slabs (Below 60):**
| Income Slab | Rate |
|-------------|------|
| Up to ₹2.5 Lakh | NIL |
| ₹2.5L – ₹5L | 5% |
| ₹5L – ₹10L | 20% |
| Above ₹10L | 30% |

✅ **All deductions available:**
- 80C: ₹1.5 Lakh (PPF/ELSS/LIC/EPF)
- 80CCD(1B): ₹50K extra (NPS)
- 80D: ₹25K health insurance (₹50K seniors)
- HRA exemption on rent paid
- Section 24b: ₹2L home loan interest
- 87A rebate: No tax if income ≤ ₹5L

📌 **Old regime suits you if:** Total deductions > ₹3.75L`;
  }

  // HRA
  if (m.includes('hra') || m.includes('house rent') || (m.includes('rent') && m.includes('tax'))) {
    return `**HRA (House Rent Allowance) – Tax Exemption**

🏠 **HRA Exempt = Minimum of these 3:**
1. Actual HRA received from employer
2. 50% of basic salary (Metro: Delhi/Mumbai/Chennai/Kolkata) OR 40% (non-metro)
3. Actual rent paid – 10% of basic salary

📝 **Example (Mumbai – Metro):**
- Basic: ₹50,000/month | HRA received: ₹20,000/month | Rent paid: ₹18,000/month

Calculation:
1. HRA received = ₹20,000
2. 50% of basic = ₹25,000  
3. Rent – 10% basic = ₹18,000 – ₹5,000 = **₹13,000**

✅ **HRA Exempt = ₹13,000/month = ₹1,56,000/year**

📌 **Remember:**
- Keep rent receipts & rental agreement
- Landlord PAN mandatory if annual rent > ₹1L
- Only in Old Regime`;
  }

  // ITR forms
  if (m.includes('itr') || m.includes('which form') || m.includes('itr-1') || m.includes('itr 1')) {
    return `**Which ITR Form to File? (FY 2024-25)**

| Form | Who Should File |
|------|----------------|
| **ITR-1 (Sahaj)** | Salaried + 1 house property + income < ₹50L. No capital gains. |
| **ITR-2** | Salary + capital gains/losses, foreign assets, multiple properties |
| **ITR-3** | Business/professional income with books of accounts |
| **ITR-4 (Sugam)** | Presumptive income under 44AD/44ADA/44AE (turnover < ₹2Cr) |
| **ITR-5** | Partnership firms, LLPs, AOPs |
| **ITR-6** | Companies (other than Section 11) |

📅 **Key Deadlines:**
- Individual (no audit): **July 31, 2025**
- Business (audit): **October 31, 2025**
- Revised return: **December 31, 2025**

🔗 **File at:** [incometax.gov.in](https://www.incometax.gov.in)
🔗 **Download Form 26AS:** [TRACES Portal](https://www.tdscpc.gov.in)`;
  }

  // Capital gains
  if (m.includes('capital gain') || m.includes('mutual fund') || m.includes('stocks') || m.includes('shares')) {
    return `**Capital Gains Tax – FY 2024-25 (Budget 2024 Updated)**

📈 **Equity & Equity Mutual Funds:**
| Type | Holding | Tax Rate |
|------|---------|----------|
| STCG | < 1 year | **20%** (was 15%, hiked Budget 2024) |
| LTCG | > 1 year | **12.5%** above ₹1.25L (was 10% above ₹1L) |

🏠 **Debt MF / FD / Property:**
| Type | Tax |
|------|-----|
| Debt MF STCG | Slab rate |
| Debt MF LTCG | Slab rate (indexation removed) |
| Property LTCG | 12.5% without indexation OR slab rate |

💡 **Tax Saving Tips:**
- LTCG ₹1.25L/year is TAX FREE on equity
- Use tax harvesting: book ₹1.25L gains each March
- Invest LTCG in 54EC bonds (₹50L limit) to save property tax

**Need help with capital gains calculation?** Share details of your transactions!`;
  }

  // Default response
  return `Thank you for your question! Here's how I can help:

🔹 **Tax Calculation** – "Calculate tax on ₹12 lakh income"
🔹 **Deductions** – "Explain Section 80C" / "How does HRA work?"
🔹 **ITR Filing** – "Which ITR form should I file?"
🔹 **New vs Old Regime** – "Compare regimes for my income"
🔹 **Capital Gains** – "Tax on selling mutual funds"
🔹 **CA Help** – Go to **CA Consultation** tab to connect with experts

Please try rephrasing your question or use the **Tax Calculator** tab for instant results!`;
};

// ─── MAIN FUNCTION ────────────────────────────────────────────
/**
 * @param {Array}  messages  - OpenAI-style conversation array
 * @param {Object} context   - tax context (income, age, regime, etc.)
 * @param {Object} options   - { language: 'en'|'hi'|'bhojpuri'|'auto', userId: string }
 */
const getAIResponse = async (messages, context = {}, options = {}) => {
  // ── PRE-PROCESSING LAYER (additive – runs before existing logic) ──────────
  const { language = 'auto', userId = '' } = options;

  // 1a. Inject document context onto the last user message (no-op if no doc stored)
  let processedMessages = injectDocumentContext(messages, userId);

  // 1b. Inject language instruction onto the last user message
  const { messages: langMessages } = injectLanguageInstruction(processedMessages, language);
  processedMessages = langMessages;
  // ─────────────────────────────────────────────────────────────────────────

  // Step 1: Classify query intent (tax-related or not)
  // NOTE: Use the original messages array for classification (no instruction noise from language processing if possible, but here we pass the base messages)
  const classification = await classifyQuery(messages);
  
  if (classification === 'NOT_RELATED') {
    return `I am a Tax Assistant AI and can only help with tax, income, deductions, investments, and financial planning queries. Please ask a tax-related question! 📊

Examples of questions I can help with:
- 💰 How much tax will I pay on ₹10 lakh income?
- 📋 What is Section 80C and how do I use it?
- 🏠 Is HRA taxable?
- 📊 Old vs New Regime – which is better?
- 💳 How to save tax with NPS?`;
  }

  // Step 2: Try Grok (primary) → Ollama → Rule-based
  // Pass the PRE-PROCESSED messages (with language + doc context) to AI
  const grok   = await callGrok(processedMessages);
  if (grok) return grok;

  const ollama = await callOllama(processedMessages);
  if (ollama) return ollama;

  // Rule-based fallback uses the original user message (no prefix noise)
  const userMessage = messages[messages.length - 1]?.content || '';
  return ruleBasedResponse(userMessage, context);
};

module.exports = { getAIResponse, SYSTEM_PROMPT };
