const fs = require('fs');
const path = require('path');

class Database {
  constructor(dataDir) {
    this.dataDir = dataDir;
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.sessionsFile = path.join(this.dataDir, 'sessions.jsonl');
    this.rulesFile = path.join(this.dataDir, 'rules.json');
    this.settingsFile = path.join(this.dataDir, 'settings.json');

    this.sessions = [];
    this.rules = [];
    this.settings = {
      userName: 'VARUNAKSHAY S',
      userEmail: 'varunakshay@outlook.com',
      companyName: 'Runit Infotech',
      department: 'Engineering & Development',
      designation: 'Lead Software Architect',
      employeeId: 'ILK-2026-01',
      dailyTargetHours: 8.0,
      idleThresholdSeconds: 180, // 3 minutes
      theme: 'dark', // StayFree modern dark by default
      minimizeToTray: true,
      launchOnStartup: true
    };

    this.init();
  }

  init() {
    this.loadSettings();
    this.loadRules();
    this.loadSessions();
  }

  loadSettings() {
    if (fs.existsSync(this.settingsFile)) {
      try {
        const raw = fs.readFileSync(this.settingsFile, 'utf8');
        this.settings = Object.assign(this.settings, JSON.parse(raw));
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    } else {
      this.saveSettings(this.settings);
    }
  }

  saveSettings(newSettings) {
    this.settings = Object.assign(this.settings, newSettings);
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving settings:', err);
    }
    return this.settings;
  }

  loadRules() {
    if (fs.existsSync(this.rulesFile)) {
      try {
        const raw = fs.readFileSync(this.rulesFile, 'utf8');
        this.rules = JSON.parse(raw);
      } catch (err) {
        console.error('Error loading rules:', err);
        this.rules = [];
      }
    } else {
      this.rules = [];
      fs.writeFileSync(this.rulesFile, JSON.stringify(this.rules, null, 2), 'utf8');
    }
  }

  saveRules(rules) {
    this.rules = rules;
    fs.writeFileSync(this.rulesFile, JSON.stringify(this.rules, null, 2), 'utf8');
    return this.rules;
  }

  loadSessions() {
    this.sessions = [];
    if (fs.existsSync(this.sessionsFile)) {
      try {
        const lines = fs.readFileSync(this.sessionsFile, 'utf8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              this.sessions.push(JSON.parse(trimmed));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error('Error reading sessions log:', err);
      }
    }
  }

  upsertActiveSession(session) {
    if (!session || !session.id) return;
    const idx = this.sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      this.sessions[idx] = Object.assign({}, session);
    } else {
      this.sessions.push(Object.assign({}, session));
    }
  }

  finalizeActiveSession(session) {
    this.upsertActiveSession(session);
    try {
      fs.appendFileSync(this.sessionsFile, JSON.stringify(session) + '\n', 'utf8');
    } catch (err) {
      console.error('Error writing session:', err);
    }
  }

  recordSession(session) {
    if (!session.start_time || !session.end_time) {
      const now = new Date();
      session.end_time = session.end_time || this.formatDate(now);
      session.start_time = session.start_time || this.formatDate(now);
    }

    if (!session.duration_seconds && session.start_epoch && session.end_epoch) {
      session.duration_seconds = Math.max(1, Math.round((session.end_epoch - session.start_epoch) / 1000));
    }
    session.duration_formatted = this.formatDuration(session.duration_seconds || 0);
    session.date = session.date || session.start_time.split(' ')[0];
    session.id = session.id || 'sess_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    this.finalizeActiveSession(session);
    return session;
  }

