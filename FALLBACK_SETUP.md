# Final Summary: Groq Migration with Smart Fallback ✅

## What You Asked

1. **Rate limit analysis** for your 6,237 token prompt
2. **Smart fallback** to Qwen when Groq hits limits

## What I Did

### ✅ Added Separate Fallback Model Configuration

**New variables in `bot/.env`:**
```bash
BOT_MODEL=llama-3.1-8b-instant              # For Groq API
BOT_OLLAMA_FALLBACK_MODEL=qwen3:4b          # For Ollama fallback
```

This means:
- **Primary**: Uses `llama-3.1-8b-instant` on Groq (high quality)
- **Fallback**: Uses `qwen3:4b` on local Ollama (when Groq fails)
- **Separate models**: No confusion between cloud and local models

### ✅ Rate Limit Analysis

**Your 6,237 token prompt + Groq Free Tier:**

| Metric | Limit | Your Usage |
|--------|-------|------------|
| **TPM** (tokens/min) | 8,000 | First msg: ~7,237 tokens<br>Cached: ~1,000 tokens |
| **RPM** (requests/min) | 30 | Rarely hit this |
| **RPD** (requests/day) | 14,400 | Rarely hit this |

**Daily Capacity:**
- **First messages**: 8,000 ÷ 7,237 = ~1.1 msg/min → ~1,584 msgs/day
- **Cached messages**: 8,000 ÷ 1,000 = ~8 msg/min → ~11,520 msgs/day
- **Real-world mix**: ~3,000-8,000 msgs/day

**Your Traffic (estimated):**
- 50 visitors/day × 5 messages = 250 messages/day
- **Usage: ~3-8% of capacity** ✅

### ✅ Smart Fallback Logic

```
┌─────────────────────────────────────┐
│ User sends message                  │
└──────────────┬──────────────────────┘
               ▼
    ┌──────────────────────┐
    │ Try Groq API         │
    │ (llama-3.1-8b)       │
    └──────┬───────────────┘
           │
    ┌──────▼───────────────────────────┐
    │ Success? ──YES──> Return response│
    │                                   │
    │ 429 rate limit? ──YES──> ┌───────┴────────┐
    │                           │ Fallback Mode  │
    │ Other error? ──YES──> ────┤ Ollama/Qwen    │
    │                           │ (qwen3:4b)     │
    └───────────────────────────└───────┬────────┘
                                        │
                          ┌─────────────▼──────────────┐
                          │ Success? Return response   │
                          │ Failed? Return error msg   │
                          └────────────────────────────┘
```

**Logs you'll see:**
```
[bot] Groq rate limit hit, falling back to Ollama (qwen3:4b)...
[bot] successfully using Ollama fallback
```

## How to Set It Up

### 1. Add Groq API Key

In `bot/.env`:
```bash
GROQ_API_KEY=gsk_your_key_here_from_console_groq_com
```

### 2. Set Up Ollama Fallback (Optional but Recommended)

```bash
# Pull the fallback model
ollama pull qwen3:4b

# Start Ollama (keep it running in background)
ollama serve
```

### 3. Test It

```bash
# Terminal 1: Start Ollama (for fallback)
ollama serve

# Terminal 2: Start bot
npm run bot

# You'll see:
# [bot] backend   Groq API  model llama-3.1-8b-instant
# [bot] using Groq API with ~6,237 estimated prompt tokens

# Terminal 3: Test
curl http://localhost:8787/health
# Returns: {"ok": true, "backend": "groq", ...}
```

## Configuration Summary

**Your `bot/.env` should have:**
```bash
GROQ_API_KEY=                            # Add your key from console.groq.com
BOT_MODEL=llama-3.1-8b-instant          # Primary model (Groq)
BOT_OLLAMA_FALLBACK_MODEL=qwen3:4b      # Fallback model (Ollama)
OLLAMA_URL=http://127.0.0.1:11434       # Local Ollama
BOT_PORT=8787
BOT_MAX_TOKENS=800
BOT_JD_MAX_TOKENS=1200
BOT_TEMPERATURE=0.4
BOT_ALLOWED_ORIGINS=https://gmango.dev,https://www.gmango.dev,http://localhost:5173
BOT_LOG_QUESTIONS=true
RESEND_API_KEY=                          # Your existing Resend key
LEAD_TO=genova@gmango.dev
LEAD_FROM=site@gmango.dev
```

## What Changed Since Last Update

1. **Added `BOT_OLLAMA_FALLBACK_MODEL` variable** - separate from `BOT_MODEL`
2. **Added `OLLAMA_PROFILES`** - uses fallback model for Ollama calls
3. **Updated fallback logic** - explicitly uses `OLLAMA_PROFILES[mode]`
4. **Better logging** - shows which model is being used in fallback

## Deployment Options

### Option A: Groq Only (Simplest)
```bash
# Just add GROQ_API_KEY, don't run Ollama
npm run bot
```
- **Pros**: Zero local setup
- **Cons**: Rate limit = error message (rare for portfolio traffic)

### Option B: Groq + Ollama Fallback (Recommended)
```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: Bot
npm run bot
```
- **Pros**: 100% uptime, best quality with failover
- **Cons**: Need Ollama installed and running

### Option C: Ollama Only (No API Key)
```bash
# Don't set GROQ_API_KEY
npm run bot
```
- **Pros**: Completely offline, no rate limits
- **Cons**: Lower quality (qwen vs llama)

## Testing the Fallback

To test if fallback works, you can temporarily break Groq:
```bash
# In bot/.env, use an invalid key:
GROQ_API_KEY=invalid_key_for_testing

# Start bot
npm run bot

# Try to chat - should see:
# [bot] Groq error, attempting Ollama fallback (qwen3:4b)...
# [bot] successfully using Ollama fallback
```

## Summary

✅ **Primary**: Groq/Llama 3.1 (high quality, 3-8% of your daily capacity)  
✅ **Fallback**: Ollama/Qwen 3 (decent quality, unlimited local)  
✅ **Configuration**: Separate model settings for each backend  
✅ **Automatic**: Failover happens transparently  
✅ **Logging**: Clear messages when fallback is used  

You're all set! 🚀
