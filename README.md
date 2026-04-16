# SaaSMail

SaaSMail is a multi-tenant email sending and receiving platform built with Next.js 15, TypeScript, Tailwind CSS, Prisma, PostgreSQL, and Resend.

This project was vibe coded from a vague idea and then shaped into a production-style internal SaaS workflow.

## What it does

- Authenticated user workspaces with isolated email settings
- Per-user Resend API key storage with encryption at rest
- Domain management with create, fetch existing, and sync verification
- Template CRUD with variable interpolation like `{{name}}` and `{{otp}}`
- Send email support for:
  - saved templates
  - custom HTML emails
  - plain text emails
- Inbound email syncing from Resend receiving APIs
- Webhook verification for Resend event delivery
- Sent and received email dashboards
- Analytics cards for sent, failed, and received counts
- Dark mode UI

## Tech stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Auth.js / NextAuth
- Prisma
- PostgreSQL
- Resend
- React Hook Form
- Zod
- Svix

## Project structure

```text
prisma/
  schema.prisma

src/
  app/
    (auth)/
    api/
    dashboard/
  components/
    ui/
  lib/
    email/
  auth.ts
```

## Main features

### 1. Authentication

- Credential-based login and registration
- Session handling with Auth.js
- User-scoped queries across templates, domains, logs, and inbox data

### 2. Resend configuration

Each user can save:

- Resend API key
- Verified domain
- Product name
- Default from email

The API key is validated before saving and encrypted before being stored in the database.

### 3. Template management

Templates include:

- name
- subject
- HTML content
- optional JSON variables

Variables are interpolated at send time using placeholders such as:

```html
<h1>Hello {{name}}</h1>
<p>Your OTP is {{otp}}</p>
```

### 4. Email sending

The send flow supports:

- template-based email
- raw HTML email
- plain text email

API route:

```text
POST /api/email/send
```

Request body can include:

```json
{
  "recipient": "user@example.com",
  "subject": "Welcome",
  "templateId": "template_id_here",
  "rawHtml": "<h1>Hello</h1>",
  "plainText": "Hello there",
  "variables": {
    "name": "Rahul"
  }
}
```

### 5. Inbound email receiving

Inbound mail is supported in two ways:

- Resend webhook delivery to `/api/resend/webhook`
- manual sync from Resend receiving APIs using:
  - list received emails
  - retrieve received email

This helps the app still populate inbox data even if webhook timing is delayed.

### 6. Domain management

The settings page supports:

- creating a new domain in Resend
- fetching already existing Resend domains
- syncing verification status and DNS record data

### 7. Dashboard pages

- `/dashboard`
- `/dashboard/settings`
- `/dashboard/templates`
- `/dashboard/logs`
- `/dashboard/inbox`

## Database models

Defined in `prisma/schema.prisma`:

- `User`
- `EmailProviderConfig`
- `EmailTemplate`
- `SentEmailLog`
- `ReceivedEmail`
- `Domain`
- `RateLimitEvent`
- Auth.js adapter models

## Environment variables

Create a `.env` file with:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="replace-with-a-secure-secret"
ENCRYPTION_KEY="base64-encoded-32-byte-key"
RESEND_WEBHOOK_SECRET="whsec_xxx"
```

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Generate Prisma client

```bash
npx prisma generate
```

### 3. Run migrations

```bash
npx prisma migrate dev
```

### 4. Start development server

```bash
npm run dev
```

## Production build

```bash
npm run build
npm run start
```

## Important notes

- Resend API keys are only used on the server
- frontend never directly receives the user API key
- send email route is rate limited
- all important input paths are validated with Zod
- webhook signatures are verified before payload processing
- inbox syncing uses the user’s own Resend account

## Current caveats

- Scheduled emails are stored but do not yet have a background worker for delayed execution
- The current ESLint config shows a circular-config warning from `.eslintrc.json`
- Receiving works best when both webhook delivery and manual inbox sync are correctly configured

## Recommended workflow

1. Register a user account
2. Add your Resend API key and sender settings
3. Fetch or add your domains
4. Create templates
5. Send a test email from the dashboard
6. Configure your Resend webhook to:

```text
https://your-domain.com/api/resend/webhook
```

7. Open inbox and use `Fetch received emails` if needed

## Why this exists

This app is meant to feel like a lightweight internal SaaS console for teams that want:

- BYO Resend account usage
- template-based transactional email
- inbound visibility
- operator-friendly logs and controls

## License

Private / internal project unless you choose otherwise.
