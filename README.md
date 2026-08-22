# 🍼 Baby Milk & Activity Tracker (PWA + Supabase Realtime)

Aplikasi Progressive Web App (PWA) modern untuk melacak pemberian susu bayi, status ketahanan botol, estimasi sisa stok kaleng susu, serta aktivitas Tummy Time harian yang digunakan secara bersamaan oleh **Ayah dan Ibu** dengan sinkronisasi **Realtime**.

---

## 🌟 Fitur Utama
1. **Realtime Baby Feeding Tracker:**
   - Presets Quick Action (60ml, 90ml, 120ml, 150ml + Kustom).
   - Alur Status Botol: `Dibuat` ➡️ `Mulai Minum` ➡️ `Selesai/Habis`.
   - Realtime Listeners: Perubahan di HP Ayah langsung ter-update di HP Ibu secara otomatis tanpa refresh.

2. **Manajemen Stok Susu & Prediksi Habis:**
   - Input berat kaleng utuh (misal 800g), gram per scoop, dan air ml per scoop.
   - Otomatis memotong sisa gram kaleng saat tombol "Buat Susu" diklik (via Supabase Database Trigger & Optimistic UI).
   - Kalkulasi konsumsi harian 7 hari terakhir & estimasi kapan harus beli kaleng baru (`estimated_days_left`).

3. **KMS Digital & Kurva Pertumbuhan WHO:**
   - Pencatatan berkala: Berat Badan (BB), Panjang Badan (PB), dan Lingkar Kepala (LK).
   - Evaluasi otomatis KBM (Kenaikan Berat Minimum Kemenkes RI) dan status gizi WHO.
   - Grafik interaktif responsif SVG dengan visualisasi kurva pita standar WHO.

4. **White Noise & Shusher Player (100% Offline):**
   - Web Audio API Sound Synthesizer tanpa butuh file MP3 eksternal & hemat kuota.
   - 7 pilihan suara: Shusher ritmis ("Shhh..."), Rahim & Jantung, Hujan Lembut, Ombak Laut, Kipas Angin, Brown Noise, dan White Noise.
   - Sleep timer otomatis (15m, 30m, 45m, 60m, Non-stop) dengan fade-out halus.

5. **Smart Timers & Health Reminders:**
   - Countdown basi susu: 2 jam saat dibuat, 1 jam dari minum.
   - **Countdown 20 menit posisi tegak / anti-refluks (sendawa)** setelah minum selesai, dilengkapi **Audio Alert (Web Audio API)** saat waktu habis.
   - Tracker sesi Tummy Time harian dengan stopwatch live.
   - Pelacak ganti popok (Pipis & Pup) harian.
   - Pelacak waktu tidur & Wake Window.

6. **PWA Mobile-First & Dark Mode:**
   - Installable di Homescreen Android/iOS (Web App Manifest + Service Worker).
   - Skema warna Dark Mode Slate/Indigo yang nyaman di mata saat terbangun malam hari.
   - Navigasi geser mobile responsif dengan haptic vibration.

---

## 🛠️ Langkah Demi Langkah Setup & Jalankan

### Langkah 1: Eksekusi SQL di Supabase Query Editor
Buka [Supabase Dashboard](https://app.supabase.com/), pilih proyek Anda, masuk ke **SQL Editor**, lalu jalankan skrip SQL yang ada di file `supabase/schema.sql`.

Skrip SQL tersebut akan membuat:
- Tabel `formula_inventories`, `feeding_logs`, `baby_activities`, `baby_profiles`, dan `growth_logs`.
- Trigger otomatis `deduct_formula_on_feeding()` untuk pemotongan gram stok.
- View SQL `v_formula_stock_prediction` untuk menghitung rata-rata 7 hari & sisa hari.
- Publikasi Realtime (`supabase_realtime`).

### Langkah 2: Atur Environment Variables
Buat file `.env.local` di root proyek:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_FAMILY_ID=family_123
```

### Langkah 3: Install Dependensi & Jalankan Development Server
```bash
# Install paket dependensi
npm install

# Jalankan dev server
npm run dev
```
Akses di browser: `http://localhost:3000`

### Langkah 4: Uji PWA di HP Ayah & Ibu
- Buka browser Chrome (Android) atau Safari (iOS) di HP.
- Klik banner **"Install Baby Tracker PWA"** atau pilih **"Add to Home Screen"**.
- Coba klik **"Buat Susu 90ml"** di HP Ayah ➡️ Status & stok di HP Ibu akan berubah secara **Realtime**!
