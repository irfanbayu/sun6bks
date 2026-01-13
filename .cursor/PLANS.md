# 🚀 PRD: SUN 6 BKS | Standupindo Bekasi - Admin-Only Backend Landing Page

## Single Document Blueprint untuk Cursor AI Generation

**Version 1.0 | Jan 12, 2026 | Bekasi, Indonesia | Admin-Controlled | Ready-to-Code**

---

## 🎯 1. PRODUCT OVERVIEW

```
**Nama:** SUN 6 BKS | Standupindo Bekasi
**Type:** **SINGLE LANDING PAGE** dengan Parallax Scroll + **ADMIN-ONLY BACKEND**
**Target Users:**
- **Frontend:** Penggemar stand-up comedy Bekasi/Jakarta (18-35 tahun)
- **Backend:** **ADMIN KOMUNITAS ONLY** (tidak publik)
**Business Goal:** Convert 10% visitor → ticket buyer + Admin full control events
**Inspirasi:** Apple.com parallax + Airtable-style admin dashboard

### Key Metrics (3 Bulan Pertama)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Views | 10.000 | Google Analytics |
| Ticket Sales | 500 tiket | Midtrans Dashboard |
| Bounce Rate | <40% | GA4 |
| Admin Events | 50+ events | Admin Dashboard |

### User Personas
- Andi (25, Bekasi): "Cari SUN 6 BKS malam ini via HP → beli tiket → selesai"
- Admin Rina (28, Organizer): "Login admin → tambah/edit event → publish → track sales"
```

---

## 📱 2. ARCHITECTURE: Frontend + Admin Backend

```
PUBLIC LANDING PAGE (No Login Required)
├── 6 Parallax Sections (Hero→Events→Performers→Map→Pricing→CTA)
└── Midtrans Guest Checkout

🔒 ADMIN BACKEND (/admin - Login Required)
├── Event CRUD (Create/Read/Update/Delete)
├── Sales Analytics
├── Performer Management
└── Content Moderation
```

---

## 🏗 3. PAGE STRUCTURE

### PUBLIC LANDING PAGE (6 Sections - Parallax Scroll)

```
| # | Section | Parallax Effect | Content | CTA |
|---|---------|-----------------|---------|-----|
| **1** | **Hero** | Video komedi loop | "SUN 6 BKS BEKASI 20 JAN" | Scroll ↓ |
| **2** | **Upcoming Events** | Cards slide-up | 6 SUN 6 BKS events | "Beli Tiket" Modal |
| **3** | **Top Performers** | Headshots zoom-in | Bekasi komedian | Scroll ↓ |
| **4** | **Venues Map** | Google Maps parallax | Bekasi venues | Venue detail |
| **5** | **Pricing** | Price cards animate | SUN 6 BKS tiers | "Beli Rp50K" |
| **6** | **Footer CTA** | Fixed WhatsApp | Bekasi community | WA/IG/TikTok |

┌─ Dashboard Overview ──────────────┐
│ Total Sales: Rp25.000.000 │ Events: 12 │ Tickets Sold: 450 │
├─ Events Management ───────────────┤
│ [Tambah Event] [Edit] [Delete] │
│ SUN 6 BKS #6 - 20 Jan - 250 sold │
├─ Performers ──────────────────────┤
│ Dedi, Echa, Fajar (CRUD) │
└─ Sales Analytics (Chart) │
```

---

## ✨ 4. PARALLAX + ADMIN TECHNICAL SPECIFICATION

### Public Landing Page (Same as PRD)

```tsx
// Framer Motion parallax - 60fps smooth
const { scrollYProgress } = useScroll();
const bgY = useTransform(scrollYProgress, , ['0%', '-50%']);

Admin Backend (Protected Routes)
// app/admin/route.ts - Server Action ONLY accessible by admin
// Clerk/Supabase Auth - Role: ADMIN_ONLY
const adminEvents = await db.query.events.findMany({
  where: eq(events.communityId, 'sun6bks')
});
```

---

## 🎨 5. SUN 6 BKS SPECIFIC CONTENT

### Sample Event Data (Bekasi Focus)

