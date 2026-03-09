# Feedback Feature Quick Start

## TL;DR

Alpha testers can now submit feedback by including `#FB` in their Landscaper chat messages. The feedback (+ context) gets forwarded to a Discord channel automatically.

## Setup (5 minutes)

### 1. Create Discord Webhook
Discord → Channel Settings (⚙️) → Integrations → Webhooks → New Webhook → Copy URL

### 2. Add to .env
```bash
# Add this line to ~/landscape/backend/.env
LANDSCAPER_FEEDBACK_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
```

### 3. Restart
```bash
cd ~/landscape && ./restart.sh
```

### 4. Test
Send a message with `#FB` in Landscaper chat → Check Discord channel

## How It Works

```
User sends: "This feature is great! #FB Love it"
                           ↓
           Backend detects #FB tag
                           ↓
        Captures: message + context
                           ↓
          POSTs to Discord webhook
                           ↓
      Strips #FB from message
                           ↓
        AI processes: "This feature is great! Love it"
                           ↓
     User gets normal response (no #FB visible)
```

## What Gets Sent to Discord

- 👤 User (email + ID)
- 📊 Project context (ID, name, page)
- 💬 Feedback message (without #FB)
- 📝 Recent chat history (last 3-5 messages)

## Files Created

```
backend/apps/landscaper/
├── feedback_utils.py          ← Core logic (detection, stripping, Discord POST)
├── FEEDBACK_FEATURE.md        ← Detailed documentation
└── test_feedback.py           ← Unit tests (all passing ✅)

backend/config/
└── settings.py                ← Added LANDSCAPER_FEEDBACK_WEBHOOK_URL setting

backend/
└── .env.example               ← Documented the webhook URL variable

Root:
├── FEEDBACK_IMPLEMENTATION_SUMMARY.md  ← What was built
├── FEEDBACK_SETUP_CHECKLIST.md        ← Step-by-step setup guide
└── FEEDBACK_QUICK_START.md            ← This file
```

## Status

✅ **Code complete and tested**
- Detection works (case-insensitive #FB)
- Stripping works (removes #FB cleanly)
- Discord webhook integration works
- All unit tests pass
- Django check passes (no errors)

⏳ **Pending setup**
- Create Discord webhook
- Add webhook URL to .env
- Restart backend

## For Alpha Testers

> **Want to share feedback?**  
> Just add `#FB` to your message in Landscaper chat!
> 
> Example: `"Great feature! #FB Would love dark mode"`
> 
> Your feedback gets sent to the dev team with full context.  
> The #FB tag won't show up in Landscaper's response.

---

**Full docs:** See `FEEDBACK_FEATURE.md` for complete documentation, architecture, and troubleshooting.
