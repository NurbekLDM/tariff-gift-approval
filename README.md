# Tariff Gift Approval App

A Next.js application with Supabase authentication where users can browse tariff plans, buy tariffs, apply for gifts, and activate gift codes. Admin panel for managing tariffs, gift applications, and Telegram bot integration.

## Features

- **User Authentication**: Google OAuth (users) + Email/Password (admin)
- **Tariff Management**: Admin creates/edits/deactivates tariffs with 1-12 month periods
- **Gift Applications**: Users apply for gifts, admin approves/rejects
- **Activation Codes**: Auto-generated codes sent via email upon approval
- **Telegram Bot**: Admin receives notifications with Approve/Reject buttons
- **Audit Logging**: All notifications and email attempts are logged

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth + Email/Password)
- **Email**: Nodemailer (any SMTP)
- **Telegram**: Bot API (webhook-based)

## Setup Instructions

### 1. Clone & Install

```bash
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Enable Google OAuth in Authentication → Providers → Google
4. Enable Email/Password in Authentication → Providers → Email
5. Copy your Supabase URL and anon key from Project Settings → API

### 3. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com

TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Create Admin User

1. Sign up through the app (admin login page) with email: `admin@example.com`
2. In Supabase SQL Editor, run:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';
   ```
3. **Test Admin Credentials**: 
   - Email: `admin@example.com`
   - Password: (password set during signup)

### 5. Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/botfather) on Telegram
2. Copy the bot token
3. In the Admin Panel → Telegram, save and verify the token
4. Open Telegram, find your bot, and send `/start`
5. Click "Set Webhook" in the admin panel

### 6. Run the App

```bash
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Homepage with tariff cards
│   ├── login/                    # Login page (Google OAuth + Admin)
│   ├── success/                  # Success/dashboard page
│   ├── activate/                 # Gift activation page
│   ├── admin/
│   │   ├── page.tsx              # Admin dashboard
│   │   ├── tariffs/              # Tariff management
│   │   ├── gifts/                # Gift application review
│   │   └── telegram/             # Telegram bot config
│   ├── auth/callback/            # OAuth callback handler
│   └── api/
│       ├── gifts/apply           # Gift application API
│       ├── tariffs/buy           # Mock purchase API
│       ├── activate              # Gift activation API
│       ├── admin/
│       │   ├── tariffs           # CRUD tariffs
│       │   ├── gifts             # List + approve/reject
│       │   └── telegram          # Save/verify bot token
│       └── telegram/webhook      # Telegram bot webhook
├── lib/
│   ├── supabase/                 # Supabase clients (client/server/service)
│   └── services/
│       ├── email.ts              # Email sending + activation codes
│       └── telegram.ts           # Telegram bot integration
└── middleware.ts                 # Auth middleware
```

## Business Rules

- Users cannot have more than one pending gift application
- Activation codes are one-time use only
- Users cannot activate more than one gift
- Rejected users can re-apply
- Payment is mocked (focus on period/access logic)
- All business rules enforced server-side
- Telegram bot token never exposed to client