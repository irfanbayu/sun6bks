# Standupindo Bekasi Events

Platform tiket event untuk komunitas Stand-up Comedy Bekasi. Dibangun dengan **Next.js 14**, **Supabase**, **Midtrans**, dan **Clerk**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)
![Midtrans](https://img.shields.io/badge/Midtrans-Payment-0097DA)

---

## Fitur

- **Landing Page** — Halaman single-event dengan section Hero, Events, Performers, Venues, Pricing, dan Footer
- **Pembelian Tiket** — Modal checkout terintegrasi Midtrans Snap untuk pembayaran (QRIS, Bank Transfer, E-Wallet, dll.)
- **Multi Kategori Tiket** — Dukungan Early Bird, Presale, Regular, VIP, dll. dengan stok independen
- **Payment Webhook** — Midtrans webhook sebagai Single Source of Truth untuk status pembayaran
- **Halaman Konfirmasi** — Status pembayaran real-time dengan polling otomatis
- **Admin Dashboard** — Dashboard statistik (revenue, transaksi, tiket aktif) dilindungi Clerk Auth
- **Manajemen Transaksi** — Admin bisa re-check status Midtrans dan manual override
- **Cron Reconciliation** — Job otomatis setiap jam untuk rekonsiliasi transaksi pending > 30 menit
- **Smooth Scroll** — Animasi scroll halus dengan Lenis
- **Framer Motion** — Animasi UI yang interaktif dan modern

---

## Tech Stack

| Layer        | Teknologi                                      |
| ------------ | ---------------------------------------------- |
| Framework    | [Next.js 14](https://nextjs.org/) (App Router) |
| Language     | [TypeScript 5.7](https://typescriptlang.org/)  |
| Styling      | [Tailwind CSS 3.4](https://tailwindcss.com/)   |
| Database     | [Supabase](https://supabase.com/) (PostgreSQL) |
| Payment      | [Midtrans](https://midtrans.com/) Snap         |
| Auth (Admin) | [Clerk](https://clerk.com/)                    |
| Animation    | [Framer Motion](https://motion.dev/)           |
| Smooth Scroll| [Lenis](https://lenis.darkroom.engineering/)   |
| Deployment   | [Vercel](https://vercel.com/)                  |

---

## Struktur Project

```
sun6bks/
├── src/
│   ├── actions/            # Server Actions (events, midtrans, admin)
│   ├── app/
│   │   ├── (public)/       # Landing page (server + client component)
│   │   │   └── payment/    # Halaman konfirmasi pembayaran
│   │   ├── admin/          # Admin dashboard & transaksi (protected)
│   │   ├── api/
│   │   │   ├── cron/       # Vercel cron job (reconcile)
│   │   │   └── transactions/ # Public polling endpoint
│   │   └── midtrans/       # Midtrans webhook callback
│   ├── components/
│   │   ├── layout/         # Navbar
│   │   ├── providers/      # SmoothScroll, Midtrans providers
│   │   ├── sections/       # Hero, Events, Performers, Venues, Pricing, Footer
│   │   └── ui/             # BuyTicketModal, dll.
│   ├── lib/
│   │   ├── midtrans/       # Midtrans server utilities
│   │   └── supabase/       # Supabase client & types
│   ├── styles/             # Global CSS (Tailwind)
│   └── types/              # TypeScript type definitions
├── supabase/
│   └── migrations/         # SQL migrations (schema & RPC)
├── vercel.json             # Vercel cron config
└── package.json
```

---

## Database Schema

Menggunakan Supabase (PostgreSQL) dengan tabel-tabel berikut:

| Tabel               | Deskripsi                                         |
| ------------------- | ------------------------------------------------- |
| `events`            | Data event (judul, tanggal, venue, performers)     |
| `ticket_categories` | Kategori tiket per event (nama, harga, fitur)      |
| `ticket_stocks`     | Stok tiket per kategori (total & remaining)        |
| `transactions`      | Transaksi pembayaran (integrasi Midtrans)          |
| `tickets`           | Tiket aktif (dibuat setelah pembayaran sukses)     |
| `audit_logs`        | Log audit untuk admin manual override              |
| `webhook_payloads`  | Raw payload webhook Midtrans untuk debugging       |

Row Level Security (RLS) aktif di semua tabel. Data publik (events, kategori, stok) bisa dibaca tanpa autentikasi. Operasi server menggunakan `service_role` key.

---

## Alur Pembayaran

```
1. User pilih kategori tiket → Isi form (nama, email, telepon)
2. Server Action buat transaksi + request Snap Token ke Midtrans
3. User bayar via Midtrans Snap (QRIS, Bank Transfer, E-Wallet, dll.)
4. Midtrans kirim webhook ke POST /midtrans/callback
5. Webhook verifikasi signature → update status transaksi
6. Jika paid: decrement stok + generate tiket (ticket_code)
7. User redirect ke halaman konfirmasi → polling status via API
8. Cron job /api/cron/reconcile berjalan setiap jam sebagai safety net
```

---

## Memulai

### Prasyarat

- [Node.js](https://nodejs.org/) >= 18
- [npm](https://www.npmjs.com/) atau [pnpm](https://pnpm.io/)
- Akun [Supabase](https://supabase.com/) (project + database)
- Akun [Midtrans](https://midtrans.com/) (sandbox untuk development)
- Akun [Clerk](https://clerk.com/) (untuk admin auth)

### 1. Clone Repository

```bash
git clone https://github.com/your-username/sun6bks.git
cd sun6bks
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Salin `.env.example` ke `.env.local` dan isi semua nilai:

```bash
cp .env.example .env.local
```

| Variable                             | Deskripsi                                   |
| ------------------------------------ | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | URL project Supabase                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Anon/public key Supabase                    |
| `SUPABASE_SERVICE_ROLE_KEY`          | Service role key Supabase (server-only)     |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`    | Client key Midtrans                         |
| `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` | `false` untuk sandbox, `true` untuk produksi|
| `MIDTRANS_SERVER_KEY`                | Server key Midtrans (server-only)           |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`  | Publishable key Clerk                       |
| `CLERK_SECRET_KEY`                   | Secret key Clerk (server-only)              |
| `NEXT_PUBLIC_APP_URL`                | URL aplikasi (e.g. `http://localhost:3000`) |
| `SINGLE_EVENT_SLUG`                  | Slug event untuk landing page (opsional)    |
| `CRON_SECRET`                        | Secret untuk proteksi cron job              |
| `ORDER_STATUS_TOKEN_SECRET`          | Secret HMAC untuk signed status token       |

### 4. Setup Database

Jalankan migration SQL di Supabase SQL Editor secara berurutan:

1. `supabase/migrations/001_initial_schema.sql` — Buat tabel, index, RLS
2. `supabase/migrations/002_decrement_stock_rpc.sql` — RPC untuk atomic stock decrement

### 5. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## Scripts

| Script          | Perintah         | Deskripsi                        |
| --------------- | ---------------- | -------------------------------- |
| `dev`           | `npm run dev`    | Jalankan development server      |
| `build`         | `npm run build`  | Build untuk production           |
| `start`         | `npm run start`  | Jalankan production server       |
| `lint`          | `npm run lint`   | Jalankan ESLint                  |
| `test`          | `npm run test`   | Jalankan unit + integration + e2e internal |
| `test:unit`     | `npm run test:unit` | Unit test domain payment utils |
| `test:integration` | `npm run test:integration` | Integration test route payment/public API |
| `test:e2e`      | `npm run test:e2e` | E2E internal flow (module-level) |
| `test:coverage` | `npm run test:coverage` | Coverage gate untuk unit + integration |
| `test:smoke:sandbox` | `npm run test:smoke:sandbox` | Smoke optional ke Midtrans sandbox |

---

## Testing Runbook (Payment & Public API)

### Cakupan wajib

- `Success`: create order -> callback/polling -> status `paid` -> tiket aktif -> invoice tersedia
- `Failure`: invalid signature, transaction not found, unauthorized access, expired/failed status
- `Retry`: pending disinkronkan via polling dan cron reconcile
- `Callback handling`: idempotency, transition guard, optimistic locking, response aman untuk mencegah retry storm

### Struktur test

- `tests/unit/*` untuk helper payment (`mapMidtransStatus`, `isValidTransition`, `verifySignature`, `formatJakartaTime`)
- `tests/integration/*` untuk route handler:
  - `/midtrans/callback`
  - `/api/transactions/[orderId]`
  - `/api/cron/reconcile`
  - `/api/user/orders/[orderId]/detail`
  - `/api/user/orders/[orderId]/invoice`
- `tests/e2e/*` untuk lifecycle internal end-to-end lintas modul
- `tests/smoke/*` untuk smoke opsional ke environment sandbox

### Menjalankan test

```bash
npm run test
```

### Menjalankan smoke sandbox (opsional)

```bash
MIDTRANS_SMOKE_BASE_URL=https://your-domain.vercel.app npm run test:smoke:sandbox
```

### Coverage gate

Vitest coverage threshold minimum (dijalankan via `npm run test:coverage`):

- Lines: `70%`
- Functions: `70%`
- Statements: `70%`
- Branches: `60%`

Jika coverage di bawah threshold, pipeline test akan gagal.

---

## CI Pipeline (GitHub Actions)

Workflow yang tersedia:

- `CI Tests` (`.github/workflows/ci-tests.yml`)
  - Trigger: `push` ke `main/master`, `pull_request`, dan manual (`workflow_dispatch`)
  - Menjalankan:
    - `npm run test`
    - `npm run test:coverage`
- `Nightly Smoke` (`.github/workflows/nightly-smoke.yml`)
  - Trigger: nightly (`cron: 00:00 UTC`) dan manual
  - Menjalankan:
    - `npm run test:smoke:sandbox`

### Secret wajib untuk nightly smoke

- `MIDTRANS_SMOKE_BASE_URL`  
  Base URL environment yang expose endpoint smoke (`/api/test-midtrans`), contoh: `https://your-domain.vercel.app`

---

## Deployment (Vercel)

1. Push ke repository GitHub
2. Import project di [Vercel](https://vercel.com/)
3. Tambahkan semua environment variables dari `.env.example`
4. Set `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=true` dan gunakan production keys Midtrans
5. Pastikan `NEXT_PUBLIC_APP_URL` sesuai domain Vercel
6. Cron job (`/api/cron/reconcile`) sudah dikonfigurasi di `vercel.json` berjalan setiap jam

### Midtrans Webhook URL

Set Notification URL di Midtrans Dashboard:

```
https://your-domain.vercel.app/midtrans/callback
```

---

## Admin Panel

Admin panel tersedia di `/admin` dan dilindungi oleh Clerk authentication.

- **Dashboard** — Statistik revenue, total transaksi, events, dan tiket aktif
- **Transaksi** — Daftar transaksi, re-check status Midtrans, manual override

> Akses admin dibatasi berdasarkan email yang terdaftar di konfigurasi.

---

## API Endpoints

| Method | Path                            | Auth       | Deskripsi                             |
| ------ | ------------------------------- | ---------- | ------------------------------------- |
| POST   | `/midtrans/callback`            | Signature  | Webhook notifikasi Midtrans           |
| GET    | `/api/transactions/:orderId`    | Signed URL / Owner | Polling status transaksi      |
| GET    | `/api/cron/reconcile`           | CRON_SECRET| Rekonsiliasi transaksi pending        |

---

## License

Private project — All rights reserved.
