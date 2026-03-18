# CLAUDE.md - AI Agent Context for Redsox Scheduler

## What is this project?

A baseball scheduling and volunteer management app for the Rubicon Redsox baseball club. Built with Next.js 16 (App Router), PostgreSQL/Prisma, and deployed to AWS Lightsail.

## Quick Reference

| Item | Value |
|------|-------|
| Framework | Next.js 16, React 19, TypeScript |
| DB | PostgreSQL 16 via Prisma ORM |
| Auth | NextAuth.js v4 (credentials, JWT) |
| CSS | Tailwind CSS 4, shadcn/ui |
| Package manager | npm |
| Node version | 20+ |
| Dev server | `npm run dev` (port 3000) |
| Dev database | docker-compose Postgres on port 5433 |
| Prod URL | `https://schedule.rubiconredsox.com` |
| Dev URL | `https://redsox.feutz.com` (local via ngrok) |
| AWS account | `426825797380` (profile: `feutz-aws`) |
| AWS region | `us-east-2` |
| GitHub | `git@github.com-jsfeutz:jsfeutz/redsox-scheduler.git` |

## Development Workflow

### Starting local dev

```bash
docker compose up db mailpit -d
npm run dev
```

Mailpit UI at `http://localhost:8025` for email testing.

### Database operations

```bash
npx prisma migrate dev      # Create new migration
npx prisma migrate deploy   # Apply migrations
npx prisma generate         # Regenerate client after schema changes
npx prisma studio           # Visual database browser
```

Schema is at `prisma/schema.prisma`. After any schema change, create a migration and regenerate the client.

### Seed data

`node scripts/seed.mjs` creates an org, admin/coach users, facilities, teams, seasons, job templates, and sample events. It's idempotent (skips if org already exists).

## Production Deployment

**CRITICAL: Always use `--profile feutz-aws` for all AWS CLI commands.**

### Full deploy process

```bash
# Build
docker build -t redsox-schedule-app:latest .

# Push (note the image ref in the output)
aws lightsail push-container-image \
  --profile feutz-aws --region us-east-2 \
  --service-name redsox-schedule-app \
  --label scheduler \
  --image redsox-schedule-app:latest

# Update lightsail-deploy.json "image" field with the ref from above

# Deploy
aws lightsail create-container-service-deployment \
  --profile feutz-aws --region us-east-2 \
  --service-name redsox-schedule-app \
  --cli-input-json file://lightsail-deploy.json

# Check status
aws lightsail get-container-services \
  --profile feutz-aws --region us-east-2 \
  --service-name redsox-schedule-app
```

### Deploy config

`lightsail-deploy.json` is gitignored. It contains all env vars including secrets. Key fields:

- `NEXTAUTH_URL`: Must match the domain (`https://schedule.rubiconredsox.com`). Controls auth redirects — if wrong, login redirects to the wrong site.
- `APP_URL`: Same as NEXTAUTH_URL. Used for email links.
- `DATABASE_URL`: Lightsail Postgres connection string.
- Container startup runs: `prisma migrate deploy` → `seed.mjs` → `backfill-volunteer-links.mjs` → `server.js`

### Infrastructure

- **Container service:** `redsox-schedule-app` (micro, scale 1)
- **Database:** `redsox-schedule-db` (Postgres 16, micro) on Lightsail managed DB
- **DNS:** `schedule.rubiconredsox.com` CNAME in Route53 zone `Z06766322EE5U5ZUQKU7W`
- **Dev DNS:** `redsox.feutz.com` managed in Cloudflare (ngrok tunnel)
- **SMS:** AWS SNS toll-free registration (may be pending review)

### SSH for GitHub

The repo uses a dedicated SSH key for the `jsfeutz` GitHub account:
- Key: `~/.ssh/id_ed25519_jsfeutz`
- SSH config host alias: `github.com-jsfeutz`
- Remote URL uses `git@github.com-jsfeutz:jsfeutz/redsox-scheduler.git`

To push:
```bash
git push origin main
```

## Architecture

### Key directories

- `src/app/api/` — All API routes (REST). Each entity has its own folder.
- `src/app/dashboard/` — Admin UI pages (behind auth).
- `src/app/schedule/` — Public schedule page (no auth).
- `src/components/` — React components organized by domain.
- `src/lib/` — Shared utilities (auth, prisma, email, sms, auto-jobs).
- `prisma/` — Schema and migrations.
- `scripts/` — Seed and backfill scripts (run as `.mjs`).

### Data model (key entities)

- **Organization** — Single-tenant. All data scoped to one org.
- **User** — Roles: ADMIN, SCHEDULE_MANAGER, FACILITY_MANAGER, COACH, TEAM_ADMIN.
- **Team** — Has head coach, roster (Players), TeamMembers (coaching staff).
- **Facility** — Has SubFacilities (individual fields/diamonds).
- **Season** — Time range with SeasonTeams linking teams to seasons.
- **ScheduleEvent** — Games, practices, club events, blackout dates. Has `gameVenue` field (HOME/AWAY) for games.
- **JobTemplate** — Reusable job definitions. Scope: TEAM or FACILITY.
- **GameJob** — Instance of a job for a specific event. Has volunteer slots.
- **VolunteerSlot** — Per-event volunteer needs.
- **Volunteer** — Parent/guardian who signs up for slots or jobs.

### Key features

- **Schedule management:** Calendar views (month/week/day/list), event CRUD, recurring events, conflict detection.
- **Home/Away games:** `gameVenue` field on events. Away games skip facility job creation and are hidden from public schedule by default.
- **Auto-jobs:** When events are created, `src/lib/auto-jobs.ts` automatically creates GameJob records based on facility and season job configs. Skipped for away games.
- **Staff tab:** Team detail page has a Staff tab showing coaching staff and team-scoped jobs (separate from facility jobs shown in Schedule/Signups tabs).
- **Volunteer system:** Public signup pages, email/SMS notifications, participation tracking, CSV import.
- **Public schedule:** Unauthenticated view with Show/Hide away games toggle, iCal feed.
- **Notifications:** Email via Resend SMTP, SMS via AWS SNS (pending toll-free registration).
- **PWA:** Service worker, manifest, installable.

### Auth flow

- NextAuth.js with credentials provider and JWT strategy.
- Middleware (`src/middleware.ts`) protects `/dashboard/*` and API routes.
- Unauthenticated requests redirect to `/login` using `NEXTAUTH_URL` as the base.
- Login page at `src/app/login/page.tsx` is a client component with `signIn("credentials", ...)`.

### Gotchas

1. **NEXTAUTH_URL is critical.** If this env var doesn't match the domain the user visits, auth redirects break and the app appears to redirect to the wrong site.
2. **AWS profile.** Always use `--profile feutz-aws` for AWS CLI. The default profile is an Everly Health work account — DO NOT deploy there.
3. **Docker build is slow** (~3-4 min). The `chown` step in the Dockerfile takes ~90s. Use cached builds when possible; `--no-cache` only when needed.
4. **Lightsail image tags** are auto-incremented (e.g., `scheduler.8`, `scheduler.9`). After pushing, update `lightsail-deploy.json` with the new tag before deploying.
5. **Dropdown labels.** SelectItem components in event forms use explicit `label` props so the trigger shows display names, not IDs.
6. **Timezone handling.** Dates (especially blackout dates) should be handled carefully — previous bugs caused dates to shift by one day due to UTC conversion.
7. **lightsail-deploy.json is gitignored.** It contains all production secrets. Never commit it.
