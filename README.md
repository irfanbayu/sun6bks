# Standupindo Bekasi Events

Platform penjualan tiket event untuk komunitas Stand-up Comedy Bekasi. Aplikasi ini dibangun dengan **Next.js App Router**, **Supabase**, **Midtrans**, dan **Clerk**, dengan alur payment yang aman, idempotent, dan siap diuji otomatis.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)
![Midtrans](https://img.shields.io/badge/Midtrans-Payment-0097DA)

---

## Fitur Utama

- Landing page event publik dengan section komprehensif (hero, performer, venue, pricing)
- Checkout tiket terintegrasi Midtrans Snap
- Multi kategori tiket dengan stok independen
- Webhook Midtrans sebagai source of truth status transaksi
- Halaman konfirmasi pembayaran dengan polling otomatis
- Endpoint fallback sync status transaksi (jika callback telat/gagal)
- Cron reconciliation transaksi pending
- Admin panel untuk monitoring dan manajemen transaksi

---

## Tech Stack

| Layer | Teknologi |
| --- | --- |
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://typescriptlang.org/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Database | [Supabase](https://supabase.com/) (PostgreSQL) |
| Payment | [Midtrans Snap](https://midtrans.com/) |
| Auth | [Clerk](https://clerk.com/) |
| Animation | [Framer Motion](https://motion.dev/) |
| Deployment | [Vercel](https://vercel.com/) |

---

## Struktur Project

```text
sun6bks/
├── src/
│   ├── actions/
│   ├── app/
│   │   ├── (public)/
│   │   ├── admin/
│   │   ├── api/
│   │   └── midtrans/
│   ├── components/
│   ├── lib/
│   └── types/
├── supabase/
│   └── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── smoke/
│   ├── mocks/
│   └── setup/
└── .github/workflows/
```

---

## Database Ringkas

Tabel utama:

- `events`
- `ticket_categories`
- `ticket_stocks`
- `transactions`
- `tickets`
- `webhook_payloads`
- `audit_logs`

Migrasi penting:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_decrement_stock_rpc.sql`

---

## Alur Pembayaran (Lifecycle)

```text
1) User checkout tiket
2) Server action membuat order + snap token (status awal: pending)
3) User bayar via Midtrans
4) Midtrans callback ke /midtrans/callback
5) Signature diverifikasi + status dimapping + transition divalidasi
6) Jika paid: decrement stock + generate tickets + trigger invoice
7) User melihat status di /payment/[orderId] via polling /api/transactions/[orderId]
8) Jika callback miss/telat: fallback sync dan /api/cron/reconcile menangani retry
```

---

## Quick Start

### Prasyarat

- Node.js 20+
- npm
- Project Supabase
- Akun Midtrans (sandbox untuk dev)
- Akun Clerk

### 1) Install dependency

```bash
npm install
```

### 2) Siapkan environment

Salin `.env.example` ke `.env.local`, lalu isi:

| Variable | Deskripsi |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Midtrans client key |
| `MIDTRANS_SERVER_KEY` | Midtrans server key |
| `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` | `false` untuk sandbox |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_APP_URL` | Base URL aplikasi |
| `CRON_SECRET` | Secret proteksi route cron |
| `ORDER_STATUS_TOKEN_SECRET` | Secret signing token status order |

### 3) Jalankan migrasi database

Jalankan SQL migration di Supabase SQL editor:

1. `001_initial_schema.sql`
2. `002_decrement_stock_rpc.sql`

### 4) Jalankan aplikasi

```bash
npm run dev
```

---

## Scripts

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Jalankan server development |
| `npm run build` | Build production |
| `npm run start` | Start production build |
| `npm run lint` | Jalankan ESLint |
| `npm run test` | Unit + integration + e2e internal |
| `npm run test:unit` | Unit test helper payment |
| `npm run test:integration` | Integration test route payment/public API |
| `npm run test:e2e` | E2E internal flow payment |
| `npm run test:coverage` | Coverage gate (unit + integration) |
| `npm run test:smoke:sandbox` | Smoke test Midtrans sandbox (opsional) |

---

## Testing Strategy

### Cakupan wajib

- **Success flow**: create order -> callback/polling -> paid -> ticket aktif -> invoice tersedia
- **Failure flow**: invalid signature, transaction not found, expired/failed, unauthorized access
- **Retry flow**: fallback sync via polling + cron reconcile
- **Callback handling**: transition guard, idempotency, optimistic locking

### Struktur test

- `tests/unit` untuk helper payment (`mapMidtransStatus`, `isValidTransition`, `verifySignature`, `formatJakartaTime`)
- `tests/integration` untuk route:
  - `/midtrans/callback`
  - `/api/transactions/[orderId]`
  - `/api/cron/reconcile`
  - `/api/user/orders/[orderId]/detail`
  - `/api/user/orders/[orderId]/invoice`
- `tests/e2e` untuk lifecycle internal end-to-end lintas modul
- `tests/smoke` untuk smoke test environment eksternal/sandbox

### Coverage threshold

- Lines: `70%`
- Functions: `70%`
- Statements: `70%`
- Branches: `60%`

Jika threshold tidak terpenuhi, `test:coverage` akan gagal.

---

## CI/CD (GitHub Actions)

Workflow yang tersedia:

- `CI Tests` (`.github/workflows/ci-tests.yml`)
  - Trigger: push `main/master`, pull request, manual dispatch
  - Menjalankan:
    - `npm run test`
    - `npm run test:coverage`

- `Nightly Smoke` (`.github/workflows/nightly-smoke.yml`)
  - Trigger: nightly (`0 0 * * *`, UTC) + manual dispatch
  - Menjalankan:
    - `npm run test:smoke:sandbox`

Secret wajib untuk nightly smoke:

- `MIDTRANS_SMOKE_BASE_URL`  
  Contoh: `https://your-domain.vercel.app`

---

## Deployment (Vercel)

1. Push repository ke GitHub
2. Import project ke Vercel
3. Tambahkan semua env vars
4. Pastikan `NEXT_PUBLIC_APP_URL` sesuai domain deploy
5. Set Midtrans Notification URL:

```text
https://your-domain.vercel.app/midtrans/callback
```

---

## API Endpoints Penting

| Method | Path | Fungsi |
| --- | --- | --- |
| `POST` | `/midtrans/callback` | Terima callback Midtrans |
| `GET` | `/api/transactions/:orderId` | Polling status transaksi |
| `GET` | `/api/user/orders/:orderId/detail` | Detail order user |
| `GET` | `/api/user/orders/:orderId/invoice` | Invoice order paid |
| `GET` | `/api/cron/reconcile` | Reconcile transaksi pending |

---

## Lisensi

Private project - all rights reserved.
