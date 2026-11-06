# i-Look Tracker - Product Requirements & Specification

**Organization:** Runit Infotech  
**Product:** i-Look Screen Time & Application Usage Tracker  
**Developer:** Runit Infotech  
**Registration:** REG-ILK-2026-WIN  
**Target Operating System:** Microsoft Windows 10 / 11 (64-bit)  
**Current Edition:** 1.0.0 Modern Desktop Edition  
**Website:** [https://runito.in](https://runito.in)  
**Support Email:** [runitinfotech@gmail.com](mailto:runitinfotech@gmail.com)  

---

## 1. Executive Summary & Problem Statement
Commercial screen time and employee monitoring solutions (such as ProHance) are expensive, cloud-dependent, and enterprise-locked. Conversely, consumer digital wellness applications (such as StayFree for Android and Windows) only report aggregate daily durations per application rather than discrete activity sessions with individual timestamps.

**Core Mandate:**
The fundamental requirement of **i-Look Tracker** is that **every single application and website usage session MUST record an exact Start Time, End Time, and computed Duration**. This enables high-fidelity audit trails, client timesheet billing, productivity analytics, and work-life balance monitoring without manual timers or intrusive cloud tracking.

---

## 2. Core Functional Requirements

### 2.1 Automated Background Tracking (Zero Manual Overhead)
- **Active Window Polling:** Polls active foreground Windows application (`GetForegroundWindow`, `GetWindowTextW`, `GetWindowThreadProcessId`, `QueryFullProcessImageNameW`) using Win32 API hooks every 1000ms.
- **Browser Tab URL Detection:** Inspects active browser windows (Google Chrome, Microsoft Edge, Brave, Opera) to extract exact URL domains (e.g., `github.com`, `stackoverflow.com`, `youtube.com`) alongside tab titles.
- **State Transition Engine:** A new session record is committed whenever:
  1. The user switches to a different application or process.
  2. The window title / document name changes within the same application.
  3. The user goes idle (no mouse/keyboard input for `idleThresholdSeconds`).
  4. The system locks or shuts down.

### 2.2 Mandatory Session Record Schema
Every recorded session contains the following exact data fields:
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Unique session identifier (`sess_<timestamp>_<random>`) |
| `date` | String | Date of the session formatted as `DD-MM-YYYY` |
| `toolName` | String | Friendly application or website name (e.g. `Visual Studio Code`, `GitHub`, `Excel`) |
| `process` | String | Executable process name (e.g. `code`, `chrome`, `excel`) |
| `windowTitle` | String | Full active window title text |
| `url` | String | Extracted web URL or domain (for supported browsers) |
| `category` | String | Functional category (e.g. `Business Tools`, `Communication Tools`, `Internet Browsing`) |
| `impact` | String | Productivity classification: `Productive`, `No Impact`, `Non Productive`, `Not Rated` |
| `activityType` | String | `TOS` (Time on System), `TAFS` (Time Away from System), or `IDLE` |
| `startTime` | String | Exact timestamp when session started (`DD-MM-YYYY HH:mm:ss`) |
| `endTime` | String | Exact timestamp when session ended (`DD-MM-YYYY HH:mm:ss`) |
| `durationSeconds`| Number | Total duration in raw seconds |
| `durationFormatted` | String | Human-readable duration in `HH:MM:SS` |
| `rating` | Number | Numeric productivity score weighting |

### 2.3 Date Range Analytics & Slice Engine
- Interactive StayFree-style date range selector popover.
- Quick presets: `Today`, `Yesterday`, `Last 7 days`, `Last 30 days`, `This month`.
- Custom start and end date calendar picker.
- Live slicing of all metrics cards (Total Screen Time, Active Sessions, Daily Average, Longest Streak).
- Dynamic Chart.js 7-day / multi-day trend graphs with daily/hourly toggle and bar/line views.
- Top applications and category breakdown pie/donut charts.

### 2.4 System Tray & Background Stealth
- **Minimize to Tray:** Closing the main window (`X`) minimizes the application to the Windows notification tray rather than terminating the process.
- **Tray Status Menu:** Displays live active tool name, current running session duration, quick pause/resume controls, 1-click CSV export, and clean Quit.
- **Run on Windows Startup:** Configured via Electron `app.setLoginItemSettings` to automatically boot silently in background with `--hidden` flag on Windows user logon.

### 2.5 Data Privacy & Storage
- 100% offline local storage in JSONL and JSON format under user profile (`%APPDATA%\i-look\`).
- Zero cloud transmission, zero telemetry, zero subscription fees.
- 1-click CSV/Excel export with organizational metadata headers (Runit Infotech).

---

## 3. Product Deliverables Layout
The project directory is structured into:
1. `planning/` - Requirements, specifications, original prompts, and ProHance benchmark presentation.
2. `development/` - Complete Node.js / Electron source code, dependencies, build scripts, and tests.
3. `release/` - Ready-to-use binaries:
   - `i-Look-Tracker-Setup-1.0.0.exe` (Windows NSIS Setup Installer with desktop shortcut and auto-start)
   - `i-Look-Tracker-Portable-v1.0.0.zip` (Portable standalone edition - run without installation)
4. `documentation/` - Self-contained HTML product landing page ready for live web deployment with direct download buttons.

