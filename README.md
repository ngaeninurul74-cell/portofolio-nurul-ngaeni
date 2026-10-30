# Portofolio & Web Assets - Nurul Ngaeni

Repositori ini berisi aset digital, materi kurasi, dan dokumentasi foto untuk website portofolio / landing page **Nurul Ngaeni**.

---

## Profil Singkat
- **Pendidikan**: Mahasiswa S1 Manajemen Universitas Negeri Yogyakarta (UNY)
- **Bidang Keahlian**: Public Speaking, Event Management, Digital Marketing, dan Brand Communication
- **Kontak**:
  - Email: `nurulngaeni.2024@student.uny.ac.id`
  - WhatsApp: `+62 8571 2314 820`
  - LinkedIn: [Nurul Ngaeni](https://id.linkedin.com/in/nurul-ngaeni-608187320)
  - Domisili: Klaten, Jawa Tengah & D.I. Yogyakarta

---

## Struktur Direktori
- **`landing_page_assets/`**: Aset foto yang sudah dikurasi, dioptimasi, dan diorganisir secara semantik untuk kebutuhan website:
  - `hero/`: Foto profil utama untuk hero section & closing CTA
  - `about/`: Foto profil formal dan infografis kompetensi
  - `mc/`: Dokumentasi Master of Ceremony (40+ event: UMKM Expo, Karnaval Budaya, FEB Berprestasi)
  - `moderator/`: Dokumentasi Moderator (bersama Bupati Klaten, Talkshow Kewirausahaan)
  - `speaker/`: Dokumentasi Narasumber & Guru Tamu (SMKN 1 Klaten, LDKS, Broadcasting)
  - `modeling/`: Dokumentasi Muse & Fashion Model (Klaten Fashion Festival, Lurik Karnival)
  - `organizations/`: Dokumentasi Pramuka, Dewan Kerja Cabang, dan Duta Anti-Bullying
  - `achievements/`: Foto penghargaan, piala LKS Marketing, dan Mbak Klaten
  - `projects/`: Dokumentasi proyek PPK Ormawa (Segara Ikanura), Ayo Piknik Klaten (APIK), dan Bisnis Hijab
  - `portfolio-content.json` & `portfolio-content.js`: Konten teks dan statistik siap pakai dengan integrasi kelas Bootstrap Icons
  - `assets_manifest.json`: Metadata dimensi, resolusi, dan format aset
- **`foto_portofolio/`**: 52 foto asli beresolusi tinggi hasil ekstraksi dari berkas PDF portofolio
- **`halaman_portofolio/`**: Render halaman penuh (Halaman 1–15) sebagai referensi visual tata letak
- **`DAFTAR_FOTO.md`**: Tabel katalog lengkap 52 foto

---

## Penggunaan Aset Web
Semua foto di dalam `landing_page_assets/` tersedia dalam format **WebP** (modern & performa tinggi) dan **PNG/JPG** (resolusi tinggi).
Ikon antarmuka menggunakan **Bootstrap Icons** (`bi bi-*`).

Data konten teks, metrik, dan ikon dapat langsung diimpor dari:
```javascript
import { portfolioData } from './landing_page_assets/portfolio-content.js';
```
atau menggunakan file `landing_page_assets/portfolio-content.json`.
