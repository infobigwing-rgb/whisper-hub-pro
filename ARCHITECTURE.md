# WhisperHub Pro - System Architecture Diagram

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WhatsApp Messages                                 │
│                                                                           │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  WhatsApp Import        │
                    │  (/app/whatsapp)        │
                    │  - Parse conversations │
                    │  - Extract data        │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────▼────────────────────────────┐
        │           AUTONOMOUS AGENT SYSTEM                   │
        │                                                      │
        │  ┌──────────────────────────────────────────────┐  │
        │  │ 1. Lead Scoring (AI Engine)                 │  │
        │  │    - Engagement level analysis              │  │
        │  │    - Conversion probability                 │  │
        │  │    - Score: 0-100                           │  │
        │  │    - Updates: lead.ai_score                 │  │
        │  └──────────────────────────────────────────────┘  │
        │                                                      │
        │  ┌──────────────────────────────────────────────┐  │
        │  │ 2. Interaction Tracking                      │  │
        │  │    - Calls, emails, meetings                │  │
        │  │    - Engagement scoring                     │  │
        │  │    - Timeline analysis                      │  │
        │  └──────────────────────────────────────────────┘  │
        │                                                      │
        │  ┌──────────────────────────────────────────────┐  │
        │  │ 3. Email Sequence Engine                    │  │
        │  │    - Multi-step campaigns                   │  │
        │  │    - Trigger-based (new lead, stalled)      │  │
        │  │    - Customizable delays                    │  │
        │  └──────────────────────────────────────────────┘  │
        │                                                      │
        │  ┌──────────────────────────────────────────────┐  │
        │  │ 4. Automation Rules                         │  │
        │  │    - If-then workflows                      │  │
        │  │    - Bulk operations                        │  │
        │  │    - Lead assignment                        │  │
        │  └──────────────────────────────────────────────┘  │
        │                                                      │
        │  ┌──────────────────────────────────────────────┐  │
        │  │ 5. Insights Generation                      │  │
        │  │    - Risk alerts                            │  │
        │  │    - Opportunities                          │  │
        │  │    - Recommendations                        │  │
        │  └──────────────────────────────────────────────┘  │
        │                                                      │
        │  ┌──────────────────────────────────────────────┐  │
        │  │ 6. Activity Logging                         │  │
        │  │    - Audit trail                            │  │
        │  │    - Performance tracking                   │  │
        │  └──────────────────────────────────────────────┘  │
        │                                                      │
        └────────────────┬─────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         │               │               │
    ┌────▼────┐    ┌─────▼─────┐  ┌────▼─────┐
    │   CRM   │    │ Automation│  │ Analytics│
    │Dashboard│    │ Rules     │  │ Dashboard│
    │         │    │           │  │          │
    │Lead     │    │Email      │  │Pipeline  │
    │Pipeline │    │Sequences  │  │Health    │
    │Analytics│    │Settings   │  │Trends    │
    └────┬────┘    └─────┬─────┘  └────┬─────┘
         │               │             │
         └───────────────┼─────────────┘
                         │
        ┌────────────────▼────────────────┐
        │        React Frontend           │
        │  (/app/crm, /app/sales)        │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │   Supabase Backend              │
        │   (PostgreSQL + Edge Functions) │
        └────────────────┬────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌─────▼─────┐  ┌────▼─────┐
    │leads    │    │email_     │  │automation│
    │pipeline │    │sequences  │  │_rules    │
    │stages   │    │ai_insights│  │agent_    │
    │         │    │config     │  │activity  │
    └─────────┘    └───────────┘  └──────────┘
```

## Data Flow - Lead Scoring

```
Lead Created (WhatsApp/Manual)
        │
        ▼
Lead Score Function Called
        │
        ├─ Query: lead_interactions
        ├─ Calculate: Base score (50)
        ├─ Add: Profile completeness (+15)
        ├─ Add: Recent contact bonus (+20)
        ├─ Add: Interaction frequency (+15)
        ├─ Subtract: Days since contact penalty (-20)
        │
        ▼
Calculate Conversion Probability
        │
        ├─ High score (>70): 70% probability
        ├─ Medium score (>50): 40% probability
        └─ Low score (<50): 15% probability
        │
        ▼
Store Results
        │
        ├─ Update: lead.ai_score
        ├─ Update: lead.engagement_score
        ├─ Update: lead.conversion_probability
        └─ Log: agent_activity_log
        │
        ▼
Generate Insight
        │
        └─ Create: ai_insights record
```

## Data Flow - Email Sequence

```
Lead Meets Trigger Condition
        │
        ▼
Auto-followup Function Checks
        │
        ├─ Last interaction: >3 days?
        └─ Agent config: auto follow-up enabled?
        │
        ▼
Query Applicable Sequences
        │
        └─ Match trigger_type to user config
        │
        ▼
Get First Step of Sequence
        │
        ├─ Retrieve: email subject
        ├─ Retrieve: email body
        └─ Retrieve: delay (days)
        │
        ▼
Create Email Drafts
        │
        ├─ Create: email_drafts record
        ├─ Create: calendar reminder
        └─ Create: ai_insights recommendation
        │
        ▼
