# TaxBot Chatbot - Grok API Setup Guide

## What Changed ✅

Your chatbot has been migrated from **Hugging Face API** to **Grok API** (via Groq) for better conversational responses.

### Key Improvements:
1. ✅ **Grok API Integration** - Now uses Groq's high-speed inference for natural conversations
2. ✅ **Better Context Management** - Maintains last 10 messages (5 turns) for conversational memory
3. ✅ **Proper System Prompt** - Tax-specific prompt optimized for Grok's conversational abilities
4. ✅ **Fallback Chain** - Grok → Ollama (local) → Rule-based (offline backup)
5. ✅ **Enhanced Logging** - Better debugging with `[AI]` prefixed logs

---

## Configuration ✅

Your `.env` already has the Grok API key configured:

```env
# Primary: Grok API via Groq
GROQ_API_KEY=GROK_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Fallback: Ollama (optional - run locally)
# OLLAMA_URL=http://localhost:11434
# OLLAMA_MODEL=mistral
```

**No additional setup needed!** Your API key is already active.

---

## How It Works

### Request Flow:
```
User Message (Frontend)
    ↓
Backend Chat Route (/api/chat/message)
    ↓
Build Context (last 10 messages + system prompt)
    ↓
Call Grok API (Main AI)
    ↓
If Grok fails → Try Ollama (local fallback)
    ↓
If Ollama fails → Use Rule-based AI (offline backup)
    ↓
Return Response to Frontend
    ↓
Save to MongoDB (chat history)
```

### Conversational Features:
- **Memory**: Each message includes context from up to 5 previous turns
- **System Prompt**: Grok understands it's a tax expert assistant
- **Indian English**: Configured to use ₹, lakh, crore, and casual Indian phrasing
- **Tax-specific**: Knows about ITR forms, deductions, tax regimes, etc.

---

## Testing Your Chatbot

### 1. **Restart Backend**
```bash
cd backend
npm start
```

### 2. **Test Conversational Flow**

Start a chat and try these messages:

**Test 1: Simple Tax Calc**
```
User: "I earn 10 lakh salary per year"
Expected: TaxBot calculates tax for both regimes
```

**Test 2: Multi-turn Conversation**
```
User 1: "What's the difference between old and new regime?"
User 2: "My age is 35 and I have 80C investments of 1.5 lakh"
User 3: "Which regime is better for me?"
Expected: Grok remembers previous context and gives personalized advice
```

**Test 3: Complex Question**
```
User: "How does HRA calculation work? I live in Mumbai and pay ₹18,000 rent monthly"
Expected: Detailed explanation with example calculation
```

---

## Monitor Logs

In the backend terminal, you'll see logs like:

```
[CHAT] User: "Calculate tax for 15 lakh income" | Context: 2 msgs
[AI] Calling Grok (llama-3.3-70b-versatile) with 2 context messages
[AI] Grok response: **Tax Calculation for ₹15 Lakh income (FY 2024-25)** ...
```

### Debug Logs Mean:
- ✅ `[AI] Calling Grok` - Request sent successfully
- ✅ `[AI] Grok response:` - Received response from Grok
- ⚠️ `[AI] Grok API error` - Grok failed, will try Ollama
- ⚠️ `[AI] Grok API key not configured` - Invalid API key

---

## Troubleshooting

### Problem: "Failed to get response from AI"

**Check 1: API Key Validation**
```bash
# Backend terminal should show:
[AI] Calling Grok (llama-3.3-70b-versatile) with X context messages
```

If you see: `[AI] Grok API key not configured`
- ✅ Verify `.env` has `GROQ_API_KEY=gsk_4vNHR5...`
- ✅ Restart backend (`npm start`)

**Check 2: Network Issues**
- Groq API should be accessible at: `https://api.groq.com/openai/v1/chat/completions`
- Check your internet connection
- Try a simple request: `"hello"` or `"namaste"`

**Check 3: Fallback Mechanism**
If Grok fails, backend automatically:
1. Tries Ollama (if configured)
2. Falls back to rule-based responses
3. Returns a basic response so chatbot doesn't break

---

## Model Options

Current model: **`llama-3.3-70b-versatile`** (fast, good quality)

Alternative Groq models you can try (change in `.env`):
- `mixtral-8x7b-32768` - Fast, creative
- `gemma-7b-it` - Lightweight
- `llama2-70b-4096` - Standard, reliable

Change model:
```env
GROQ_MODEL=mixtral-8x7b-32768
```
Then restart backend.

---

## Response Quality

### You Should See:
✅ Natural, conversational responses  
✅ Proper formatting with tables & emoji  
✅ Tax calculations with examples  
✅ Follow-up questions when info is missing  
✅ Always ends with disclaimer  

### Bad Signs:
❌ Repetitive or truncated responses  
❌ Off-topic answers  
❌ Empty responses  
→ Check logs for API errors

---

## Advanced: Custom System Prompt

Edit `backend/utils/aiEngine.js` line 1-30 to modify the SYSTEM_PROMPT for different behavior:

```javascript
const SYSTEM_PROMPT = `You are TaxBot...
// Customize personality, examples, rules here
`;
```

Common customizations:
- Add industry-specific deductions
- Change formality level
- Add more examples
- Include state-specific tax rules

---

## Files Modified

1. ✅ **backend/utils/aiEngine.js**
   - Replaced HuggingFace API with Grok API
   - Improved system prompt for conversational AI
   - Enhanced logging

2. ✅ **backend/routes/chat.js**
   - Better context management
   - Improved error handling
   - Added debug logging

3. ✅ **backend/.env**
   - Removed HuggingFace config
   - Organized Grok config
   - Cleaner comments

4. ✅ **frontend/src/components/Chat/ChatPage.js**
   - Already optimized for conversational flow
   - No changes needed

---

## Next Steps

1. **Start Backend**: `npm start` from backend folder
2. **Test Chat**: Try the test messages above
3. **Monitor Logs**: Watch terminal for `[AI]` logs
4. **Provide Feedback**: Let me know if responses are good!

---

**Happy Taxing! 🧾**
