# WhisperHub Pro - Autonomous Sales Agent Upgrade

## Project Overview

WhisperHub Pro is now enhanced with **autonomous agent capabilities** for engineers, tech sales, and marketing teams. The agent intelligently manages leads, scores prospects, and automates sales workflows.

### New Features

#### 1. **AI-Powered Lead Scoring**
- Automatic lead evaluation based on interaction patterns
- Engagement scoring
- Conversion probability estimation
- Real-time score updates

#### 2. **Sales Pipeline Management**
- Custom pipeline stages
- Deal value tracking
- Pipeline health analytics
- Revenue forecasting

#### 3. **Email Sequence Automation**
- Pre-built email templates
- Trigger-based sequences (new leads, stalled deals, etc.)
- Multi-step follow-up campaigns
- Customizable delays and messaging

#### 4. **Automation Rules Engine**
- If-then workflow automation
- Bulk lead operations
- Auto-assignment based on criteria
- Custom action triggers

#### 5. **AI Insights & Recommendations**
- Next action recommendations
- Risk detection for stalled deals
- Opportunity identification
- Sales coaching recommendations

#### 6. **Agent Activity Dashboard**
- Real-time agent activity log
- Daily action tracking
- Performance metrics
- Audit trail

---

## Tech Stack

- **Frontend**: React 19, TypeScript, TanStack Router/Query, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Edge Functions (TypeScript)
- **AI**: Claude 3 Haiku integration ready
- **Mobile**: Capacitor for iOS/Android APKs
- **Cloud**: Cloudflare Workers (Wrangler)

---

## Database Schema

### New Tables for Agent Features

```
sales_pipeline_stages  - Define custom CRM stages
email_sequences        - Email campaign templates
email_sequence_steps   - Individual email steps in sequences
automation_rules       - Conditional automation workflows
lead_interactions      - Track all lead touchpoints
ai_insights           - Agent-generated recommendations
agent_config          - Agent settings per user
agent_activity_log    - Audit trail of agent actions
lead_score_history    - Lead scoring analytics
```

### Enhanced Tables

```
leads                  - Added: stage_id, lead_source, engagement_score, 
                        conversion_probability, estimated_deal_value, tags, metadata
```

---

## Edge Functions

### 1. `lead-score` - AI Lead Scoring Engine
- Evaluates leads based on:
  - Profile completeness
  - Interaction frequency
  - Days since contact
  - Engagement level
- Returns: Score (0-100), reasoning, conversion probability

### 2. `auto-followup` - Auto Follow-up Scheduler
- Identifies leads needing follow-up
- Suggests appropriate email sequences
- Creates tasks and reminders
- Logs agent activity

### 3. `sales-analytics` - Analytics & Insights
- Pipeline statistics
- Deal health metrics
- Risk detection
- Opportunity identification

---

## Routes

### New Pages
- `/app/crm` - CRM Dashboard with analytics
- `/app/sales` - Sales automation setup (sequences, rules, settings)

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd /home/tjms/Downloads/whisper-hub-pro-main
npm install
# or with bun
bun install
```

### 2. Deploy Database Migrations

```bash
# Using Supabase CLI
supabase migration up
```

This creates all new tables and edge functions.

### 3. Configure Environment Variables

Add to your `.env.local`:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy lead-score
supabase functions deploy auto-followup
supabase functions deploy sales-analytics
```

---

## Building APK (Android App)

### Prerequisites

1. **Node.js & Bun** installed
2. **Java Development Kit (JDK)** 11+
3. **Android SDK** installed
4. **Android Studio** (optional but recommended)
5. **Capacitor CLI** (installed as part of npm install)

### Step-by-Step APK Build

#### 1. Build the web app

```bash
npm run build
```

This generates the production build in `dist/` folder.

#### 2. Initialize Capacitor

```bash
npm run cap:add:android
```

This creates the `android/` folder with Android project structure.

#### 3. Sync web app to Android

```bash
npm run cap:sync
```

Copies the built web app into the Android project.

#### 4. Build APK

```bash
npm run build:apk
```

Or manually:

```bash
npx cap open android
```

Then in Android Studio:
- Click "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"
- Output: `android/app/build/outputs/apk/debug/app-debug.apk`

