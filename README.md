<div align="center">

# 🎈 Alfabet Ceria — Fonik, Bola Boni & Kereta Cepat Wush

**Media Pembelajaran & Game Interaktif Mengenal Huruf untuk Kelas 1 SD**  
Dioptimalkan khusus untuk **IFP (Interactive Flat Panel) 75 Inci rasio 16:9**, **GitHub Pages (PWA Offline)**, dan **APK Android**.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-10B981?style=for-the-badge)
![IFP 16:9](https://img.shields.io/badge/IFP%2075%22-16%3A9%20Zero%20Scroll-2563EB?style=for-the-badge)

🌐 **[Mainkan Secara Online (GitHub Pages)](https://ashtersai.github.io/Alfabet-Ceria-IFP/)**

</div>

---

## ✨ Fitur Utama

- **Terkunci Pas Layar IFP 75 Inci (16:9 & Zero Scroll)**  
  Tata letak proporsional (`100vw × 100dvh`) tanpa naik-turun atau geser layar, nyaman disentuh siswa dari jarak dekat pada resolusi Full HD maupun 4K.
- **Wajib Mode Lanskap**  
  Jika dibuka pada HP atau tablet dalam posisi berdiri (*portrait*), layar otomatis meminta pengguna memutar perangkat ke posisi mendatar (*landscape*).
- **26 Ilustrasi Vektor Kawaii (`A–Z`)**  
  Menggunakan aset SVG ringan dan tajam (`assets/items/a.svg` – `z.svg`) agar gambar tidak pecah di layar besar dan tetap hemat ukuran untuk APK.
- **Sistem Audio Hybrid (Online, Offline & Studio Suara Guru)**  
  Mendukung mode **Otomatis**, **Online (GitHub)**, dan **Offline (APK / AndroidBridge)**. Guru dapat merekam suara sendiri langsung di aplikasi, mengunggah file audio (`MP3`/`WAV`/`M4A`), mengunduh rekaman per huruf, serta mengekspor/mengimpor paket suara (`.json`).
- **Dukungan Multi-Touch IFP**  
  Memanfaatkan *Pointer Events* (`pointerId`) sehingga 2 siswa dapat menyentuh dan menarik gerbong huruf secara bersamaan di satu papan IFP.
- **PWA Offline Ready**  
  Dilengkapi `manifest.json` dan Service Worker (`sw.js`) agar seluruh aset tersimpan otomatis di cache browser untuk penggunaan tanpa internet.

---

## 🎮 Mode Belajar & Permainan

| Mode | Pemain | Deskripsi |
| :--- | :---: | :--- |
| **Aa Papan Huruf & Fonik** | Mandiri / Klasikal | Menampilkan 26 huruf besar & kecil (`A–Z`) dalam 1 layar penuh (grid 9×3 + tombol **Acak**) lengkap dengan kotak Spotlight, ilustrasi benda, dan pelafalan Bahasa Indonesia. |
| **🎯 Tebak Pasangan Huruf** | 1 Pemain | Kuis menyimak audio **tanpa bocoran tulisan soal** di layar agar siswa benar-benar melatih pendengaran fonik. |
| **🎈 Game Bola Boni** | 1 Pemain | Balon warna-warni berwajah unik (kacamata hitam, bajak laut, kacamata bulat, normal, melirik) beterbangan di layar. Salah klik 1× balon **menangis**, salah 2× **emosi**, salah ≥3× **emot mati**, dan jawaban benar berubah **mata love-love** lalu meletus. |
| **🚆 Kereta Cepat Wush** | 1 Pemain (vs Robot) | Layar atas menampilkan lintasan balap ke gerbang **FINISH**; layar bawah menampilkan slot huruf (kiri) dan **Bank Abjad** acak (kanan). Setiap gerbong yang benar melajukan kereta melawan Robot Wush (kecepatan *Santai*, *Normal*, *Cepat*). |
| **⚔️ Mode Adu / VS** | 2 Pemain | Tersedia untuk **Adu Kartu Huruf**, **Adu Bola Boni**, dan **Adu Kereta Wush** (3 kotak bawah: Murid 1, Bank Abjad tengah, Murid 2). Pihak yang kalah menampilkan animasi **siswa SD berseragam Merah Putih menangis**, sedangkan pemenang bersorak gembira. |

---

## 📂 Struktur Folder

```text
Alfabet-Ceria-IFP/
├── index.html              # Halaman utama aplikasi
├── manifest.json           # Konfigurasi PWA & kunci orientasi lanskap
├── sw.js                   # Service Worker untuk cache offline
├── css/
│   ├── style.css           # Gaya utama, skala 16:9, overlay lanskap
│   └── train.css           # Tata letak khusus Game Kereta Cepat Wush
├── js/
│   ├── data.js             # Data 26 huruf A-Z, ejaan Indonesia & path gambar
│   ├── audio.js            # Mesin audio hybrid, SFX, BGM & Studio Suara Guru
│   ├── confetti.js         # Efek konfeti kanvas ringan (offline)
│   ├── train.js            # Logika multi-touch Kereta Cepat Wush & Robot
│   └── game.js             # Logika utama Papan Huruf, Kuis, Bola Boni & VS
└── assets/
    ├── icon.svg            # Ikon aplikasi
    ├── mascot.svg          # Maskot Kelinci Boni
    ├── sd_happy.svg        # Animasi siswa SD menang
    ├── sd_crying.svg       # Animasi siswa SD menangis saat kalah
    ├── train_p1.svg        # Kereta Pemain 1
    ├── train_p2.svg        # Kereta Pemain 2 / Robot
    ├── items/              # 26 ilustrasi vektor kawaii (a.svg - z.svg)
    └── audio/              # Folder opsional audio statis offline (a.mp3 - z.mp3)
