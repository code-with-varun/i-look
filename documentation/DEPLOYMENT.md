# Live Web Server Deployment Guide

**Product:** i-Look Screen Time & App Usage Tracker  
**Developer:** Runit Infotech ([https://runito.in](https://runito.in))  
**Registration:** REG-ILK-2026-WIN  

This `documentation/` folder is a **100% self-contained web package** ready to be uploaded directly to any live web hosting service or web server.

---

## 📦 What's Inside This Folder

- `index.html`: Complete modern StayFree light-themed product landing page.
- `assets/`:
  - `icon.ico` (Website favicon)
  - `icon.png` (High-resolution app badge / Apple touch icon)
  - `tray.png` (System tray icon asset)
- `downloads/`:
  - `i-Look-Tracker-Setup-1.0.0.exe` (~83 MB Windows Setup Installer)
  - `i-Look-Tracker-Portable-v1.0.0.zip` (~116 MB Portable ZIP Edition)
- `LICENSE.txt`: Commercial / MIT EULA for Runit Infotech.

---

## 🚀 How to Deploy to Your Live Server

### Option A: Subfolder on Existing Website (e.g., `https://runito.in/i-look/`)
1. Upload the entire `documentation` folder to your server's `public_html/` or web root.
2. Rename the folder on the server to `i-look` (or your preferred URL path).
3. The page will immediately be live at `https://runito.in/i-look/`.

### Option B: Dedicated Subdomain or Domain (e.g., `https://ilook.runito.in`)
1. Upload the contents of `documentation/` directly into the document root for the domain/subdomain.
2. The page will be live at `https://ilook.runito.in/`.

### Option C: Nginx / Apache Configuration
Ensure your web server allows downloading `.exe` and `.zip` files:
```nginx
location /i-look/ {
    alias /var/www/html/i-look/;
    index index.html;
    try_files $uri $uri/ =404;
}
```

No external databases or Node.js runtime are required for the web server; it runs on standard static HTTP hosting.

