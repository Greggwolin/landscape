# Feedback Capture Feature - Implementation Summary

## What Was Built

A feedback capture system for Landscaper chat that detects `#FB` hashtags in user messages and forwards them to Discord with full context.

## Files Created

### 1. `backend/apps/landscaper/feedback_utils.py` (NEW)
Contains three utility functions:

- **`detect_feedback_tag(content)`**: Returns True if message contains `#FB` (case-insensitive)
- **`strip_feedback_tag(content)`**: Removes `#FB` from message using regex
- **`capture_feedback(...)`**: Sends formatted feedback to Discord webhook with:
  - User info (email, ID)
  - Project context (ID, name, page)
  - Feedback message (with #FB stripped)
  - Recent conversation history (last 3-5 messages)

### 2. `backend/apps/landscaper/FEEDBACK_FEATURE.md` (NEW)
Complete documentation including:
- How the feature works
- Setup instructions for Discord webhook
- Architecture overview
- Flow diagram
- Troubleshooting guide
- Future enhancement ideas

## Files Modified

### 1. `backend/apps/landscaper/views.py`
**Changes in `ChatMessageViewSet.create()` method:**

```python
# Added import
from .feedback_utils import detect_feedback_tag, strip_feedback_tag, capture_feedback

# Modified create() method to:
1. Store original message content
2. Detect #FB tag
3. Strip #FB before saving message to database
4. Capture feedback with full context if #FB detected
5. Continue normal AI processing with cleaned message
```

**Key logic:**
- Feedback capture happens AFTER message history is retrieved (so context is available)
- #FB is stripped from the saved message (users don't see it echoed back)
- Feedback capture is non-blocking (doesn't fail if webhook fails)

### 2. `backend/config/settings.py`
**Added at end of file:**

```python
# ============================================================================
# FEEDBACK CAPTURE CONFIGURATION
# ============================================================================
LANDSCAPER_FEEDBACK_WEBHOOK_URL = config('LANDSCAPER_FEEDBACK_WEBHOOK_URL', default=None)
```

Uses `decouple` library (already in use) to read from environment variable.

### 3. `backend/.env.example`
**Added:**

```bash
# Discord webhook URL for Landscaper chat feedback capture
LANDSCAPER_FEEDBACK_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

Documents the new environment variable for other developers.

## How to Configure

### Step 1: Create Discord Webhook

1. Open Discord channel for feedback
2. Channel Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Copy the webhook URL

### Step 2: Add to .env

Add to `backend/.env`:

```bash
LANDSCAPER_FEEDBACK_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### Step 3: Restart Backend

```bash
cd ~/landscape
./restart.sh
```

## Testing

1. Open Landscaper chat
2. Send: `"This feature is great! #FB Love the new cashflow view"`
3. Check Discord channel - should see formatted embed with:
   - User details
   - Project context
   - Feedback: "This feature is great! Love the new cashflow view"
   - Recent conversation history

## Technical Details

### Discord Embed Format

The webhook sends a rich embed with:
- **Title**: "🔔 New Feedback from Landscaper Chat"
- **Color**: Discord blurple (#5865F2)
- **Timestamp**: UTC time of submission
- **Fields**:
  - 👤 User (email + ID)
  - 📊 Context (project + page)
  - 💬 Feedback Message
  - 📝 Recent Context (last 5 messages)

### Error Handling

- Missing webhook URL: Logs warning, doesn't break chat
- Webhook request fails: Logs error, doesn't break chat
- Invalid webhook response: Logs error with status code
- Network timeout: 10 second timeout configured

### Security

- Webhook URL is read from environment variable (never hardcoded)
- .env file is gitignored (webhook URL not committed)
- Feedback includes no sensitive data beyond what user voluntarily shares
- Rate limiting not implemented (add if needed)

## Code Quality

- ✅ Type hints on all function parameters
- ✅ Docstrings on all functions
- ✅ Logging for debugging
- ✅ Error handling with try/catch
- ✅ Non-blocking implementation (failures don't break chat)
- ✅ Case-insensitive #FB detection
- ✅ Regex-based tag stripping (handles variations)

## What's NOT Included

- **Webhook creation**: Must be done manually in Discord UI
- **Rate limiting**: No spam protection (add if needed)
- **Feedback UI**: No admin dashboard (future enhancement)
- **Email notifications**: Discord webhook only
- **Analytics**: No tracking/reporting (future enhancement)

## Success Criteria Met

✅ Detects #FB hashtag in user messages  
✅ Captures context (message + last 3-5 messages)  
✅ Captures user email/ID  
✅ Captures project context (ID, name, page)  
✅ POSTs to Discord webhook  
✅ Strips #FB from response (user doesn't see it echoed)  
✅ Webhook URL configurable via settings  
✅ Uses environment variable  
✅ Code ready to test  

## Next Steps

1. **Create Discord webhook** in target channel
2. **Add webhook URL** to `backend/.env`
3. **Restart backend**: `cd ~/landscape && ./restart.sh`
4. **Test it**: Send a message with `#FB` in Landscaper chat
5. **Verify**: Check Discord channel for formatted feedback

## Files Summary

```
backend/
├── apps/landscaper/
│   ├── feedback_utils.py          ← NEW (core feedback logic)
│   ├── FEEDBACK_FEATURE.md        ← NEW (documentation)
│   └── views.py                   ← MODIFIED (added #FB detection)
├── config/
│   └── settings.py                ← MODIFIED (added webhook URL setting)
└── .env.example                   ← MODIFIED (documented webhook URL)
```

## Questions?

See `backend/apps/landscaper/FEEDBACK_FEATURE.md` for:
- Detailed architecture
- Troubleshooting guide
- Flow diagrams
- Future enhancement ideas
