# ⚙️ SPK Tools — Sistem Peminjaman Alat

Sistem manajemen peminjaman alat untuk lab/bengkel. Dilengkapi dengan role-based access, multi-item transaction, approval workflow, denda otomatis, unit tracking fisik, notifikasi, dan export Excel.

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: MySQL + Prisma v5
- **Auth**: NextAuth v5 (Auth.js) — session via cookies (JWT)
- **State**: React Query v5
- **Validasi**: Zod v3
- **Export**: ExcelJS

## 🚀 Getting Started

### 1. Setup Database

Pastikan MySQL Running, lalu sesuaikan `.env`:

```env
DATABASE_URL="mysql://root:@localhost:3306/spk_tools"
AUTH_SECRET="ganti-ini-dengan-secret-random"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Install & Setup

```bash
npm install
npm run db:setup    # push schema + seed data
```

### 3. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 👤 Akun Default (Seed)

| Role     | Email              | Password    |
|----------|--------------------|-------------|
| Admin    | admin@spk.com      | admin123    |
| Petugas  | petugas@spk.com    | petugas123  |
| Peminjam | user@spk.com       | user123     |

## 📋 Flow Sistem

```
PEMINJAM request → PENDING
  ↓
ADMIN/PETUGAS approve → APPROVED (set qtyApproved per item)
  ↓
ADMIN/PETUGAS pickup → ONGOING (assign unit fisik)
  ↓
PEMINJAM return → Return record created (denda telat otomatis)
  ↓
ADMIN/PETUGAS selesaikan → DONE (denda kerusakan, release unit)
```

## 🗃️ Database Schema

- **User** — role: ADMIN | PETUGAS | PEMINJAM
- **Category** — kategori alat
- **Tool** — data alat (nama, brand, kategori)
- **ToolUnit** — unit fisik (kode unik, status)
- **Loan** — data pinjaman
- **LoanItem** — item per pinjaman (qty request & approved)
- **LoanUnit** — tracking unit fisik yang dipinjam
- **Return** — data pengembalian + denda
- **Notification** — notifikasi in-app
- **Setting** — konfigurasi (denda per hari)

## 📂 Struktur Project

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # login, register, NextAuth
│   │   ├── categories/     # CRUD kategori
│   │   ├── tools/          # CRUD alat
│   │   ├── loans/          # CRUD pinjaman + approval + pickup + return
│   │   ├── notifications/  # notifikasi
│   │   ├── settings/       # pengaturan
│   │   ├── users/          # manajemen user
│   │   └── export/         # export Excel
│   ├── dashboard/          # halaman dashboard (role-based)
│   └── login/              # halaman login/register
├── components/
│   └── Providers.tsx       # QueryClient + SessionProvider
├── lib/
│   ├── auth.ts             # NextAuth config
│   ├── prisma.ts           # Prisma client singleton
│   ├── permission.ts       # role guard + error handler
│   └── validations.ts      # Zod schemas
├── services/
│   └── notificationService.ts
└── types/
    └── next-auth.d.ts      # type augmentation
```

## 🔐 Security

- Session-based auth (JWT in cookies)
- Role-based access control per endpoint
- Zod validation on all inputs
- Prisma transaction for race condition prevention
- No userId from frontend — always from session

## 📊 Fitur

- ✅ Login/Register
- ✅ Dashboard dengan statistik
- ✅ CRUD Alat + Kategori
- ✅ Multi-item loan request
- ✅ Approval/Reject per item
- ✅ Pickup (assign unit fisik)
- ✅ Return + denda keterlambatan otomatis
- ✅ Denda kerusakan (manual)
- ✅ Notifikasi real-time
- ✅ Export Excel (filter tanggal)
- ✅ Manajemen user & setting

## 🧑‍💻 Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run db:push      # push schema to database
npm run db:seed      # seed database
npm run db:setup     # push + seed
npm run db:studio    # open Prisma Studio
npm run db:generate  # generate Prisma client
```
# spk1
