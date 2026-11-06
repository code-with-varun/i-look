# i-Look Screen Time & App Usage Tracker

> **Engineered by Runit Infotech**  
> *Puducherry, Tamil Nadu, India - 605005* | [https://runito.in](https://runito.in) | [runitinfotech@gmail.com](mailto:runitinfotech@gmail.com)

**i-Look** is a precision Windows screen time, application, and web usage tracker with **mandatory exact Start Time and End Time session recording**, modern **StayFree-inspired analytics**, zero cloud overhead, and automated system tray background monitoring.

---

## 🗂️ Clean Workspace Layout

The repository is organized into four dedicated directories:

```
C:\VARUN VK\Antigravity\i-look\
│
├── 📁 planning/               # All requirements, architecture, prompt, and ProHance reference
│   ├── REQUIREMENTS.md        # Comprehensive functional & technical specifications
│   ├── i-look application prompt.txt # Original project requirements prompt
│   └── prohance dashboard.pptx       # ProHance presentation reference deck
│
├── 📁 development/            # Node.js / Electron source code, dependencies & build scripts
│   ├── src/                   # Main process, renderer UI, native Win32 scripts & assets
│   ├── scripts/               # Start and packaging helper scripts
│   ├── node_modules/          # Installed dependencies (Electron, Chart.js)
│   ├── package.json           # Development scripts & metadata (Runit Infotech)
│   ├── package-lock.json      # Dependency lockfile
│   └── LICENSE                # Runit Infotech Commercial / MIT EULA
│
├── 📁 release/                # Ready-to-use production binaries & installers
│   ├── i-Look-Tracker-Setup-1.0.0.exe      # Windows Setup Installer (NSIS)
│   ├── i-Look-Tracker-Portable-v1.0.0.zip  # Zero-install standalone portable edition
│   └── win-unpacked/                      # Unpacked binaries
│
├── 📁 documentation/          # Web deployment documentation & product landing page
│   └── index.html             # High-converting product landing page with download buttons
│
├── LICENSE                    # Software License Agreement
├── package.json               # Root workspace delegation scripts
└── README.md                  # Project overview & quick reference
```

---

## 🌟 Why i-Look?

| Feature | **i-Look Tracker (Runit Infotech)** | StayFree (Desktop) | ProHance Enterprise |
| :--- | :--- | :--- | :--- |
| **Exact Start & End Session Timestamps** | ✅ **Mandatory for every session** | ❌ Aggregate daily sum only | ✅ Yes |
| **Computed Duration in HH:MM:SS** | ✅ Exact down to the second | ⚠️ Minutes/hours only | ✅ Yes |
| **Cost & Licensing** | ✅ **Free / Commercial Perpetual** | Freemium with limits | ❌ Expensive recurring SaaS |
| **Offline Privacy Guarantee** | ✅ **100% Local (%APPDATA%)** | Cloud account sync | ❌ Intrusive cloud surveillance |
| **Modern Dark StayFree UI** | ✅ **Cards, Donut Charts & Glassmorphism**| ✅ Yes | ❌ Legacy 2010s corporate UI |
| **Interactive Date Range Slicer** | ✅ **Today, Yesterday, 7d, 30d, Custom** | Basic Date Picker | Admin reports only |
| **Run on Windows Startup** | ✅ **Configurable (--hidden boot)** | ✅ Yes | ❌ Requires IT service |
| **Minimize to System Tray** | ✅ **Silent background tracking** | ✅ Yes | Hidden service only |
| **Portable Zero-Install Version** | ✅ **ZIP archive included** | ❌ No | ❌ No |
| **1-Click Audit CSV Export** | ✅ **With company metadata headers** | Limited | Complex export |

---

## ⚡ Core Capabilities

1. **Mandatory Start & End Session Timestamps:**  
   Every single application switch or website visit records an exact `Start Time` (`DD-MM-YYYY HH:mm:ss`), `End Time` (`DD-MM-YYYY HH:mm:ss`), and `Duration (HH:MM:SS)`.
2. **Win32 Sensor Engine:**  
   Uses native Windows hooks (`GetForegroundWindow`, process inspection, and browser UI automation) to detect active windows and browser domains without noticeable CPU/RAM usage.
3. **StayFree-Inspired Interactive UI:**  
   Multi-day usage trend chart (Daily/Hourly toggle, Line/Bar toggle), companion stats cards (Total Screen Time, Active Sessions, Average Daily Usage, Computer On Time), App usage donut chart, and category distribution.
4. **System Tray Integration:**  
   Closing the app minimizes to the Windows notification area tray. Right-clicking or hovering reveals live active tool status, current session duration, pause/resume, and 1-click CSV export.
5. **Run on Windows Startup:**  
   Optionally launches with Windows login in `--hidden` mode without popping up over your work.
6. **Detailed Sessions Table:**  
   Full audit trail with columns: `ID`, `Date`, `Tool Name`, `Process`, `Window Title`, `URL / Domain`, `Category`, `Impact`, `Activity Type`, `Start Time`, `End Time`, `Duration (Seconds)`, `Duration (HH:MM:SS)`, and `Rating`.

---

## 🚀 Quick Start

### Option 1: Run the Setup Installer
Run [i-Look-Tracker-Setup-1.0.0.exe](file:///c:/VARUN%20VK/Antigravity/i-look/release/i-Look-Tracker-Setup-1.0.0.exe) located in `release/`. Follow the wizard to install shortcuts and configure auto-start.

### Option 2: Run the Portable Edition (No Installation Required)
Extract [i-Look-Tracker-Portable-v1.0.0.zip](file:///c:/VARUN%20VK/Antigravity/i-look/release/i-Look-Tracker-Portable-v1.0.0.zip) located in `release/` into any directory or USB drive and run `i-Look Tracker.exe`.

### Option 3: Run from Source (Development)
```powershell
cd "c:\VARUN VK\Antigravity\i-look\development"
npm start
```
Or from the project root:
```powershell
npm start
```

### Option 4: View the Product Landing Page
Open [documentation/index.html](file:///c:/VARUN%20VK/Antigravity/i-look/documentation/index.html) in any browser. It contains download links to the installer and portable archive, feature breakdowns, and company information ready for deployment to a live web server.

---

## 🏢 Corporate & License Information

- **Company:** Runit Infotech
- **Brand:** I-Look Screentime Tracker
- **Division:** Productivity & Desktop Systems
- **Registration:** REG-ILK-2026-WIN
- **Headquarters:** Puducherry, Tamil Nadu, India - 605005
- **Website:** [https://runito.in](https://runito.in)
- **Email:** [runitinfotech@gmail.com](mailto:runitinfotech@gmail.com)
- **Developer:** Runit Infotech
- **Registration:** REG-ILK-2026-WIN
- **License:** MIT / Commercial End-User License Agreement (see [LICENSE](file:///c:/VARUN%20VK/Antigravity/i-look/LICENSE))
