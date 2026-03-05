# Types Directory

Public entry point untuk shared TypeScript types. Import dari `@/types` untuk type yang dipakai lintas modul.

## Struktur

| Folder | Dipakai untuk |
|--------|----------------|
| `domain/` | Business model murni (Event, Performer, Venue, LandingEvent) |
| `api/` | DTO request/response integrasi eksternal (Midtrans, dll) |
| `ui/` | View-model reusable lintas komponen |
| `shared/` | Utility type global (Id, Nullable, dll) |

## Kapan pakai masing-masing

- **domain/** — Konsep bisnis yang tidak tergantung UI atau API shape
- **api/** — Contract dengan service eksternal (payment, third-party)
- **ui/** — Type yang dipakai 2+ komponen untuk rendering
- **shared/** — Generic helper type (Nullable\<T\>, Id, Pagination, dll)

## Kapan type tetap colocated

- Type dipakai **hanya 1 file** → simpan di file yang memakai (inline atau di bagian atas)
- Type dipakai **hanya dalam 1 feature** → simpan di feature tersebut (mis. `app/admin/events/types.ts`, `lib/checkin/types.ts`)

## Naming convention (opsional)

- `*Dto` — API payload (request/response)
- `*ViewModel` — Data shaped untuk UI
- `*Entity` / `*Model` — Domain entity

## Infra types (tidak di folder ini)

- `@/lib/supabase/types` — DB/Supabase schema
- `@/lib/checkin/types` — Feature checkin
- `@/app/admin/events/types` — Feature admin events
