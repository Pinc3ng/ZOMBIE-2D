# 🧟 Zombie Survival 2D (Mobile & Desktop)

Game mobile **"Zombie Survival 2D"** aksi bertahan hidup top-down berlatar kota apokaliptik yang hancur. Game ini dirancang secara khusus agar dapat:
1. **Dijalankan langsung di Antigravity IDE / Browser** (dengan kontrol keyboard, mouse, maupun simulasi layar sentuh).
2. **Dijalankan langsung di Android Studio** sebagai native Android App (lengkap dengan proyek Gradle, WebView terakselerasi hardware 60fps, fullscreen immersive mode, haptic feedback, dan kontrol virtual touch dual-joystick).

---

## 🎮 Fitur Game

- **Dual Control System**:
  - **Mobile Touch**: Virtual Joystick analog dinamis di sebelah kiri, tombol aksi (Fire, Dash, Reload, Granat, Quick Weapon switch) di sebelah kanan. Dilengkapi **Auto-Aim Assist** otomatis mengunci zombie terdekat saat menembak!
  - **Desktop / PC**: `WASD` / Tombol Panah untuk gerak, `Mouse` untuk membidik & menembak, `Spasi` / `Shift` untuk Dash menghindar, `R` untuk Reload, `G` untuk melempar Granat, angka `1` - `4` untuk mengganti senjata.
- **4 Senjata Taktis Unik**:
  1. 🔫 **M1911 Pistol**: Senjata cadangan akurat dengan cadangan peluru tak terbatas.
  2. 💥 **Remington 870 Shotgun**: Ledakan 7 butir peluru dengan knockback dahsyat untuk memukul mundur gerombolan.
  3. ⚡ **AK-47 Tactical Rifle**: Senapan serbu otomatis dengan laju tembak tinggi (rapid fire).
  4. 🚀 **BZZT-9000 Plasma Cannon**: Meriam energi berdaya tembus tinggi yang dapat menembus beberapa zombie sekaligus!
- **Rogue-lite Perk & Level-Up System**:
  - Kumpulkan kristal XP dari zombie untuk naik level.
  - Setiap naik level, pilih 1 dari 3 kartu perk (misal: *Hollow Point Rounds +25% Damage*, *Overclocked Trigger*, *Sleight of Hand Reload*, *Cyber Sprint Boots*, *Autonomous Drone Companion*, *Nanite Healer*, dll).
- **Variasi Musuh Zombie & Boss Battle**:
  - 🧟 **Walker Zombie**: Shambler standar yang menyerbu dalam jumlah besar.
  - 🏃 **Runner Zombie**: Pelari cepat dengan mata merah menyala yang langsung menerkam.
  - 🧪 **Spitter Zombie**: Menjaga jarak dan memuntahkan bola asam beracun.
  - 🛡️ **Tank Brute**: Zombie raksasa berlapis zirah dengan HP tebal dan serangan mematikan.
  - 💀 **Mutant Tyrant Boss**: Muncul setiap 5 wave lengkap dengan Boss Health Bar di atas layar dan serangan cincin paku energi!
- **Visual & Audio Atmospheric**:
  - **Night Horror Mode**: Efek sorotan senter 2D dinamis di tengah kegelapan kota.
  - **Efek Partikel**: Percikan darah permanen yang menempel di lantai arena, selongsong peluru kuningan yang berjatuhan, ledakan tong merah, dan teks damage melayang.
  - **Web Audio Synthesizer**: 100% prosedural tanpa file eksternal yang hilang/rusak.

---

## 🚀 Cara Menjalankan Langsung di Antigravity IDE

### Cara 1: Menggunakan Local Dev Server (Rekomendasi)
Buka terminal PowerShell di folder proyek dan jalankan:
```powershell
powershell -ExecutionPolicy Bypass -File .\start_game.ps1
```
Browser akan otomatis terbuka di `http://localhost:8085` dan game langsung siap dimainkan!

### Cara 2: Langsung Buka File HTML
Bisa juga langsung klik ganda atau buka file:
`C:\Users\vinss\.gemini\antigravity-ide\scratch\zombie_survival_2d\index.html`
di browser mana pun (Chrome, Edge, dsb.).

---

## 📱 Cara Menjalankan di Android Studio

Proyek Android Studio yang lengkap dan mandiri sudah disiapkan di dalam folder `android/`.

1. Buka aplikasi **Android Studio**.
2. Pilih menu **File -> Open...** (atau di Welcome Screen klik **Open**).
3. Arahkan dan pilih folder:
   ```
   C:\Users\vinss\.gemini\antigravity-ide\scratch\zombie_survival_2d\android
   ```
4. Klik **OK**. Android Studio akan membuka proyek dan menyinkronkan Gradle secara otomatis.
5. Hubungkan smartphone Android Anda via kabel USB (aktifkan USB Debugging) atau gunakan Android Emulator (AVD).
6. Klik tombol hijau **Run (▶)** di toolbar Android Studio.
7. Aplikasi **Zombie Survival 2D** akan terkompilasi, terpasang di HP Anda, dan berjalan dalam mode Fullscreen Landscape!

### Sinkronisasi Perubahan Kode
Jika Anda mengubah file HTML, CSS, atau JavaScript game di folder utama, Anda cukup menjalankan skrip:
```powershell
powershell -ExecutionPolicy Bypass -File .\sync_assets.ps1
```
Skrip ini akan menyalin file web terbaru ke dalam direktori aset Android Studio (`android/app/src/main/assets/game/`).

---

## 📁 Struktur Direktori

```
zombie_survival_2d/
├── index.html                 # Halaman utama game
├── style.css                  # Desain visual, UI HUD, dan touch controls
├── js/
│   ├── main.js                # Game engine, input handler, dan wave loop
│   ├── audio.js               # Web Audio API procedural sound synthesizer & haptic vibration
│   ├── entities.js            # Player, Zombie (Walker, Runner, Spitter, Tank, Boss), Drone & Loot
│   ├── weapon.js              # Sistem senjata, peluru, dan granat
│   ├── map.js                 # Arena apokaliptik, rintangan, tong peledak & senter malam
│   ├── upgrades.js            # Sistem perk kartu level-up rogue-lite
│   └── particles.js           # Mesin partikel darah, selongsong peluru & ledakan
├── assets/                    # Ikon dan banner resmi game
│   ├── icon.png               # Ikon game resolusi tinggi
│   ├── banner.jpg             # Artwork banner apokaliptik
│   └── manifest.json          # PWA Mobile Web Manifest
├── start_game.ps1             # 1-klik runner server lokal untuk Antigravity IDE
├── sync_assets.ps1            # Skrip sinkronisasi aset ke Android Studio
├── README.md                  # Panduan lengkap
└── android/                   # PROYEK LENGKAP ANDROID STUDIO
    ├── build.gradle           # Root Gradle build script
    ├── settings.gradle        # Gradle project settings
    ├── gradle.properties      # Konfigurasi JVM & AndroidX
    ├── gradlew.bat            # Gradle wrapper executable
    └── app/
        ├── build.gradle       # App module build script (compileSdk 34)
        └── src/main/
            ├── AndroidManifest.xml   # Manifest fullscreen landscape & permissions
            ├── java/com/antigravity/zombiesurvival/
            │   └── MainActivity.kt   # Native WebView terakselerasi hardware
            ├── assets/game/          # Bundled offline game files
            └── res/                  # Ikon, tema fullscreen, dan string resource
```
