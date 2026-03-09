# Feedback Capture Setup Checklist

## ✅ What's Ready

All code has been implemented and tested:

- ✅ `feedback_utils.py` created with detection/stripping/capture functions
- ✅ `views.py` modified to detect #FB and forward to Discord
- ✅ `settings.py` configured to read webhook URL from environment
- ✅ `.env.example` updated with webhook URL documentation
- ✅ Tests pass (all detection and stripping tests ✅)
- ✅ Django check passes (no errors)

## 🔧 Setup Steps (Do These Now)

### 1. Create Discord Webhook

**Steps:**
1. Open Discord
2. Go to the channel where you want feedback delivered
3. Click the gear icon (⚙️) next to the channel name
4. Click **Integrations** in the left sidebar
5. Click **Webhooks**
6. Click **New Webhook** button
7. Give it a name like "Landscaper Feedback"
8. Optionally change the avatar/icon
9. Click **Copy Webhook URL** button
10. Save it somewhere temporarily (you'll paste it in the next step)

### 2. Add Webhook URL to .env

**Steps:**
1. Open `~/landscape/backend/.env` in your editor
2. Add this line at the end (replace with your actual webhook URL):
   ```bash
   LANDSCAPER_FEEDBACK_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
   ```
3. Save the file

**Example:**
```bash
LANDSCAPER_FEEDBACK_WEBHOOK_URL=https://discord.com/api/webhooks/1234567890123456789/ABcDeFgHiJkLmNoPqRsTuVwXyZ1234567890ABCDefGHijKLmnOPqrSTUvWXyz
```

### 3. Restart Backend

**Option A: Using restart script**
```bash
cd ~/landscape
./restart.sh
```

**Option B: Manual restart**
```bash
cd ~/landscape/backend
source venv/bin/activate
pkill -f "python manage.py runserver"  # Stop existing server
python manage.py runserver             # Start fresh
```

### 4. Test It!

1. Open Landscaper chat in your browser (http://localhost:3000)
2. Navigate to any project
3. Send a test message with `#FB`:
   ```
   Testing the new feedback feature #FB
   ```
4. Check your Discord channel - you should see:
   - A formatted embed with "🔔 New Feedback from Landscaper Chat"
   - User information
   - Project context
   - Your message (without the #FB tag)

## 📋 Verification Checklist

After setup, verify everything works:

- [ ] Webhook created in Discord
- [ ] Webhook URL added to `backend/.env`
- [ ] Backend restarted
- [ ] Test message sent with `#FB`
- [ ] Feedback appeared in Discord channel
- [ ] `#FB` tag NOT visible in Landscaper chat response

## 🐛 Troubleshooting

### Feedback not appearing in Discord?

1. **Check the webhook URL in .env**
   ```bash
   cd ~/landscape/backend
   grep LANDSCAPER_FEEDBACK_WEBHOOK_URL .env
   ```
   Should show your webhook URL (not empty)

2. **Test the webhook manually**
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content": "Test message"}'
   ```
   Should post "Test message" to your Discord channel

3. **Check Django logs**
   Look for warnings/errors when you send a #FB message:
   ```
   WARNING: LANDSCAPER_FEEDBACK_WEBHOOK_URL not configured
   ```
   Or:
   ```
   ERROR: Failed to send feedback to Discord: 404
   ```

4. **Verify webhook is active in Discord**
   - Go to channel settings → Integrations → Webhooks
   - Make sure your webhook is listed and active

### #FB tag still showing in chat?

- This means the stripping isn't working
- Check that `strip_feedback_tag()` is being called
- Look for errors in Django console

### Missing context in feedback?

- Previous messages should appear in the "Recent Context" field
- If missing, verify there were previous messages in the conversation

## 📁 Important Files

**Code files:**
- `backend/apps/landscaper/feedback_utils.py` - Core logic
- `backend/apps/landscaper/views.py` - Integration point
- `backend/config/settings.py` - Configuration

**Documentation:**
- `backend/apps/landscaper/FEEDBACK_FEATURE.md` - Detailed docs
- `FEEDBACK_IMPLEMENTATION_SUMMARY.md` - What was built
- `FEEDBACK_SETUP_CHECKLIST.md` - This file

**Testing:**
- `backend/apps/landscaper/test_feedback.py` - Unit tests

## 🎯 Usage Instructions (for Alpha Testers)

Once setup is complete, share these instructions with alpha testers:

---

### How to Submit Feedback from Landscaper Chat

When you want to share feedback while using Landscaper:

1. Type your feedback message as normal
2. Add `#FB` anywhere in the message
3. Send it

**Example:**
```
The cashflow projection is really helpful! #FB Would love to see this on mobile too
```

**What happens:**
- Your feedback (without the #FB tag) gets forwarded to the development team
- The conversation context is included automatically
- You'll get a normal response from Landscaper (the #FB won't show up)

**Tips:**
- Use #FB for any feature requests, bugs, or general feedback
- Be specific! More context = better feedback
- You can use it as many times as you want

---

## ✨ Next Steps

After setup is verified and working:

1. Share the usage instructions with alpha testers
2. Monitor the Discord feedback channel
3. Consider setting up notifications for the feedback channel
4. Optionally create a feedback dashboard (future enhancement)

## 📞 Support

If you run into issues:

1. Check the troubleshooting section above
2. Review the detailed docs in `FEEDBACK_FEATURE.md`
3. Check Django logs for errors
4. Test the webhook manually with curl

The implementation is complete and tested - setup should only take a few minutes!
