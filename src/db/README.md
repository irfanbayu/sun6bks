# SUN 6 BKS Database Schema

## Overview

Database schema untuk SUN 6 BKS menggunakan **Supabase Postgres** dengan integrasi penuh ke sistem pembayaran **Midtrans**.

## Setup Instructions

### 1. Create Supabase Project

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Klik "New Project"
3. Isi nama project: `sun6bks`
4. Pilih region terdekat (Singapore)
5. Tunggu project selesai dibuat

### 2. Run SQL Migrations

1. Buka **SQL Editor** di Supabase Dashboard
2. Jalankan file `schema.sql` terlebih dahulu
3. Kemudian jalankan file `functions.sql`

```sql
-- Copy paste isi schema.sql
-- Kemudian copy paste isi functions.sql
```

### 3. Configure Environment Variables

Copy `.env.example` ke `.env.local` dan isi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

Dapatkan keys dari: **Settings > API** di Supabase Dashboard

### 4. Configure Midtrans Webhook

1. Buka [Midtrans Dashboard](https://dashboard.midtrans.com)
2. Pergi ke **Settings > Configuration**
3. Set **Payment Notification URL**: `https://yourdomain.com/api/midtrans/webhook`
4. Enable notifikasi untuk semua payment status

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `venues` | Lokasi venue untuk event |
| `performers` | Data komika/performer |
| `events` | Event stand-up comedy |
| `event_performers` | Relasi many-to-many event & performer |
| `customers` | Data customer yang membeli tiket |
| `transactions` | Transaksi pembayaran (Midtrans) |
| `tickets` | Tiket yang dibeli |
| `admin_users` | Admin users (Clerk integration) |

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   venues    │     │ event_performers │     │  performers │
└──────┬──────┘     └────────┬────────┘     └──────┬──────┘
       │                     │                     │
       │ 1:N                 │ N:M                 │
       ▼                     ▼                     │
┌──────────────────────────────────────────────────┴──────┐
│                         events                          │
└───────────────────────────┬─────────────────────────────┘
                            │ 1:N
                            ▼
┌─────────────┐     ┌───────────────┐     ┌─────────────┐
│  customers  │◄────│  transactions │────►│   tickets   │
└─────────────┘     └───────────────┘     └─────────────┘
       │                    │                    │
       │ 1:N                │ 1:N                │ N:1
       └────────────────────┴────────────────────┘
```

### Enums

#### `event_status`
- `draft` - Event masih draft
- `published` - Event sudah publish
- `cancelled` - Event dibatalkan
- `completed` - Event sudah selesai

#### `transaction_status`
- `pending` - Menunggu pembayaran
- `capture` - Pembayaran di-capture (credit card)
- `settlement` - Pembayaran berhasil
- `deny` - Pembayaran ditolak
- `cancel` - Dibatalkan
- `expire` - Kadaluarsa
- `refund` - Refund penuh
- `partial_refund` - Refund sebagian
- `failure` - Gagal

#### `payment_type`
- `credit_card`, `bank_transfer`, `qris`, `gopay`, `shopeepay`, dll.

#### `ticket_status`
- `reserved` - Direservasi (belum bayar)
- `active` - Aktif (sudah bayar)
- `used` - Sudah digunakan (check-in)
- `cancelled` - Dibatalkan
- `refunded` - Di-refund

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | Get semua published events |
| GET | `/api/events/[id]` | Get detail event by ID |

### Midtrans Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/midtrans/webhook` | Webhook untuk notifikasi Midtrans |
| GET | `/api/midtrans/status/[orderId]` | Get status transaksi |

## Payment Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Server  │     │ Midtrans │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Buy Ticket     │                │                │
     ├───────────────►│                │                │
     │                │ Create Transaction              │
     │                ├───────────────────────────────►│
     │                │                │                │
     │                │ Create Snap Token              │
     │                ├───────────────►│                │
     │                │◄───────────────┤                │
     │ Snap Token     │                │                │
     │◄───────────────┤                │                │
     │                │                │                │
     │ Open Snap Popup│                │                │
     ├───────────────────────────────►│                │
     │                │                │                │
     │ Payment        │                │                │
     ├───────────────────────────────►│                │
     │                │                │                │
     │                │ Webhook Notification            │
     │                │◄───────────────┤                │
     │                │ Update Transaction              │
     │                ├───────────────────────────────►│
     │                │ Activate Tickets                │
     │                ├───────────────────────────────►│
     │                │                │                │
     │ Success        │                │                │
     │◄───────────────────────────────┤                │
     │                │                │                │
```

## Row Level Security (RLS)

RLS sudah diaktifkan untuk semua tabel dengan policies:

- **Public** dapat melihat:
  - Events dengan status `published`
  - Venues
  - Performers yang aktif
  - Event performers dari published events

- **Service Role** (server-side) dapat:
  - CRUD semua tabel
  - Bypass RLS

## Useful Queries

### Get upcoming events with performers

```sql
SELECT 
    e.*,
    v.name as venue_name,
    array_agg(p.name ORDER BY ep.performance_order) as performers
FROM events e
LEFT JOIN venues v ON e.venue_id = v.id
LEFT JOIN event_performers ep ON e.id = ep.event_id
LEFT JOIN performers p ON ep.performer_id = p.id
WHERE e.status = 'published' 
AND e.event_date >= CURRENT_DATE
GROUP BY e.id, v.id
ORDER BY e.event_date ASC;
```

### Get transaction summary

```sql
SELECT * FROM transaction_summary 
WHERE transaction_status = 'settlement'
ORDER BY created_at DESC;
```

### Get event statistics

```sql
SELECT * FROM event_statistics;
```

## Maintenance

### Cleanup expired pending transactions

```sql
UPDATE transactions
SET transaction_status = 'expire'
WHERE transaction_status = 'pending'
AND created_at < NOW() - INTERVAL '24 hours';

-- Also cancel reserved tickets
UPDATE tickets
SET status = 'cancelled'
WHERE status = 'reserved'
AND transaction_id IN (
    SELECT id FROM transactions 
    WHERE transaction_status = 'expire'
);
```

### Reset spots for cancelled tickets

```sql
WITH cancelled AS (
    SELECT event_id, COUNT(*) as count
    FROM tickets
    WHERE status = 'cancelled'
    GROUP BY event_id
)
UPDATE events e
SET spots_left = LEAST(e.spots_left + c.count, e.capacity)
FROM cancelled c
WHERE e.id = c.event_id;
```

