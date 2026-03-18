# Redsox Scheduler

Full-stack Next.js app for baseball scheduling and volunteer management for the Rubicon Redsox.

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Database:** PostgreSQL 16 + Prisma ORM
- **Auth:** NextAuth.js (credentials provider, JWT sessions)
- **UI:** Tailwind CSS 4, shadcn/ui, Lucide icons
- **Notifications:** Email (Resend/SMTP via Nodemailer), SMS (AWS SNS)
- **Deployment:** Docker → AWS Lightsail Container Service

## Environments

| Environment | URL | Infrastructure |
|-------------|-----|---------------|
| **Development** | `https://redsox.feutz.com` | Local Docker Compose (exposed via ngrok) |
| **Production** | `https://schedule.rubiconredsox.com` | AWS Lightsail (feutz-aws account `426825797380`) |

Both environments share the same Lightsail PostgreSQL instance (`redsox-schedule-db`) but use different databases:
- Dev: local Postgres via docker-compose (port 5433)
- Prod: `redsox` database on Lightsail managed Postgres

## Local Development

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Setup

```bash
# Copy env file and fill in values
cp .env.example .env

# Start Postgres and Mailpit (email testing)
docker compose up db mailpit -d

# Install dependencies
npm install

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Seed the database
node scripts/seed.mjs

# Start dev server
npm run dev
```

The app runs at `http://localhost:3000`. Mailpit UI is at `http://localhost:8025`.

### Default seed credentials

- Admin: `admin@rubiconredsox.club` / `admin123`
- Coach: `coach@rubiconredsox.club` / `admin123`

### Exposing locally via ngrok (for redsox.feutz.com)

```bash
ngrok http 3000 --hostname=redsox.feutz.com
```

The CNAME for `redsox.feutz.com` is managed in Cloudflare and points to an ngrok tunnel.

## Production Deployment

Production runs on AWS Lightsail in the `feutz-aws` profile (account `426825797380`, region `us-east-2`).

**All AWS commands require `--profile feutz-aws`.**

### Infrastructure

| Resource | Name | Details |
|----------|------|---------|
| Container service | `redsox-schedule-app` | micro, scale 1 |
| Database | `redsox-schedule-db` | Postgres 16, micro |
| DNS | `schedule.rubiconredsox.com` | CNAME → Lightsail service URL (Route53, zone `Z06766322EE5U5ZUQKU7W`) |

### Deploy steps

```bash
# 1. Build the Docker image
docker build -t redsox-schedule-app:latest .

# 2. Push to Lightsail
aws lightsail push-container-image \
  --profile feutz-aws \
  --region us-east-2 \
  --service-name redsox-schedule-app \
  --label scheduler \
  --image redsox-schedule-app:latest

# Note the image reference in the output, e.g. ":redsox-schedule-app.scheduler.10"

# 3. Update lightsail-deploy.json with the new image reference
#    Edit the "image" field to match the output from step 2

# 4. Deploy
aws lightsail create-container-service-deployment \
  --profile feutz-aws \
  --region us-east-2 \
  --service-name redsox-schedule-app \
  --cli-input-json file://lightsail-deploy.json
```

### Deploy config

`lightsail-deploy.json` is gitignored (contains secrets). It must include:

- `NEXTAUTH_URL` and `APP_URL` set to `https://schedule.rubiconredsox.com`
- `DATABASE_URL` pointing to the Lightsail Postgres instance
- SMTP, SNS, and auth secrets

**Critical:** `NEXTAUTH_URL` controls where auth redirects go. If set wrong, the login page will redirect to the wrong domain.

### Checking deployment status

```bash
aws lightsail get-container-services \
  --profile feutz-aws \
  --region us-east-2 \
  --service-name redsox-schedule-app
```

### DNS

- **Production** (`schedule.rubiconredsox.com`): Route53 hosted zone `Z06766322EE5U5ZUQKU7W` in feutz-aws account. CNAME points to Lightsail service URL.
- **Development** (`redsox.feutz.com`): Cloudflare DNS. CNAME points to ngrok tunnel.

To update the production CNAME (e.g., if the Lightsail service is recreated):

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z06766322EE5U5ZUQKU7W \
  --profile feutz-aws \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "schedule.rubiconredsox.com.",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{
          "Value": "YOUR-LIGHTSAIL-SERVICE-URL-HERE"
        }]
      }
    }]
  }'
```

## Project Structure

```
scheduler/
├── prisma/              # Schema and migrations
├── scripts/             # seed.mjs, backfill-volunteer-links.mjs
├── public/              # PWA icons, manifest, service worker
├── src/
│   ├── app/
│   │   ├── api/         # API routes (schedules, teams, jobs, etc.)
│   │   ├── dashboard/   # Admin pages (schedules, teams, facilities, etc.)
│   │   ├── schedule/    # Public schedule page
│   │   ├── volunteer/   # Volunteer signup pages
│   │   ├── help-wanted/ # Public job board
│   │   └── login/       # Auth page
│   ├── components/
│   │   ├── ui/          # shadcn/ui primitives
│   │   ├── schedules/   # Event form, calendar view, event detail
│   │   ├── teams/       # Team detail tabs, roster, staff
│   │   ├── facilities/  # Facility management
│   │   ├── jobs/        # Job templates, assignments
│   │   ├── seasons/     # Season config
│   │   ├── volunteers/  # Signup forms, reports
│   │   └── settings/    # Org settings, user management
│   ├── lib/             # Auth, Prisma, email, SMS, auto-jobs
│   └── types/           # TypeScript types
├── Dockerfile           # Multi-stage build for production
├── docker-compose.yml   # Local dev (Postgres, Mailpit, app)
└── lightsail-deploy.json # Production deploy config (gitignored)
```
