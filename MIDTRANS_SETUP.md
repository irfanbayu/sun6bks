# Setup Midtrans Payment Gateway

## Langkah-langkah Setup

### 1. Daftar Akun Midtrans

1. Kunjungi [Midtrans Dashboard](https://dashboard.midtrans.com)
2. Daftar akun baru atau login
3. Pilih **Sandbox** untuk development atau **Production** untuk live

### 2. Ambil Access Keys

#### Untuk Sandbox (Development):
1. Login ke [Sandbox Dashboard](https://dashboard.sandbox.midtrans.com)
2. Buka **Settings** → **Access Keys**
3. Copy **Server Key** (format: `SB-Mid-server-xxxx`)
4. Copy **Client Key** (format: `SB-Mid-client-xxxx`)

#### Untuk Production (Live):
1. Login ke [Production Dashboard](https://dashboard.midtrans.com)
2. Buka **Settings** → **Access Keys**
3. Copy **Server Key** (format: `Mid-server-xxxx`)
4. Copy **Client Key** (format: `Mid-client-xxxx`)

### 3. Setup Environment Variables

Buat file `.env.local` di root project dengan isi:

```env
# Midtrans Configuration

# Public keys (exposed to browser)
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server-side only (keep secret!)
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
```

**PENTING:**
- Untuk **Sandbox**: Gunakan key yang dimulai dengan `SB-Mid-`
- Untuk **Production**: Gunakan key yang dimulai dengan `Mid-`
- Jangan commit file `.env.local` ke git (sudah ada di `.gitignore`)
- `MIDTRANS_SERVER_KEY` harus di-set dengan benar, jangan ada spasi di awal/akhir

### 4. Validasi Setup

Setelah setup, pastikan:

1. ✅ Server key sesuai dengan environment:
   - Sandbox: `SB-Mid-server-xxxx`
   - Production: `Mid-server-xxxx`

2. ✅ Client key sesuai dengan environment:
   - Sandbox: `SB-Mid-client-xxxx`
   - Production: `Mid-client-xxxx`

3. ✅ `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` sesuai:
   - `false` untuk Sandbox
   - `true` untuk Production

4. ✅ Restart dev server setelah mengubah `.env.local`:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Error 401: Access denied

**Penyebab:**
- Server key tidak sesuai dengan environment (menggunakan Sandbox key di Production atau sebaliknya)
- Server key salah atau tidak ter-set
- Ada spasi di awal/akhir server key

**Solusi:**
1. Pastikan server key di `.env.local` benar dan tanpa spasi
2. Pastikan menggunakan Sandbox key jika `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false`
3. Pastikan menggunakan Production key jika `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=true`
4. Restart dev server setelah mengubah environment variables

### Error: Payment gateway belum dikonfigurasi

**Penyebab:**
- `MIDTRANS_SERVER_KEY` tidak ter-set di `.env.local`

**Solusi:**
1. Pastikan file `.env.local` ada di root project
2. Pastikan `MIDTRANS_SERVER_KEY` sudah di-set dengan benar
3. Restart dev server

### Error: Format server key tidak valid

**Penyebab:**
- Server key tidak sesuai format yang diharapkan

**Solusi:**
1. Sandbox: Pastikan dimulai dengan `SB-Mid-server-`
2. Production: Pastikan dimulai dengan `Mid-server-`
3. Copy ulang key dari dashboard Midtrans

## Testing

Setelah setup, test dengan:

1. Buka aplikasi di browser
2. Klik event card untuk membuka modal
3. Isi form customer details
4. Klik "Bayar Sekarang"
5. Midtrans Snap popup akan muncul
6. Gunakan test card untuk Sandbox:
   - Card: `4811 1111 1111 1114`
   - CVV: `123`
   - Expiry: Bulan/tahun apapun di masa depan

## Referensi

- [Midtrans Documentation](https://docs.midtrans.com)
- [Snap Integration Guide](https://docs.midtrans.com/docs/snap-snap-integration-guide)
- [Sandbox Test Cards](https://docs.midtrans.com/docs/testing-payment-gateway)
