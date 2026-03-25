# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture Overview

This is a **restaurant POS/ordering system** for TUATAK Shabunt (Thai shabu-shabu), built with Next.js App Router. It has two surfaces: a customer-facing ordering UI and a protected admin dashboard.

### Dual Database Setup

- **TiDB MySQL** (primary): All operational data — orders, table sessions/status/bills, payments, menu items, users. Connection in `src/lib/mysql.ts`, which also auto-creates tables and seeds default admin/menu on first run.
- **MongoDB** (legacy/fallback): Connection in `src/lib/mongodb.ts`, used for the `Order` interface. Less actively used.

Database credentials are hardcoded in `src/lib/mysql.ts` and `src/lib/mongodb.ts` — there is no `.env` file in use.

### Table-Based Multi-Tenancy

The core model: tables 1–10 each have their own session. A table must be set to "ready" (`table_status`) by the admin before customers can order. Each table tracks:
- Active orders (`orders`)
- Buffet headcount and pricing (`table_bills`)
- Payment records (`payments`)

Customer routes use `[table]` as a dynamic segment (e.g., `/table1`). The cart (`src/app/context/CartContext.tsx`) is global client state; order submission is blocked if the table status is not ready.

### Key Directories

| Path | Purpose |
|------|---------|
| `src/app/[table]/page.tsx` | Customer ordering page per table |
| `src/app/menu/page.tsx` | Full menu browser |
| `src/app/admin/page.tsx` | Admin dashboard (orders, billing, cashflow) |
| `src/app/admin/login/page.tsx` | JWT login |
| `src/app/admin/layout.tsx` | Admin layout with auth guard |
| `src/app/api/` | All API routes (auth, menu, orders, tables, cashflow, upload) |
| `src/app/context/CartContext.tsx` | Global cart state |
| `src/app/data/menuItems.ts` | Static menu data (~40+ items, auto-seeded to DB) |
| `src/lib/mysql.ts` | DB connection, schema creation, seeding |
| `src/lib/auth.ts` | bcrypt helpers |
| `src/lib/jwt.ts` | JWT sign/verify, httpOnly cookie handling |

### Auth

Admin auth uses JWT in httpOnly cookies (24h). The `src/lib/jwt.ts` handles token creation/verification. API routes check auth via `src/lib/jwt.ts`. Default credentials (seeded on DB init): `admin` / `admin123`.

### Pricing Model

Tables support a **hybrid buffet + à la carte** model:
- `table_bills`: tracks adult/child buffet counts and per-head price
- `orders`: individual food item orders
- `payments`: records both food revenue and buffet revenue separately

### Image Uploads

ImageKit is integrated for menu item images. Auth endpoint at `/api/upload/imagekit/`.

### UI Stack

- Tailwind CSS v4 (PostCSS plugin approach)
- SweetAlert2 for modals/alerts
- Recharts for cashflow/revenue charts in admin
- Thai language throughout the UI
