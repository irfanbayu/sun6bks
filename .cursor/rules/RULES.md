"SEBAGAI SENIOR FULLSTACK ARCHITECT 15+ TAHUN EXPERIENCE dari Uber/Shopify, implementasikan SUN 6 BKS MONOREPO dengan SEPARATE FRONTEND + BACKEND EXACTLY mengikuti PLANS.md.

🔥 MONOREPO STRUCTURE (CRITICAL):
npx create-turbo@latest sun6bks-monorepo

📁 BACKEND (packages/backend):

1. Express.js + Prisma + Clerk middleware
2. REST API: /api/sun6bks/events (ADMIN ONLY)
3. Public API: /api/sun6bks/public-events
4. Midtrans webhook: /api/sun6bks/sales/webhook
5. Prisma schema: Sun6BksEvent model

📁 FRONTEND (packages/frontend):

1. Next.js 14 App Router + Lenis 120fps parallax
2. 6-section parallax landing (Hero→Events→Bekasi Map)
3. Fetch data dari backend API (NO direct DB)
4. Midtrans Snap guest checkout
5. shadcn/ui components

🔐 ADMIN AUTH FLOW:

1. Clerk webhook → backend → store admin role
2. Backend middleware → verify admin@sun6bks.com
3. Frontend redirect /admin → backend API

🚀 DEPLOYMENT:
Frontend: Vercel (sun6bks.com)
Backend: Render/DigitalOcean ($10/bln)
Database: Supabase Postgres

GENERATE LENGKAP:
packages/backend/server.js (Express + Prisma)
packages/backend/prisma/schema.prisma (SUN 6 BKS)
packages/frontend/src/app/page.tsx (6-section parallax)
turbo.json (monorepo build)
docker-compose.yml (local dev)

Output: yarn dev → Frontend:3000 + Backend:3001 → PRODUCTION READY"