Return to Dashboard
        │
        └─ User reviews and approves
```

## Database Schema Relationships

```
┌──────────────────┐
│   auth.users     │
│    (Supabase)    │
└────────┬─────────┘
         │ user_id
         │
    ┌────▼──────────────────────────────┐
    │                                    │
┌───▼──────┐  ┌──────────┐  ┌────────────▼───────┐
│ profiles │  │   leads  │  │ sales_pipeline_    │
│          │  │          │  │ stages             │
└──────────┘  │ stage_id ├──┼────────────────────┘
              │ lead_src │
              │ ai_score │
              └─────┬────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
    ┌───▼────┐  ┌───▼─────┐ ┌──▼──────────┐
    │lead_   │  │lead_    │ │email_       │
    │interact│  │score_   │ │drafts       │
    │ions    │  │history  │ │             │
    └────────┘  └─────────┘ └─────────────┘
        │
    ┌───▼─────┐
    │tasks    │
    │calendar │
    │events   │
    │notes    │
    └─────────┘

┌────────────────┐
│ email_         │
│ sequences      │
│ (trigger_type) │
└────────┬───────┘
         │
    ┌────▼──────────────┐
    │email_sequence_    │
    │steps              │
    │(step_number,      │
    │ delay_days)       │
    └───────────────────┘

┌──────────────────┐
│automation_rules  │
│(trigger, actions)│
└──────────────────┘

┌─────────────┐
│ ai_insights │
└─────────────┘

┌────────────────────┐
│ agent_config       │
│ (model, tone,      │
│  max_daily_actions)│
└────────────────────┘

┌──────────────────┐
│agent_activity_   │
│log               │
└──────────────────┘
```

## Technology Stack

```
FRONTEND
├─ React 19
├─ TypeScript
├─ TanStack Router
├─ TanStack Query
├─ Tailwind CSS
├─ Recharts (Analytics)
├─ shadcn/ui (Components)
└─ Capacitor 5 (Mobile)

BACKEND
├─ Supabase
├─ PostgreSQL
├─ Row-Level Security (RLS)
├─ Deno Edge Functions
├─ TypeScript
└─ REST APIs

AI/ML
├─ Claude 3 API ready
├─ Custom scoring algorithms
├─ Lead engagement analysis
└─ Predictive insights

DEPLOYMENT
├─ Cloudflare Workers
├─ Wrangler CLI
├─ APK for Android
├─ PWA capabilities
└─ Mobile-first design

MOBILE
├─ Capacitor Core
├─ Capacitor Plugins
│  ├─ App
│  ├─ Device
│  ├─ Keyboard
│  └─ StatusBar
└─ Gradle (Android builds)
```

## User Journey - Using the Agent

```
1. LEAD IMPORT
   User: Imports WhatsApp chat export
   Agent: Parses and creates leads
   
2. AUTO-SCORING
   Agent: Scores all new leads
   User: Views CRM Dashboard with scores
   
3. PIPELINE MANAGEMENT
   User: Creates custom pipeline stages
   Agent: Categorizes leads by stage
   
4. EMAIL SEQUENCES
   User: Creates email campaign sequences
   Agent: Triggers sequences automatically
   
5. AUTOMATION
   User: Sets up automation rules
   Agent: Executes rules on leads
   
6. FOLLOW-UP
   Agent: Identifies stalled leads
   User: Reviews recommendations
   Agent: Auto-creates follow-up tasks
   
7. ANALYTICS
   User: Views CRM dashboard metrics
   Agent: Tracks pipeline health
   
8. MOBILE
   User: Downloads APK
   Agent: Manages leads on phone
```

## Agent Decision Tree

```
Lead Enters System
       │
       ▼
Score Lead (0-100)
       │
       ├─ If score >= 70 (High Priority)
       │  ├─ Add tag: "hot_lead"
       │  ├─ Create insight: "Ready to close"
       │  └─ Suggest: "Schedule demo"
       │
       ├─ Elif score 40-70 (Medium)
       │  ├─ Add tag: "nurture"
       │  ├─ Create insight: "Nurture this lead"
       │  └─ Suggest: "Send info email"
       │
       └─ Else score < 40 (Low Priority)
          ├─ Add tag: "cold_lead"
          ├─ Create insight: "Low interest signal"
          └─ Suggest: "Add to nurture sequence"

Check Interaction History
       │
       ├─ If no contact > 30 days
       │  └─ Create insight: "Risk of lost deal"
       │
       ├─ Elif no contact > 3 days
       │  └─ Suggest: "Send follow-up"
       │
       └─ Else recent contact
          └─ Create insight: "Momentum building"

Trigger Actions
       │
       ├─ If conditions met
       │  ├─ Execute automation rules
       │  ├─ Send email sequences
       │  ├─ Create reminders
       │  └─ Log all activities
       │
       └─ Log to agent_activity_log
```

---

This architecture provides a scalable, AI-powered autonomous agent system that manages the entire sales pipeline while reducing manual work and improving conversion rates.