  /**
   * Filter sessions by single date or date range [startDate, endDate]
   */
  getSessions({ date, startDate, endDate, category, tool, search, limit = 1000, offset = 0, type }) {
    let start = startDate || date || this.getTodayDate();
    let end = endDate || date || start;

    let list = this.sessions.filter(s => s.date && s.date >= start && s.date <= end);

    if (tool) {
      list = list.filter(s => s.tool_name && s.tool_name.toLowerCase().includes(tool.toLowerCase()));
    }
    if (category) {
      list = list.filter(s => s.category === category);
    }
    if (type) {
      list = list.filter(s => s.activity_type === type);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => 
        (s.tool_name && s.tool_name.toLowerCase().includes(q)) ||
        (s.process_name && s.process_name.toLowerCase().includes(q)) ||
        (s.window_title && s.window_title.toLowerCase().includes(q)) ||
        (s.url && s.url.toLowerCase().includes(q)) ||
        (s.domain && s.domain.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q))
      );
    }

    const totalCount = list.length;
    // Sort latest first
    const sorted = [...list].sort((a, b) => (b.start_epoch || 0) - (a.start_epoch || 0));
    const paginated = sorted.slice(offset, offset + limit);

    return {
      total: totalCount,
      sessions: paginated
    };
  }

  updateSessionCategory(id, { category, impact, rating }) {
    const session = this.sessions.find(s => s.id === id);
    if (session) {
      if (category) session.category = category;
      if (impact) session.impact = impact;
      if (rating !== undefined) session.rating = rating;
      this.rewriteSessions();
      return session;
    }
    return null;
  }

  rewriteSessions() {
    try {
      const content = this.sessions.map(s => JSON.stringify(s)).join('\n') + '\n';
      fs.writeFileSync(this.sessionsFile, content, 'utf8');
    } catch (err) {
      console.error('Error rewriting sessions file:', err);
    }
  }

  /**
   * Generates StayFree-style modern App Usage analytics for a single date or date range
   */
  getDashboardMetrics(param) {
    let startDate = this.getTodayDate();
    let endDate = this.getTodayDate();

    if (typeof param === 'string') {
      startDate = param;
      endDate = param;
    } else if (param && typeof param === 'object') {
      startDate = param.startDate || this.getTodayDate();
      endDate = param.endDate || startDate;
    }

    const isRange = startDate !== endDate;
    const rangeSessions = this.sessions.filter(s => s.date && s.date >= startDate && s.date <= endDate);

    let totalDuration = 0;
    let tosDuration = 0;
    let idleDuration = 0;
    let productiveDuration = 0;

    const categoryTotals = {};
    const toolMap = {};

    let firstStart = null;
    let lastEnd = null;

    for (const s of rangeSessions) {
      const dur = s.duration_seconds || 0;
      totalDuration += dur;

      if (!firstStart || (s.start_time && s.start_time < firstStart)) {
        firstStart = s.start_time;
      }
      if (!lastEnd || (s.end_time && s.end_time > lastEnd)) {
        lastEnd = s.end_time;
      }

      if (s.activity_type === 'TOS') {
        tosDuration += dur;
        const toolKey = s.tool_name || s.process_name || 'System';
        if (!toolMap[toolKey]) {
          toolMap[toolKey] = {
            tool: toolKey,
            process: s.process_name,
            duration: 0,
            switches: 0,
            category: s.category || 'System Tools'
          };
        }
        toolMap[toolKey].duration += dur;
        toolMap[toolKey].switches += 1;
      } else if (s.activity_type === 'IDLE') {
        idleDuration += dur;
      }

      const impact = s.impact || 'Productive';
      if (impact === 'Productive') {
        productiveDuration += dur;
      }

      // Aggregate Category totals
      const cat = s.category || (s.activity_type === 'IDLE' ? 'Idle Time' : 'System Tools');
      categoryTotals[cat] = (categoryTotals[cat] || 0) + dur;
    }

    // Build timeline distribution:
    // If multi-day range -> Daily breakdown (Sun, Mon, Tue...)
    // If single day -> 24 Hourly breakdown (00:00 to 23:00)
    let dailyDistribution = [];
    let hourlyDistribution = [];

    if (isRange) {
      const startParts = startDate.split('-').map(Number);
      const endParts = endDate.split('-').map(Number);
      const startD = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      const endD = new Date(endParts[0], endParts[1] - 1, endParts[2]);

      const dayMap = {};
      let curr = new Date(startD);

      while (curr <= endD) {
        const ymd = this.formatDateYMD(curr);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayName = dayNames[curr.getDay()];
        const monthName = monthNames[curr.getMonth()];
        const entry = {
          date: ymd,
          dayName,
          label: `${dayName}, ${monthName} ${curr.getDate()}`,
          shortLabel: dayName,
          screenTimeSeconds: 0,
          screenTimeFormatted: '0h 00m',
          screenTimeHours: 0,
          sessionCount: 0
        };
        dailyDistribution.push(entry);
        dayMap[ymd] = entry;
        curr.setDate(curr.getDate() + 1);
      }

      for (const s of rangeSessions) {
        if (s.date && dayMap[s.date]) {
          const dur = s.duration_seconds || 0;
          dayMap[s.date].sessionCount += 1;
          if (s.activity_type === 'TOS') {
            dayMap[s.date].screenTimeSeconds += dur;
          }
        }
      }

      dailyDistribution.forEach(d => {
        d.screenTimeHours = +(d.screenTimeSeconds / 3600).toFixed(2);
        d.screenTimeFormatted = this.formatDurationHHMM(d.screenTimeSeconds);
      });
    } else {
      hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        label: (i < 10 ? '0' + i : i) + ':00',
        shortLabel: (i < 10 ? '0' + i : i) + ':00',
        screenTimeSeconds: 0,
        screenTimeFormatted: '00:00:00',
        screenTimeHours: 0,
        sessionCount: 0
      }));

      for (const s of rangeSessions) {
        const dur = s.duration_seconds || 0;
        if (s.start_time && s.activity_type === 'TOS') {
          try {
            const hourPart = s.start_time.split(' ')[1];
            if (hourPart) {
              const hr = parseInt(hourPart.split(':')[0], 10);
              if (!isNaN(hr) && hr >= 0 && hr < 24) {
                hourlyDistribution[hr].screenTimeSeconds += dur;
                hourlyDistribution[hr].screenTimeHours += +(dur / 3600).toFixed(2);
                hourlyDistribution[hr].sessionCount += 1;
              }
            }
          } catch (e) {}
        }
      }

      hourlyDistribution.forEach(h => {
        h.screenTimeFormatted = this.formatDuration(h.screenTimeSeconds);
      });
    }

    // Top Applications ranked with percentages
    const topApplications = Object.values(toolMap)
      .sort((a, b) => b.duration - a.duration)
      .map((item, idx) => ({
        rank: idx + 1,
        tool: item.tool,
        process: item.process,
        category: item.category,
        durationSeconds: item.duration,
        durationFormatted: this.formatDuration(item.duration),
        durationHHMM: this.formatDurationHHMM(item.duration),
        durationHours: +(item.duration / 3600).toFixed(2),
        percentage: tosDuration > 0 ? Math.min(100, Math.round((item.duration / tosDuration) * 100)) : 0,
        switches: item.switches
      }));

    const mostUsedApp = topApplications.length > 0 ? topApplications[0] : null;
    const daysCount = isRange ? Math.max(1, dailyDistribution.length) : 1;
    const targetHoursPerDay = this.settings.dailyTargetHours || 8.0;
    const totalTargetSeconds = targetHoursPerDay * 3600 * daysCount;
    const goalProgressPct = totalTargetSeconds > 0 ? Math.min(100, Math.round((tosDuration / totalTargetSeconds) * 100)) : 0;
    const productivityScore = tosDuration > 0 ? Math.min(100, Math.round((productiveDuration / tosDuration) * 100)) : 0;
    const averageDailySeconds = Math.round(tosDuration / daysCount);

    return {
      isRange,
      startDate,
      endDate,
      daysCount,
      user: {
        name: this.settings.userName,
        email: this.settings.userEmail,
        companyName: this.settings.companyName,
        department: this.settings.department,
        designation: this.settings.designation,
        employeeId: this.settings.employeeId,
        firstStart: firstStart || '--',
        lastEnd: lastEnd || '--'
      },
      screenTime: {
        totalSeconds: tosDuration,
        totalFormatted: this.formatDuration(tosDuration),
        totalHHMM: this.formatDurationHHMM(tosDuration),
        totalHours: +(tosDuration / 3600).toFixed(2),
        targetHours: targetHoursPerDay * daysCount,
        goalProgressPct: goalProgressPct,
        averageDailySeconds: averageDailySeconds,
        averageDailyFormatted: this.formatDuration(averageDailySeconds),
        averageDailyHHMM: this.formatDurationHHMM(averageDailySeconds)
      },
      kpi: {
        screenTimeSeconds: tosDuration,
        screenTimeFormatted: this.formatDuration(tosDuration),
        productiveSeconds: productiveDuration,
        productiveFormatted: this.formatDuration(productiveDuration),
        idleSeconds: idleDuration,
        idleFormatted: this.formatDuration(idleDuration),
        productivityScore: productivityScore,
        sessionCount: rangeSessions.length,
        switchesCount: topApplications.reduce((acc, a) => acc + a.switches, 0),
        averageDailyFormatted: this.formatDurationHHMM(averageDailySeconds),
        monitoredDays: daysCount
      },
      mostUsedApp: mostUsedApp,
      categoryTotals,
      dailyDistribution,
      hourlyDistribution,
      topApplications
    };
  }

  /**
   * Generates continuous 24-hour timesheet blocks for a single date or date range
   */
  getTimesheetGrid(param) {
    let targetDate = this.getTodayDate();
    if (typeof param === 'string') {
      targetDate = param;
    } else if (param && param.startDate) {
      targetDate = param.endDate || param.startDate;
    }

    const daySessions = this.sessions
      .filter(s => s.date === targetDate && s.start_time && s.end_time)
      .sort((a, b) => (a.start_epoch || 0) - (b.start_epoch || 0));

    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: (i < 10 ? '0' + i : i) + ':00',
      blocks: [],
      totalScreenTimeSeconds: 0
    }));

    for (const session of daySessions) {
      try {
        const sDate = new Date(session.start_time);
        const eDate = new Date(session.end_time);
        if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) continue;

        const startHour = sDate.getHours();
        const endHour = eDate.getHours();

        for (let h = startHour; h <= Math.min(23, endHour); h++) {
          const hourStart = new Date(sDate);
          hourStart.setHours(h, 0, 0, 0);

          const hourEnd = new Date(sDate);
          hourEnd.setHours(h, 59, 59, 999);

          const blockStart = Math.max(sDate.getTime(), hourStart.getTime());
          const blockEnd = Math.min(eDate.getTime(), hourEnd.getTime());

          if (blockEnd > blockStart) {
            const startMinute = (blockStart - hourStart.getTime()) / 60000;
            const durationMinutes = (blockEnd - blockStart) / 60000;
            const leftPct = (startMinute / 60) * 100;
            const widthPct = Math.max(1.2, (durationMinutes / 60) * 100);

            let blockClass = 'tos';
            if (session.activity_type === 'IDLE') blockClass = 'idle';

            hours[h].blocks.push({
              id: session.id,
              tool: session.tool_name,
              process: session.process_name,
              title: session.window_title,
              category: session.category,
              type: session.activity_type,
              blockClass,
              leftPct: +leftPct.toFixed(2),
              widthPct: +widthPct.toFixed(2),
              startFormatted: this.formatTimeOnly(new Date(blockStart)),
              endFormatted: this.formatTimeOnly(new Date(blockEnd)),
              durationFormatted: session.duration_formatted
            });

            if (session.activity_type === 'TOS') {
              hours[h].totalScreenTimeSeconds += Math.round((blockEnd - blockStart) / 1000);
            }
          }
        }
      } catch (e) {}
    }

    return {
      date: targetDate,
      hours
    };
  }

  /**
   * Export to CSV with Exact Headers matching user specification
   * ID, Date, Tool Name, Process, Window Title, URL / Domain, Category, Impact, Activity Type, Start Time, End Time, Duration (Seconds), Duration (HH:MM:SS), Rating
   */
  exportToCsv(filter = {}) {
    const result = this.getSessions(Object.assign({ limit: 50000, offset: 0 }, filter));

    const meta = [
      `# i-Look Screen Time & App Usage Tracker`,
      `# Organization: ${this.settings.companyName || 'Runit Infotech'} | Department: ${this.settings.department || 'Engineering'}`,
      `# User: ${this.settings.userName || 'User'} (${this.settings.userEmail || ''}) | Employee ID: ${this.settings.employeeId || 'N/A'}`,
      `# Daily Target: ${this.settings.dailyTargetHours || 8} Hours | Export Date: ${this.formatDate(new Date())}`,
      `# -------------------------------------------------------------------------------------------------------------`
    ];

    const headers = [
      'ID',
      'Date',
      'Tool Name',
      'Process',
      'Window Title',
      'URL / Domain',
      'Category',
      'Impact',
      'Activity Type',
      'Start Time',
      'End Time',
      'Duration (Seconds)',
      'Duration (HH:MM:SS)',
      'Rating'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = [...meta, headers.join(',')];
    for (const s of result.sessions) {
      rows.push([
        escapeCsv(s.id),
        escapeCsv(s.date),
        escapeCsv(s.tool_name),
        escapeCsv(s.process_name),
        escapeCsv(s.window_title),
        escapeCsv(s.url || s.domain),
        escapeCsv(s.category),
        escapeCsv(s.impact),
        escapeCsv(s.activity_type),
        escapeCsv(s.start_time),
        escapeCsv(s.end_time),
        s.duration_seconds || 0,
        escapeCsv(s.duration_formatted),
        s.rating !== undefined ? s.rating : 0
      ].join(','));
    }

    return rows.join('\r\n');
  }

  formatDate(d) {
    const pad = n => (n < 10 ? '0' + n : n);
    const yr = d.getFullYear();
    const mo = pad(d.getMonth() + 1);
    const da = pad(d.getDate());
    const hr = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const sc = pad(d.getSeconds());
    return `${yr}-${mo}-${da} ${hr}:${mi}:${sc}`;
  }

  formatDateYMD(d) {
    const pad = n => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  formatTimeOnly(d) {
    const pad = n => (n < 10 ? '0' + n : n);
    const hr = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const sc = pad(d.getSeconds());
    return `${hr}:${mi}:${sc}`;
  }

  getTodayDate() {
    const d = new Date();
    return this.formatDateYMD(d);
  }

  formatDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const hr = Math.floor(s / 3600);
    const mi = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    const pad = n => (n < 10 ? '0' + n : n);
    return `${pad(hr)}:${pad(mi)}:${pad(sc)}`;
  }

  formatDurationHHMM(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const hr = Math.floor(s / 3600);
    const mi = Math.floor((s % 3600) / 60);
    const pad = n => (n < 10 ? '0' + n : n);
    return `${pad(hr)}h ${pad(mi)}m`;
  }
}

module.exports = Database;
