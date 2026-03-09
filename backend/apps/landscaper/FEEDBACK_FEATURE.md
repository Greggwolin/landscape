# Landscaper Feedback Capture Feature

## Overview

The feedback capture feature allows alpha testers to submit feedback directly from the Landscaper chat by including `#FB` in their messages. When detected, the system automatically forwards the message along with conversation context to a configured Discord channel via webhook.

## How It Works

1. **User includes #FB in their message**: When chatting with Landscaper, users add `#FB` anywhere in their message to flag it as feedback
2. **System detects the tag**: The backend detects the `#FB` tag before processing the message
3. **Context is captured**: The system collects:
   - The feedback message (with `#FB` stripped)
   - Last 3-5 messages for conversation context
   - User email/ID
   - Project ID and name
   - Current page/workflow context (if available)
4. **Forwarded to Discord**: All context is formatted and POSTed to the configured Discord webhook
5. **Tag is stripped**: The `#FB` tag is removed before the AI processes the message, so users don't see it echoed back

## Setup Instructions

### 1. Create Discord Webhook

1. Open Discord and navigate to the channel where you want feedback delivered
2. Click the gear icon (⚙️) to open channel settings
3. Go to **Integrations** → **Webhooks**
4. Click **New Webhook**
5. Give it a name (e.g., "Landscaper Feedback")
6. Copy the webhook URL

### 2. Configure Environment Variable

Add the webhook URL to your `.env` file:

```bash
LANDSCAPER_FEEDBACK_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

**Note**: Without this variable set, feedback detection will still work but messages won't be sent (a warning will be logged).

### 3. Restart Backend

After adding the environment variable, restart your Django backend:

```bash
cd ~/landscape
./restart.sh
```

Or manually:

```bash
cd ~/landscape/backend
source venv/bin/activate
python manage.py runserver
```

## Testing

1. Open Landscaper chat in your frontend
2. Send a message with `#FB` included: 
   ```
   The cashflow projection looks great! #FB This feature is super helpful
   ```
3. Check your Discord channel - you should see an embed with:
   - User information
   - Project context
   - The feedback message
   - Recent conversation history

## Code Architecture

### Files Modified/Created

1. **`feedback_utils.py`** (new)
   - `detect_feedback_tag()`: Checks if `#FB` is present in message
   - `strip_feedback_tag()`: Removes `#FB` from message content
   - `capture_feedback()`: Sends formatted feedback to Discord webhook

2. **`views.py`** (modified)
   - Imports feedback utilities
   - Detects `#FB` in incoming messages
   - Strips tag before saving message to database
   - Calls `capture_feedback()` with full context

3. **`config/settings.py`** (modified)
   - Added `LANDSCAPER_FEEDBACK_WEBHOOK_URL` setting
   - Reads from environment variable via `decouple`

4. **`.env.example`** (modified)
   - Documents the new environment variable

### Flow Diagram

```
User sends message with #FB
    ↓
Backend receives POST to /api/projects/{id}/landscaper/chat/
    ↓
detect_feedback_tag() checks for #FB
    ↓
If found:
    - strip_feedback_tag() removes #FB
    - capture_feedback() sends to Discord
    ↓
Message saved to DB (without #FB)
    ↓
AI processes message normally
    ↓
Response returned to user
```

## Discord Webhook Payload

The feedback is sent as a Discord embed with the following structure:

```json
{
  "embeds": [{
    "title": "🔔 New Feedback from Landscaper Chat",
    "color": 5793522,
    "timestamp": "2024-03-09T14:30:00.000Z",
    "fields": [
      {
        "name": "👤 User",
        "value": "Email: user@example.com\nUser ID: 123"
      },
      {
        "name": "📊 Context",
        "value": "Project ID: 17\nProject: Chadron Terrace\nPage: cashflow"
      },
      {
        "name": "💬 Feedback Message",
        "value": "This feature is super helpful"
      },
      {
        "name": "📝 Recent Context",
        "value": "👤 User: What's the NOI for year 1?\n🤖 Assistant: Based on the rent roll..."
      }
    ]
  }]
}
```

## Security Considerations

- **Webhook URL is sensitive**: Treat it like a password. Anyone with the URL can post to your Discord channel
- **Don't commit .env**: The `.env` file should never be committed to git (it's in `.gitignore`)
- **User privacy**: Be mindful that feedback may contain project details. Ensure your feedback Discord channel has appropriate access controls

## Troubleshooting

### Feedback not appearing in Discord

1. **Check environment variable**: Verify `LANDSCAPER_FEEDBACK_WEBHOOK_URL` is set in `.env`
2. **Check logs**: Look for warnings/errors in Django console:
   ```
   WARNING: LANDSCAPER_FEEDBACK_WEBHOOK_URL not configured - feedback not sent
   ```
3. **Verify webhook URL**: Test the webhook manually:
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content": "Test message"}'
   ```
4. **Check webhook status**: In Discord, go to channel settings → Integrations → Webhooks to verify it's active

### #FB tag still appearing in chat

- This shouldn't happen - the tag is stripped before saving. If you see it, check that `strip_feedback_tag()` is being called correctly in `views.py`

### Missing context in feedback

- Verify that `message_history` is being passed to `capture_feedback()`
- Check that previous messages exist in the conversation

## Future Enhancements

Potential improvements for future iterations:

- Rate limiting to prevent spam
- Feedback categories/tags beyond just #FB
- Admin dashboard to view feedback directly in Landscape
- Email notifications in addition to Discord
- Feedback analytics and reporting
- User feedback history/tracking
