# Mortal Company Save Editor & Cockpit Staging Suite (Cloudflare Pages & Worker)

A clean, client-side binary save editor, scrap coordinator, and cockpit item duplicator for **Mortal Company Mobile (v0.2.3)**.

## Project Structure

```
mortal-company-cf/
├── _worker.js                 # Cloudflare Pages Advanced Worker router (root fallback)
├── wrangler.toml              # Cloudflare Pages / Worker configuration
├── package.json               # NPM scripts for local dev and deployment
├── README.md                  # Documentation and quick start
└── public/                    # Static Web Assets (Cloudflare Pages build output)
    ├── _worker.js             # Edge Worker with Security Headers & Save Validation API
    ├── _headers               # Native Cloudflare Pages Edge Security & Cache-Control rules
    ├── index.html             # Main Dashboard, Cockpit Anchor Duplicator & Android Guide
    ├── editor.html            # Redirect wrapper to main editor
    ├── css/
    │   └── app.css            # Clean Light Mode styling & accessible typography
    ├── js/
    │   ├── nrbf-parser.js     # Pure client-side [MS-NRBF] .NET Binary Remoting parser & serializer
    │   └── default-save.js    # Built-in synthetic demo dataset (32 cargo items)
    └── assets/
        ├── ship_transparent.png  # Spacecraft layout render
        └── ship_topdown.png      # Reference blueprint
```

## Core Features

1. **Cockpit Anchor Item Duplication System:**
   - Duplicates items directly to the cockpit anchor reference position ($X = 31.40, Y = 22.38, Z = 33.80$).
   - One-click stack multipliers (`+10x`, `+50x Safe Stack`, `+100x Bulk Stack`).
   - Quick-select filters for high-value items (Candy, Jetpack, Apparatus, Pro Torch, Stop Sign).

2. **Core Game Parameter Customization:**
   - **Store Credits (Shop Money):** Add $+500$, $+1,000$, or set Max $9,999$ terminal balance.
   - **Profit Quota & Deadline:** Edit collected quota, target quota, and remaining days.
   - **Ship Upgrades:** Toggle Standard Teleporter and Inverse Teleporter directly in save metadata.

3. **Complete Cargo Inventory Manifest:**
   - Real-time scrap valuation calculation.
   - Searchable, filterable table with category classification and individual item controls.

4. **Android Extraction & Restore Guide:**
   - Method 1: ZArchiver + Shizuku (No PC / No Root required for Android 11+).
   - Method 2: USB Cable + PC / Laptop via ADB.
   - Method 3: In-game save restore / overwrite procedure.

5. **100% Client-Side Privacy (Zero Server Storage):**
   - Save file parsing and binary generation run purely in the user's browser. No save files are uploaded or stored on any server.

## Local Development

```bash
# Using Cloudflare Wrangler
npx wrangler pages dev public

# Or using Python's static HTTP server
python -m http.server 8092 --directory "public"
```

## Cloudflare Pages Deployment

```bash
# Authenticate with Cloudflare
npx wrangler login

# Deploy static assets and edge worker to Cloudflare Pages
npx wrangler pages deploy public --project-name mortal-company-visualizer
```
