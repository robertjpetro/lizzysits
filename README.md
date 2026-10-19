# Lizzy Sits Babysitting Booking App 🧸📌

A warm, retro corkboard babysitting booking and availability web application for Elizabeth Petro in Rolesville, NC.

## Features
- **Public Corkboard (`/index.html`):**
  - Interactive clipboard calendar with real-time green availability badges.
  - One-click slot booking modal with instant text & email notification alerts.
  - "Lizzy On Duty!" polaroids with full photo preview modal.
  - Real parent testimonials pinned on sticky notes.
  - Rates, CPR certification, and background details on a lined index card.
- **Elizabeth's Manager Portal (`/manage/`):**
  - PIN-protected dashboard for Elizabeth.
  - Add, edit, or delete availability slots directly synced to Google Sheets via Sheety.
  - One-tap Accept / Decline for pending booking requests with custom message options.
- **Backend & Notifications:**
  - **Sheety API:** Syncs calendar slots to a Google Sheet tab (`booking`).
  - **Google Apps Script:** Dispatches instant automated emails and Spectrum Mobile SMS text messages on new requests and booking decisions.

## Project Structure
```
lizzysits/
├── index.html               # Public booking corkboard
├── config.js                # Central configuration (Sheety URL, PIN, notification webhook)
├── google-apps-script.js    # Apps Script backend for Google Sheets
├── README.md
├── .gitignore
├── manage/
│   └── index.html           # Private manager dashboard
└── img/
    └── lizzysits/
        ├── lizzylogosewn.png # Embroidered patch logo
        ├── e-top.png        # Elizabeth avatar
        ├── 1.jpeg           # Storytime photo
        ├── 2.jpeg           # Playground photo
        └── 3.jpeg           # Dress-up photo
```

## Local Development
To run locally, start any simple HTTP server in this directory:
```bash
# Python 3
python3 -m http.server 8766
```
Then open:
- Public Corkboard: [http://localhost:8766](http://localhost:8766)
- Manage Dashboard: [http://localhost:8766/manage](http://localhost:8766/manage)

## Deploying to GitHub Pages & Custom Domain
1. Push this repository to GitHub (`robertjpetro/lizzysits`).
2. Go to **Settings > Pages** in your GitHub repository.
3. Under **Build and deployment**, select **Deploy from a branch**, set branch to `main`, and folder to `/ (root)`.
4. Under **Custom domain**, enter your domain (e.g. `lizzysits.com`).
5. In your DNS provider (Namecheap, Google Domains / Squarespace, Cloudflare, GoDaddy, etc.), set:
   - **4 Apex A records** pointing to GitHub Pages IPs:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - **1 CNAME record** for host `www` pointing to `robertjpetro.github.io`
6. Check **Enforce HTTPS** in GitHub Pages settings.