```json
{
  "community": "SUN 6 BKS | Standupindo Bekasi",
  "events": [
    {
      "id": 1,
      "title": "SUN 6 BKS #6 - Malam Komedi Bekasi",
      "date": "20 Jan 2026 -  20:00 WIB",
      "venue": "Komik Station Bekasi Square",
      "performers": ["Dedi", "Echa", "Fajar", "Rina Bekasi"],
      "price": "Rp50.000",
      "map": { "lat": -6.2355, "lng": 106.9926 }, // Bekasi
      "adminOnly": true
    }
  ]
}
```

### Sample Event Data (Bekasi Focus)

```
1. Komik Station Bekasi Square (-6.2355, 106.9926)
2. Standup Bekasi Mall (Bekasi Timur)
3. KTV Spot Bekasi Selatan
```

## 🚀 6. MVP FEATURES

### PUBLIC LANDING PAGE (No Changes)

```
✅ Parallax 6 sections
✅ Guest checkout Midtrans
✅ Sticky "Beli Tiket Rp50K"
✅ Mobile-first responsive
```

### NEW: ADMIN BACKEND (KOMUNITAS ONLY)

```
🔒 /admin (Login: admin@sun6bks.com)
✅ Event CRUD (Title/Date/Venue/Performers/Price/Map)
✅ Real-time sales dashboard
✅ Performer management
✅ Export sales CSV
✅ Publish/unpublish events
✅ Role: ADMIN ONLY (Clerk/Supabase Auth)
```

---

## 🛠 7. TECH STACK (Updated untuk Admin Backend)

| Component | Package                  | Purpose                |
| --------- | ------------------------ | ---------------------- |
| Framework | Next.js 14 App Router    | SSR + Admin Routes     |
| Auth      | Clerk / Supabase Auth    | Admin-only access      |
| Database  | Supabase Postgres        | Events + Sales         |
| Parallax  | framer-motion + lenis    | 60fps public page      |
| Admin UI  | shadcn/ui + Lucide React | Professional dashboard |
| Payment   | midtrans-snap            | Guest checkout         |

---

## 🔐 8. ADMIN-ONLY SECURITY

```
1. Clerk/Supabase Auth: admin@sun6bks.com + password
2. Role-Based Access: ADMIN_ONLY untuk /admin/*
3. Server-Side Rendering: Events data dari DB (no public API)
4. Rate Limiting: Admin actions 60/min
5. Audit Log: Semua admin changes tracked
```

---

## 📱 9. USER FLOWS

Public User (3 Clicks to Payment)

```
Landing → Scroll Events → Click Card → Modal → Beli Rp50K
```

Admin Flow (Full Control)

```
Login /admin → Dashboard → "Tambah Event SUN 6 BKS #7"
→ Isi form → Preview → Publish → Track Sales Real-time
```

---

## ⚡ 10. PERFORMANCE REQUIREMENTS

```
Public Page: Lighthouse 95+ Mobile
Admin Dashboard: <2s load time
Database: Supabase Edge Functions
Bundle: <250KB (Public + Admin)
```

---

## 🎯 11. CURSOR AI GENERATION COMMANDS

```
# 1. Setup enterprise project
npx create-next-app@latest sun6bks --ts --tailwind --eslint --app --src-dir --import-alias="@/*"

# 2. Install admin + parallax stack
npm i @clerk/nextjs framer-motion lenis shadcn-ui@latest lucide-react
npm i @supabase/supabase-js midtrans-snap @react-google-maps/api

# 3. Cursor Commands (Execute berurutan)
# Cmd+K: "Generate SUN 6 BKS parallax landing page + admin dashboard"
# Cmd+K: "Buat /admin protected routes dengan Clerk auth"
# Cmd+K: "Supabase schema untuk sun6bks events table"
# Cmd+K: "Event CRUD admin panel shadcn/ui"
```

---

## ✅ 12. IMPLEMENTATION CHECKLIST

```checklist
PUBLIC LANDING PAGE:
[ ] Hero parallax video SUN 6 BKS
[ ] Events section (Bekasi venues)
[ ] Sticky filter + buy button
[ ] Midtrans guest checkout

ADMIN BACKEND (/admin):
[ ] Clerk auth (admin@sun6bks.com)
[ ] Event CRUD full functionality
[ ] Real-time sales dashboard
[ ] Supabase integration
[ ] Bekasi venues autocomplete
```
