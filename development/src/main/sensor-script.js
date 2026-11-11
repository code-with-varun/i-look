const fs = require('fs');
const path = require('path');

let scriptContent = '';
const nativePath = path.join(__dirname, '../native/sensor.ps1');
if (fs.existsSync(nativePath)) {
  try {
    scriptContent = fs.readFileSync(nativePath, 'utf8');
  } catch (e) {}
}

if (!scriptContent) {
  scriptContent = String.raw`Add-Type @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class BulletproofSensor {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll", SetLastError = true)] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll", SetLastError = true)] public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll", SetLastError = true)] public static extern bool CloseDesktop(IntPtr hDesktop);

    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO {
        public uint cbSize;
        public uint dwTime;
    }

    private static IntPtr _lastHwnd = IntPtr.Zero;
    private static string _lastProc = "";
    private static string _lastTitle = "";
    private static uint _lastPid = 0;

    public static string[] GetSnapshot() {
        IntPtr hwnd = GetForegroundWindow();
        string title = "";
        string procName = "";
        uint targetPid = 0;
        double idle = 0.0;

        LASTINPUTINFO lii = new LASTINPUTINFO();
        lii.cbSize = (uint)Marshal.SizeOf(lii);
        if (GetLastInputInfo(ref lii)) {
            uint tickCount = (uint)Environment.TickCount;
            uint diff = tickCount >= lii.dwTime ? (tickCount - lii.dwTime) : ((uint.MaxValue - lii.dwTime) + tickCount);
            idle = diff / 1000.0;
        }

        if (hwnd == IntPtr.Zero) {
            Thread t = new Thread(() => {
                IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
                if (hDesk != IntPtr.Zero) {
                    SetThreadDesktop(hDesk);
                }
                IntPtr fg = GetForegroundWindow();
                if (fg != IntPtr.Zero) {
                    hwnd = fg;
                    StringBuilder sb = new StringBuilder(1024);
                    GetWindowText(hwnd, sb, 1024);
                    title = sb.ToString().Trim();
                    GetWindowThreadProcessId(hwnd, out targetPid);
                }
                if (hDesk != IntPtr.Zero) {
                    CloseDesktop(hDesk);
                }
            });
            t.SetApartmentState(ApartmentState.STA);
            t.Start();
            t.Join();
        }

        if (hwnd != IntPtr.Zero && string.IsNullOrEmpty(title)) {
            StringBuilder sb = new StringBuilder(1024);
            GetWindowText(hwnd, sb, 1024);
            title = sb.ToString().Trim();
        }

        if (hwnd != IntPtr.Zero && targetPid == 0) {
            GetWindowThreadProcessId(hwnd, out targetPid);
        }

        if (targetPid != 0 && string.IsNullOrEmpty(procName)) {
            try {
                procName = Process.GetProcessById((int)targetPid).ProcessName;
            } catch {
                try {
                    procName = Process.GetProcessById((int)targetPid).MainModule.ModuleName;
                    if (procName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) {
                        procName = procName.Substring(0, procName.Length - 4);
                    }
                } catch {}
            }
        }

        if (!string.IsNullOrEmpty(procName)) {
            _lastHwnd = hwnd;
            _lastProc = procName;
            _lastTitle = title;
            _lastPid = targetPid;
        } else if (!string.IsNullOrEmpty(_lastProc) && idle < 30.0) {
            hwnd = _lastHwnd;
            procName = _lastProc;
            title = _lastTitle;
            targetPid = _lastPid;
        } else {
            procName = "Explorer";
            title = "Desktop";
        }

        return new string[] {
            hwnd.ToInt64().ToString(),
            targetPid.ToString(),
            procName,
            title,
            idle.ToString("F1", System.Globalization.CultureInfo.InvariantCulture)
        };
    }
}
'@

function Extract-Domain {
    param([string]$title, [string]$proc)
    if (-not $title) { return "" }
    if ($title -match '(?i)YouTube') { return "youtube.com" }
    if ($title -match '(?i)GitHub') { return "github.com" }
    if ($title -match '(?i)Google Docs') { return "docs.google.com" }
    if ($title -match '(?i)Google Sheets') { return "sheets.google.com" }
    if ($title -match '(?i)ProHance') { return "prohance.io" }
    if ($title -match '(?i)StayFree') { return "stayfreeapps.com" }
    if ($title -match '(?i)ChatGPT') { return "chatgpt.com" }
    if ($title -match '(?i)Stack Overflow') { return "stackoverflow.com" }
    if ($title -match '(?i)WhatsApp') { return "whatsapp.com" }
    if ($title -match '(?i)Gmail') { return "mail.google.com" }
    if ($title -match '([a-zA-Z0-9-]+\.(com|org|net|io|in|app|dev|co|ai))') {
        return $matches[1].ToLowerInvariant()
    }
    return ""
}

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try { [Console]::Out.AutoFlush = $true } catch {}
[Console]::WriteLine('{"event":"ready"}')
try { [Console]::Out.Flush() } catch {}

while ($true) {
    try {
        $snap = [BulletproofSensor]::GetSnapshot()
        $proc = $snap[2]
        $title = $snap[3]
        $domain = Extract-Domain -title $title -proc $proc

        $obj = [PSCustomObject]@{
            timestamp   = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
            hwnd        = [int64]$snap[0]
            pid         = [int]$snap[1]
            process     = $proc
            title       = $title
            url         = ""
            domain      = $domain
            idleSeconds = [double]$snap[4]
        }
        $json = $obj | ConvertTo-Json -Compress
        [Console]::WriteLine($json)
        try { [Console]::Out.Flush() } catch {}
    } catch {
        # ignore error
    }
    Start-Sleep -Milliseconds 1000
}
`;
}

module.exports = scriptContent;
