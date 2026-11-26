# Quotation to Purchase Order (PO) Tracker

Aplikasi web dan REST API berbasis **Go** untuk mengelola data penawaran harga (quotation), mencocokkan dan menautkan Purchase Order (PO) klien, mengekstrak dokumen PO dengan AI, serta memantau status pengiriman dan pembayaran.

## Fitur Utama
- **Manajemen Penawaran & PO:** Catat penawaran, tautkan PO klien, dan hitung selisih harga otomatis.
- **Smart Matching:** Cari kecocokan antara item PO dan data penawaran berdasarkan klien, PIC, qty, nama item, material, dan harga.
- **Ekstraksi PO via AI:** Upload dokumen PO (gambar/PDF) untuk mengisi form PO secara otomatis melalui OpenRouter API.
- **Tracking & Log Aktivitas:** Pantau status pengiriman (`is_delivered`), pembayaran (`is_paid`), dan riwayat aktivitas user.
- **Autentikasi JWT:** Proteksi endpoint API dengan token JWT dan hashing password `bcrypt`.

## Tech Stack
- **Backend:** Go (Gin, GORM)
- **Database:** SQLite 
- **Auth:** JWT (`golang-jwt/jwt/v5`), `bcrypt`
- **AI Service:** OpenRouter API (`google/gemini-2.5-flash-image`)
- **Frontend:** HTML, Tailwind CSS, Vanilla JavaScript

## Menjalankan Secara Lokal
1. Install dependencies:
   ```bash
   go mod download
   ```
2. Siapkan file `.env` (lihat `.env.example`), lalu isi konfigurasi yang diperlukan (`PORT`, `JWT_SECRET`, dan `OPENROUTER_API_KEY` untuk fitur ekstrak AI).
3. Jalankan server:
   ```bash
   go run main.go
   ```
4. Buka `http://localhost:8080` di browser.  
   Akun demo bawaan: `demo` / `demo123` (atau `admin` / `admin123`, dapat disesuaikan via `ADMIN_USERNAME` & `ADMIN_PASSWORD`).
