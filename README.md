# Mortal Company Save Visualizer & Telemetry Suite (Cloudflare Pages & Worker)

A specialized 3D space architecture visualizer, scrap coordinator, and binary save editor for **Mortal Company Mobile (v0.2.3)**.

## Project Structure

```
mortal-company-cf/
├── _worker.js                 # Cloudflare Pages Functions / Advanced Worker (API & Security Headers)
├── wrangler.toml              # Cloudflare Pages / Worker configuration
├── package.json               # NPM scripts for local dev and deployment
├── README.md                  # Documentation and quick start
└── public/                    # Static Web Assets (Cloudflare Pages root)
    ├── index.html             # Dashboard with Overview, Tutorial, Quick Actions, File Uploader
    ├── editor.html            # 3D Ship Architecture Visualizer & Save Editor (Fixed Structure)
    ├── css/
    │   └── app.css            # Craft styling & responsive HUD theme
    ├── js/
    │   ├── nrbf-parser.js     # Pure client-side [MS-NRBF] .NET Binary Remoting parser & serializer
    │   ├── ship-renderer.js   # 2D/3D Canvas Renderer with accurate ship blueprint & texture overlay
    │   └── default-save.js    # Built-in sample save data (74 items with 50x candy stack)
    └── assets/
        ├── ship_transparent.png  # Alpha-transparent 3D model render
        └── ship_topdown.png      # Original 3D reference
```

## Features

1. **Autentik 1:1 Geometri Kapal 3D (Sketchfab Aligned):**
   - **Cockpit / Pilot Helm ($Z = 33.3\text{--}34.4\text{ m}$)**
   - **Main Cargo Floor ($Z = 29.8\text{--}33.3\text{ m}, Y = 22.38\text{ m}$)**
   - **Storage Racks (Indoor):** Rak metal penyimpanan berada **di dalam kapal** ($X \in [30.9, 32.0], Z \in [30.2, 30.7]$) tepat di mana barang scrap bertingkat diletakkan.
   - **Grated Catwalk & Yellow Safety Railing ($Y = 21.17\text{ m}$):** Jembatan besi luar dengan pagar pengaman kuning, tempat titik spawn tumpukan 50x permen cadangan ($X = 31.68, Z = 27.92$).
   - **Hydraulic Blast Door ($Z = 29.8\text{ m}$):** Pintu geser kedap udara pemisah antara kabin dalam dan catwalk luar.

2. **Dashboard & Tutorial Save Android Lengkap:**
   - Metode 1: ZArchiver + Shizuku (Rekomendasi - Tanpa PC & Tanpa Root untuk Android 11, 12, 13, 14, 15).
   - Metode 2: Kabel USB + PC / Laptop via ADB & File Explorer.
   - Metode 3: Prosedur Restore / Inject save hasil editan kembali ke HP.

3. **Pure Client-Side Zero-Server Privacy:**
   - Semua operasi pembacaan dan pembuatan binary file `[MS-NRBF]` berlangsung 100% di browser pengguna. Data save tidak dikirim ke server luar.

## Cara Menjalankan Secara Lokal

```bash
# Menggunakan Wrangler (Cloudflare CLI)
npx wrangler pages dev public

# Atau menggunakan server statis sederhana
python -m http.server 8090 --directory "public"
```

## Cara Deploy ke Cloudflare Pages

```bash
# Login ke Cloudflare
npx wrangler login

# Deploy ke Cloudflare Pages
npx wrangler pages deploy public --project-name mortal-company-visualizer
```
