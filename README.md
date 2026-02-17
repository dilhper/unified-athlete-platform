# Unified Athlete Platform

A full-stack platform for athletes, coaches, specialists, and officials to register, submit documents, collaborate, and manage training workflows.

## Highlights
- Role-based registration with document submissions and official approval
- Real-time messaging and notifications
- Training plans, achievements, certifications, and consultations
- PostgreSQL-backed APIs with audit logging
- Next.js App Router with NextAuth credentials

## Tech Stack
- Frontend: Next.js 15, React 19, Tailwind CSS, Radix UI
- Backend: Next.js API routes, NextAuth, Socket.io
- Database: PostgreSQL (SQL-first, no ORM required at runtime)

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- pnpm (recommended) or npm

### 1) Install dependencies
```bash
pnpm install
```

### 2) Configure environment
Create a `.env.local` in the project root:
```
DATABASE_URL=postgresql://uap_user:YOUR_PASSWORD@localhost:5432/uap_db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_a_secure_random_value
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3) Setup database
On Windows PowerShell:
```powershell
$env:PGPASSWORD="YOUR_PASSWORD"; psql -h localhost -p 5432 -U uap_user -d uap_db -f db\schema.sql
$env:PGPASSWORD="YOUR_PASSWORD"; psql -h localhost -p 5432 -U uap_user -d uap_db -f db\seed.sql
$env:PGPASSWORD="YOUR_PASSWORD"; psql -h localhost -p 5432 -U uap_user -d uap_db -f db\migrations\004_v1.3_document_submissions.sql
```

### 4) Start the dev server
```bash
pnpm dev
```
The app will run on `http://localhost:3000` (or the next available port if 3000 is taken).

## Registration and Approval Flow
1. Users register with role-specific documents.
2. Documents are stored in `document_submissions` with `pending` status.
3. Officials review and approve/reject submissions.
4. Approved users are marked `email_verified=true` and can log in.

## Scripts
- `pnpm dev` - Start dev server
- `pnpm build` - Production build
- `pnpm start` - Start production server
- `pnpm lint` - Lint source

## Project Structure
```
app/                 Next.js App Router pages and API routes
components/          Reusable UI and feature components
db/                  SQL schema, seeds, and migrations
lib/                 Database, auth, and security utilities
public/              Static assets
```

## Notes
- The database schema is SQL-first in `db/schema.sql`.
- Document uploads are stored under `public/documents/`.
- CORS allowed origins are controlled by `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`.

## Troubleshooting
- If auth fails, confirm `email_verified=true` and correct password hash.
- If document submission fails for a role, ensure DB constraints include that role.
- If the app does not start, remove `.next/` and restart.

## License
Proprietary. All rights reserved.