#### 5. For Release APK (Signed)

```bash
npm run build:apk:release
```

Requires keystore setup:
```bash
# Generate keystore (one-time)
keytool -genkey -v -keystore android/app/release-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias release

# Set environment variables
export KEYSTORE_PASSWORD=your_password
export KEY_PASSWORD=your_password
```

---

## Testing the Agent

### 1. Create Test Leads

```sql
-- Add test leads
INSERT INTO leads (user_id, name, email, company, stage, lead_source)
VALUES 
  ('user-id', 'John Smith', 'john@example.com', 'TechCorp', 'prospect', 'whatsapp'),
  ('user-id', 'Sarah Johnson', 'sarah@example.com', 'StartupXYZ', 'lead', 'whatsapp');
```

### 2. Score Leads via Edge Function

```bash
curl -X POST https://your-supabase-url/functions/v1/lead-score \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead-uuid",
    "userData": {}
  }'
```

### 3. Trigger Auto Follow-up

```bash
curl -X POST https://your-supabase-url/functions/v1/auto-followup \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "daysThreshold": 3
  }'
```

### 4. Get Analytics

```bash
curl -X POST https://your-supabase-url/functions/v1/sales-analytics \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid"}'
```

---

## Agent Configuration

Customize the agent in the `/app/sales` page settings:

- **Agent Name**: Display name for the agent
- **AI Model**: Choose between Claude Haiku, Sonnet, or GPT-4
- **Max Daily Actions**: Limit on daily automated actions (default: 100)
- **Response Tone**: Professional, Friendly, Formal, or Casual
- **Auto Follow-up**: Enable/disable automatic follow-ups
- **Lead Scoring Weights**: Customize scoring algorithm

---

## Usage Examples

### Setting Up an Email Sequence

1. Go to `/app/sales`
2. Click "New Sequence"
3. Select trigger type (e.g., "No Contact (3 days)")
4. Add email steps with delays
5. Enable the sequence

### Creating an Automation Rule

1. Go to `/app/sales` → "Automation Rules"
2. Click "New Rule"
3. Define conditions (e.g., "If engagement_score > 70")
4. Choose actions (e.g., "Move to Hot Leads stage")

### Viewing CRM Analytics

1. Go to `/app/crm`
2. View lead score distribution
3. Check pipeline health metrics
4. Review agent recommendations

---

## Deployment

### Cloudflare Workers

```bash
# Deploy to Cloudflare
npm run build
wrangler deploy
```

### Supabase Functions

```bash
# Deploy specific function
supabase functions deploy lead-score --no-verify-jwt
```

### Mobile App Distribution

**Google Play Store:**
1. Create a Google Play Developer Account
2. Build signed release APK
3. Upload to Google Play Console
4. Configure store listing and pricing

**APK Direct Distribution:**
- Share `app-release.apk` file
- Users can install via side-loading

---

## Troubleshooting

### Build Issues

**"No Android SDK found"**
```bash
# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

**"Edge function returns 403"**
- Ensure JWT token is valid
- Check RLS policies on Supabase tables
- Verify function URL is correct

### APK Issues

**"App crashes on launch"**
- Check logcat: `adb logcat -s "Capacitor"`
- Verify API endpoints are reachable
- Check Android permissions in `android/app/src/AndroidManifest.xml`

### Performance

**Slow lead scoring:**
- Add database indexes on `lead_interactions`
- Optimize edge function response time
- Cache recent scores in frontend

---

## Future Enhancements

- [ ] WhatsApp bot integration for lead capture
- [ ] Slack notifications for agent actions
- [ ] Calendar sync (Google Calendar, Outlook)
- [ ] Multi-language support
- [ ] Advanced analytics dashboards
- [ ] Custom NLP model training
- [ ] Predictive deal forecasting
- [ ] Video call transcription & analysis

---

## Support & Documentation

- **API Docs**: Supabase auto-generated OpenAPI
- **Component Library**: shadcn/ui components
- **Supabase Docs**: https://supabase.com/docs
- **Capacitor Docs**: https://capacitorjs.com/docs
- **React Router**: https://tanstack.com/router

---

## License

MIT

---

**Built with ❤️ using React, Supabase, and Capacitor**
