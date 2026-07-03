# STO Web App

Aplikasi web **Stock Taking Tag** mobile-first untuk input STO via HP, leader check, resume, export Excel, dan print audit form.

## Fitur MVP

- Login role demo: `admin`, `agung`, `leader` dengan password default `1234`
- Input STO mobile dengan **Input Mode** dan **Full Mode**
- Operator cukup input **Box** dan **Fraction**
- Quick button `-1`, `+1`, `+5`, `+10`, `Reset`
- Mini calculator per item, contoh `3 x 10 + 4`
- Rumus otomatis: `(Qty/Box × Jumlah Box) + Fraction`
- Start Time otomatis saat Tag dibuka
- End Time dan Duration otomatis saat Simpan
- Signature creator otomatis
- Leader check per item atau check OK per Tag
- Signature leader otomatis
- Resume transaksi
- Export Excel format report existing
- Print audit form A4 portrait
- Master Part, Tag, Tag Detail dengan import/export Excel
- User Management: tambah/edit user, role, default area, active/inactive, reset password, import/export user

> Catatan: versi awal ini memakai `localStorage` browser agar cepat deploy di Vercel. Untuk production multi-user, lanjutkan integrasi database seperti Supabase/PostgreSQL.

## Cara Run Local

```bash
npm install
npm run dev
```

Buka:

```bash
http://localhost:3000
```

## Deploy ke GitHub + Vercel

1. Buat repository baru di GitHub.
2. Upload semua file project ini.
3. Login Vercel.
4. Klik **Add New Project**.
5. Import repository GitHub.
6. Framework akan otomatis terdeteksi sebagai **Next.js**.
7. Klik **Deploy**.

## Struktur Penting

```text
app/page.tsx       UI dan logic utama aplikasi
app/globals.css    styling mobile-first dan print
lib/types.ts       type data STO
lib/sampleData.ts  data sample master dan user demo
```

## Login Demo

```text
admin   = role ADMIN
agung   = role OPERATOR
leader  = role LEADER
```

Password default untuk semua user demo: `1234`.
