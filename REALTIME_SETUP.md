# Mengaktifkan room online

Room game memakai Supabase Realtime Broadcast. Tidak perlu membuat tabel atau mengisi `DATABASE_URL`.

1. Buat project di [Supabase](https://supabase.com/dashboard).
2. Dari project, salin Project URL dan Publishable key dari bagian API Keys.
3. Tambahkan keduanya di Vercel Project Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Pastikan Realtime aktif di project Supabase, lalu redeploy Vercel.
5. Salin kode room yang baru dibuat dan bagikan ke teman. Host harus tetap membuka room selama permainan.

Untuk pengembangan lokal, salin `.env.example` menjadi `.env.local`, isi kedua nilainya, lalu mulai ulang dev server.

Room dibuat di browser host dan diumumkan melalui channel publik yang namanya diturunkan dari kode room. Siapa pun yang memiliki kode undangan dapat mencoba masuk. Snapshot room hanya disimpan di browser host; jika host menutup browser, room tidak lagi tersedia.
