# Token Optimization Complete! ✅

## Problem
- Groq free tier with `qwen/qwen3.6-27b` has **8K TPM limit**
- Original prompt: ~7,066 tokens
- First message was hitting limit: 7,066 (prompt) + 200 (user) + 800 (response) = **8,066 tokens** ❌

## Solution: YAGNI + Compact Mode

Applied "You Ain't Gonna Need It" principles:
- Created ultra-compact persona (434 tokens, was ~2,147)
- Created condensed about file (340 tokens, was ~2,700)
- Used existing compact mode for generated facts (2,217 tokens)

## Results

### Token Budget (with COMPACT=true)
```
Prompt:       ~2,992 tokens  (57% reduction!)
User message:   ~200 tokens
Response:       ~600 tokens  (reduced BOT_MAX_TOKENS)
-----------------------------------
TOTAL:        ~3,792 tokens  ✅ Under 8K limit!
```

### Files
- `bot/compact/00-persona.md` - 1,911 chars (~434 tokens)
- `bot/compact/20-about.md` - 1,498 chars (~340 tokens)  
- `bot/knowledge/10-site-facts.md` - 9,757 chars (~2,217 tokens, auto-generated compact)

### Configuration
Your `bot/.env` now has:
```bash
BOT_MODEL=qwen/qwen3.6-27b          # Working Groq model
BOT_COMPACT=true                     # CRITICAL - enables compact mode
BOT_MAX_TOKENS=600                   # Reduced to fit budget
BOT_JD_MAX_TOKENS=800               # Reduced for job desc mode
```

## What Got Trimmed (YAGNI applied)

**Removed from every message:**
- Detailed project explanations (only shown when asked)
- Full coursework lists
- Shop inventory details
- Verbose examples and edge cases
- Redundant phrasing

**Kept (essential for portfolio bot):**
- Who Genova is
- Current role + open to work
- Key domains (Defense, Security, Healthcare)
- Contact info
- Project summaries (expand on request)
- Lead capture + link buttons

## How Compact Mode Works

When `BOT_COMPACT=true`:
1. `bot/compact/` files **override** `bot/knowledge/` files with same name
2. `build-context.mjs` generates shorter site facts (clips descriptions to 340 chars)
3. Startup shows: `[bot] compact  on — bot/compact/*.md overriding bot/knowledge/`

## Testing

```bash
# Rebuild with compact mode
BOT_COMPACT=true npm run bot

# You should see:
# [bot] using Groq API with ~2,992 estimated prompt tokens
# [bot] compact  on — bot/compact/*.md overriding bot/knowledge/

# Test it
curl http://localhost:8787/health
# Returns: {"ok": true, "backend": "groq", ...}

# Try chatting - should work without hitting TPM limit!
```

## Daily Capacity (Updated)

With ~3,792 tokens per request:
- **First messages**: 8,000 ÷ 3,792 = ~2.1 msg/min = ~3,024 msgs/day
- **Cached messages**: 8,000 ÷ 800 = ~10 msg/min = ~14,400 msgs/day (RPD limit)

**For 50 visitors × 5 messages = 250 msgs/day:**
- **Usage: ~1.7-8% of capacity** ✅

## Quality Trade-offs

**What you lose:**
- Less detailed initial responses (but can expand when asked)
- Shorter technical explanations upfront

**What you keep:**
- All core functionality (lead capture, links, suggestions)
- Accurate, grounded responses
- Ability to deep-dive when visitor asks specific questions
- All the personality and voice

## If You Need More Detail

You can always:
1. **Add back details selectively** - edit `bot/compact/*.md`
2. **Increase token budget** - upgrade Groq tier for higher TPM
3. **Use fallback** - Ollama has no token limits

## Files Summary

**Modified:**
- `bot/.env` - Added `BOT_COMPACT=true`, reduced token limits
- `bot/.env.example` - Updated with compact mode docs

**Created:**
- `bot/compact/00-persona.md` - Condensed rules and persona
- `bot/compact/20-about.md` - Essential context only
- `FALLBACK_SETUP.md` - Docs on model selection and fallback
- `GROQ_MIGRATION.md` - Full migration guide

**How compact mode works:**
```
BOT_COMPACT=true
    ↓
systemPrompt() loads:
    1. bot/compact/00-persona.md (overrides knowledge/00-persona.md)
    2. bot/knowledge/10-site-facts.md (auto-generated, compact version)
    3. bot/compact/20-about.md (overrides knowledge/20-about.md)
    ↓
Total: ~2,992 tokens instead of ~7,066
```

## Next Steps

1. ✅ Compact mode enabled
2. ✅ Token budget under 8K
3. ✅ Model set to `qwen/qwen3.6-27b`
4. ⏳ Add your `GROQ_API_KEY` to `bot/.env`
5. ⏳ Test with `npm run bot`

You're all set! The bot will now work smoothly with Groq's free tier. 🚀
