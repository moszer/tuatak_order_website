# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Build production bundle
npm start         # Start production server
npm run lint      # Run ESLint
```

No test framework is configured.

## Architecture Overview

This is a **Next.js 15 (App Router) restaurant ordering system** called TUATAK Shabunt. TypeScript throughout, Tailwind CSS v4 for styles.

### Three User Roles

1. **Customer** — accesses `/[table]` to browse menu and place orders (no auth required)
2. **Admin** — accesses `/admin/*`, protected by `admin_token` JWT cookie
3. **Member** — accesses `/loyalty/*`, protected by `member_token` JWT cookie

### Data Flow

- **Customer orders:** `/[table]` → CartContext (React Context) → `POST /api/orders`
- **Admin dashboard:** polls `/api/orders` (no WebSocket), plays `notify.mp3` on new orders
- **Loyalty points:** member scans QR at `/loyalty/scan` → `POST /api/loyalty/scan` → points added, tier recalculated

### Database

**TiDB Cloud (MySQL-compatible)** is the primary database. `src/lib/mysql.ts` holds the connection pool and runs `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` migrations on every cold start — there are no separate migration files.

Key tables: `orders`, `menu_items`, `table_sessions`, `table_status`, `table_bills`, `members`, `loyalty_qr_codes`, `loyalty_tiers`, `coupons`, `member_coupons`, `payments`, `receipts`, `users`.

Default seed data (admin user, menu items, loyalty tiers) is inserted on first run inside `connectToDatabase()` in `src/lib/mysql.ts`.

### Authentication

Two independent JWT systems, both using httpOnly cookies:
- `admin_token` — signed with `JWT_SECRET`, 24h expiry, verified via `verifyAuth()` in `src/lib/auth.ts`
- `member_token` — signed with `MEMBER_JWT_SECRET`, 30d expiry, decoded via `getMemberFromCookie()` in `src/lib/memberJwt.ts`

LINE OAuth is an optional login path for both admins and members.

### API Conventions

All API routes live under `src/app/api/`. Public routes (menu, customer ordering) have no auth. Admin routes call `verifyAuth(request)` at the top. Member routes call `getMemberFromCookie()`.

Order status lifecycle: `pending` → `preparing` → `ready` → `served` → `paid`

Tables must have status `ready` before customers can submit orders (enforced in the orders POST handler).

### Key Libraries

- **Image uploads:** ImageKit (`@imagekit/next`), auth endpoint at `/api/upload/imagekit/auth`
- **QR codes:** `qrcode` (generation), `html5-qrcode` / `jsqr` (scanning)
- **Charts:** Recharts (admin cashflow/receipt dashboards)
- **Excel export:** `xlsx` (receipts and member data)
- **Alerts/confirmations:** SweetAlert2

### Environment Variables

Required in `.env.local`:
```
DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME   # TiDB Cloud
JWT_SECRET / MEMBER_JWT_SECRET
LINE_CHANNEL_ID / LINE_CHANNEL_SECRET
NEXT_PUBLIC_LINE_CHANNEL_ID / NEXT_PUBLIC_APP_URL
IMAGEKIT_PUBLIC_KEY / IMAGEKIT_PRIVATE_KEY / IMAGEKIT_ID
```

### Tailwind CSS v4 Notes

Theme variables (colors, fonts) are defined in `src/app/globals.css` inside an `@theme {}` block — not in a `tailwind.config.js` file. There is no `tailwind.config.js`.
