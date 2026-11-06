/**
 * i-Look Modern StayFree Frontend Controller
 * Multi-day date slice analytics, interactive charts, and StayFree calendar popup
 */

// Active Date Range State
let currentDateRange = {
  startDate: getTodayDate(),
  endDate: getTodayDate(),
  label: 'Today',
  preset: 'today'
};

let chartUsageTrend = null;
let chartAppsDonut = null;
let chartCategoriesDonut = null;
let chartTrendType = 'line'; // 'line' or 'bar'

let allSessions = [];
let currentFilter = {
  search: '',
  category: '',
  type: ''
};

let currentTrackingState = {
  status: 'Online',
  isIdle: false,
  isPaused: false,
  currentTool: 'Initializing tracker...',
  currentTitle: 'Detecting foreground application',
  currentDurationFormatted: '00:00:00'
};

// Calendar picker temporary selection state
let calCurrentYear = new Date().getFullYear();
let calCurrentMonth = new Date().getMonth(); // 0-indexed
let tempRangeStart = currentDateRange.startDate;
let tempRangeEnd = currentDateRange.endDate;

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initTabs();
  initStayFreeDateRangePicker();
  initTableFilters();
  initTrackingControls();
  initRuleModal();
  initChartControls();

  // Load Initial Data
  await loadDashboardData();
  await loadSessionsTable();
  await loadTimesheetGrid();
  await loadRules();
  await loadSettingsAndAppInfo();

  // Watcher Real-Time IPC Listeners
  if (window.api) {
    window.api.onWatcherTick((state) => {
      currentTrackingState = state;
      updateLiveTicker(state);
    });

    window.api.onWatcherStateChange((state) => {
      currentTrackingState = state;
      updateLiveState(state);
      updateLiveTicker(state);

      // Smoothly refresh data when activity transitions
      loadDashboardData();
      const activeTab = document.querySelector('.nav-segment-btn.active');
      if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        if (tabId === 'tab-sessions') {
          loadSessionsTable();
        } else if (tabId === 'tab-timeline') {
          loadTimesheetGrid();
        }
      }
    });

    window.api.onDataUpdated(() => {
      loadDashboardData();
      loadSessionsTable();
      loadTimesheetGrid();
    });

    window.api.onSwitchTab((tabId) => {
      switchTab(tabId);
    });

    // Gentle 10-second background sync
    setInterval(() => {
      loadDashboardData();
      const activeTab = document.querySelector('.nav-segment-btn.active');
      if (activeTab && activeTab.getAttribute('data-tab') === 'tab-sessions') {
        loadSessionsTable();
      }
    }, 10000);
  }
});

/* ==========================================================================
   Theme Controller
   ========================================================================== */
function initTheme() {
  const savedTheme = localStorage.getItem('ilook-theme') || 'dark';
  applyTheme(savedTheme);

  const btnToggle = document.getElementById('btn-theme-toggle');
  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('ilook-theme', next);
      if (chartUsageTrend) chartUsageTrend.update('none');
      if (chartAppsDonut) chartAppsDonut.update('none');
      if (chartCategoriesDonut) chartCategoriesDonut.update('none');
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    isDark,
    textColor: isDark ? '#94a3b8' : '#64748b',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)',
    cardBg: isDark ? '#121a29' : '#ffffff'
  };
}

/* ==========================================================================
   Tab Navigation Controller
   ========================================================================== */
function initTabs() {
  const navBtns = document.querySelectorAll('.nav-segment-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(targetTabId) {
  const navBtns = document.querySelectorAll('.nav-segment-btn');
  navBtns.forEach(b => {
    if (b.getAttribute('data-tab') === targetTabId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const targetPane = document.getElementById(targetTabId);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  if (targetTabId === 'tab-sessions') {
    loadSessionsTable();
  } else if (targetTabId === 'tab-timeline') {
    loadTimesheetGrid();
  } else if (targetTabId === 'tab-overview') {
    loadDashboardData();
  }
}

/* ==========================================================================
   StayFree Interactive Date Range Picker (Matching Screenshot 2)
   ========================================================================== */
function initStayFreeDateRangePicker() {
  const btnOpen = document.getElementById('btn-open-date-picker');
  const popover = document.getElementById('popover-date-range');
  const btnCancel = document.getElementById('btn-cancel-range');
  const btnApply = document.getElementById('btn-apply-range');
  const btnPrev = document.getElementById('btn-prev-range');
  const btnNext = document.getElementById('btn-next-range');
  const presetBtns = document.querySelectorAll('.preset-btn');

  const calPrev = document.getElementById('cal-prev-month');
  const calNext = document.getElementById('cal-next-month');

  updateDateRangeTriggerLabel();

  // Open Popover
  if (btnOpen && popover) {
    btnOpen.addEventListener('click', () => {
      tempRangeStart = currentDateRange.startDate;
      tempRangeEnd = currentDateRange.endDate;
      const d = parseYMD(tempRangeStart);
      calCurrentYear = d.getFullYear();
      calCurrentMonth = d.getMonth();
      renderCalendar();
      updatePopoverSummary();
      popover.classList.add('active');
    });
  }

  // Close Popover
  if (btnCancel && popover) {
    btnCancel.addEventListener('click', () => {
      popover.classList.remove('active');
    });
  }

  // Apply Range
  if (btnApply && popover) {
    btnApply.addEventListener('click', () => {
      currentDateRange.startDate = tempRangeStart;
      currentDateRange.endDate = tempRangeEnd;
      currentDateRange.label = computeRangeLabel(tempRangeStart, tempRangeEnd);
      updateDateRangeTriggerLabel();
      popover.classList.remove('active');
      refreshAllData();
    });
  }

  // Quick Preset Buttons
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.getAttribute('data-preset');
      applyPresetSelection(preset);
    });
  });

  // Calendar Month Navigation
  if (calPrev) {
    calPrev.addEventListener('click', () => {
      calCurrentMonth--;
      if (calCurrentMonth < 0) {
        calCurrentMonth = 11;
        calCurrentYear--;
      }
      renderCalendar();
    });
  }

  if (calNext) {
    calNext.addEventListener('click', () => {
      calCurrentMonth++;
      if (calCurrentMonth > 11) {
        calCurrentMonth = 0;
        calCurrentYear++;
      }
      renderCalendar();
    });
  }

  // Shift range with Prev / Next arrows in header
  if (btnPrev) {
    btnPrev.addEventListener('click', () => shiftDateRange(-1));
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => shiftDateRange(1));
  }

  // Global Export CSV Buttons
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', exportCsvData);
  }

  const btnExportTable = document.getElementById('btn-export-sessions-table');
  if (btnExportTable) {
    btnExportTable.addEventListener('click', exportCsvData);
  }
}

function applyPresetSelection(preset) {
  const today = new Date();
  const todayYMD = formatDateYMD(today);

  if (preset === 'today') {
    tempRangeStart = todayYMD;
    tempRangeEnd = todayYMD;
  } else if (preset === 'yesterday') {
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const yestYMD = formatDateYMD(yest);
    tempRangeStart = yestYMD;
    tempRangeEnd = yestYMD;
  } else if (preset === 'last7') {
    const start7 = new Date(today);
    start7.setDate(start7.getDate() - 6);
    tempRangeStart = formatDateYMD(start7);
    tempRangeEnd = todayYMD;
  } else if (preset === 'last30') {
    const start30 = new Date(today);
    start30.setDate(start30.getDate() - 29);
    tempRangeStart = formatDateYMD(start30);
    tempRangeEnd = todayYMD;
  } else if (preset === 'thisMonth') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    tempRangeStart = formatDateYMD(firstDay);
    tempRangeEnd = todayYMD;
  }

  const d = parseYMD(tempRangeEnd);
  calCurrentYear = d.getFullYear();
  calCurrentMonth = d.getMonth();
  renderCalendar();
  updatePopoverSummary();
}

function shiftDateRange(direction) {
  const start = parseYMD(currentDateRange.startDate);
  const end = parseYMD(currentDateRange.endDate);

  const isSingle = currentDateRange.startDate === currentDateRange.endDate;
  const daysShift = isSingle ? 1 : Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

  start.setDate(start.getDate() + direction * daysShift);
  end.setDate(end.getDate() + direction * daysShift);

  currentDateRange.startDate = formatDateYMD(start);
  currentDateRange.endDate = formatDateYMD(end);
  currentDateRange.label = computeRangeLabel(currentDateRange.startDate, currentDateRange.endDate);
  updateDateRangeTriggerLabel();
  refreshAllData();
}

function renderCalendar() {
  const label = document.getElementById('cal-month-year-label');
  const grid = document.getElementById('calendar-days-grid');
  if (!label || !grid) return;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  label.textContent = `${monthNames[calCurrentMonth]} ${calCurrentYear}`;

  const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
  const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();

  let html = '';

  // Empty cells for alignment before 1st of month
  for (let i = 0; i < firstDayIndex; i++) {
    html += '<div class="cal-day-cell empty"></div>';
  }

  const rangeStartVal = tempRangeStart;
  const rangeEndVal = tempRangeEnd;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calCurrentYear}-${pad(calCurrentMonth + 1)}-${pad(d)}`;

    let cellClass = 'cal-day-cell';
    const isSingle = rangeStartVal === rangeEndVal;

    if (isSingle && dateStr === rangeStartVal) {
      cellClass += ' single-select';
    } else if (!isSingle) {
      if (dateStr === rangeStartVal) {
        cellClass += ' range-start';
      } else if (dateStr === rangeEndVal) {
        cellClass += ' range-end';
      } else if (dateStr > rangeStartVal && dateStr < rangeEndVal) {
        cellClass += ' range-in';
      }
    }

    html += `<div class="${cellClass}" data-date="${dateStr}">${d}</div>`;
  }

  grid.innerHTML = html;

  // Click handlers on date cells
  grid.querySelectorAll('.cal-day-cell:not(.empty)').forEach(cell => {
    cell.addEventListener('click', () => {
      const clickedDate = cell.getAttribute('data-date');
      handleCalendarDateClick(clickedDate);
    });
  });
}

let calClickStep = 0; // 0 = start, 1 = end
function handleCalendarDateClick(dateStr) {
  if (calClickStep === 0) {
    tempRangeStart = dateStr;
    tempRangeEnd = dateStr;
    calClickStep = 1;
  } else {
    if (dateStr < tempRangeStart) {
      tempRangeEnd = tempRangeStart;
      tempRangeStart = dateStr;
    } else {
      tempRangeEnd = dateStr;
    }
    calClickStep = 0;
  }
  renderCalendar();
  updatePopoverSummary();
}

function updatePopoverSummary() {
  const summary = document.getElementById('popover-range-summary');
  if (summary) {
    summary.textContent = `${tempRangeStart} - ${tempRangeEnd}`;
  }
}

function updateDateRangeTriggerLabel() {
  const display = document.getElementById('date-range-display-text');
  if (display) {
    display.textContent = currentDateRange.label;
  }
}

function computeRangeLabel(start, end) {
  const today = getTodayDate();
  if (start === today && end === today) return 'Today';

  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestStr = formatDateYMD(yest);
  if (start === yestStr && end === yestStr) return 'Yesterday';

  const d1 = parseYMD(start);
  const d2 = parseYMD(end);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (start === end) {
    return `${dayNames[d1.getDay()]}, ${monthNames[d1.getMonth()]} ${d1.getDate()}`;
  }

  if (end === today) {
    return `${dayNames[d1.getDay()]} to Today`;
  }

  return `${monthNames[d1.getMonth()]} ${d1.getDate()} - ${monthNames[d2.getMonth()]} ${d2.getDate()}`;
}

async function refreshAllData() {
  await loadDashboardData();
  await loadSessionsTable();
  await loadTimesheetGrid();
}

/* ==========================================================================
   Live Tracking State Controller
   ========================================================================== */
function initTrackingControls() {
  const btnPause = document.getElementById('btn-pause-tracking');
  if (btnPause && window.api) {
    btnPause.addEventListener('click', async () => {
      const result = await window.api.toggleTracking();
      if (result) {
        currentTrackingState.isPaused = result.isPaused;
        updateLiveState(currentTrackingState);
      }
    });
  }
}

function updateLiveTicker(state) {
  const timer = document.getElementById('live-session-timer');
  if (timer) {
    timer.textContent = state.currentDurationFormatted || '00:00:00';
  }
}

function updateLiveState(state) {
  const pulseBadge = document.getElementById('status-pulse');
  const statusText = document.getElementById('status-text');
  const appAvatar = document.getElementById('live-app-avatar');
  const appName = document.getElementById('live-app-name');
  const windowTitle = document.getElementById('live-window-title');
  const btnPauseIcon = document.getElementById('btn-pause-icon');
  const btnPauseText = document.getElementById('btn-pause-text');

  if (state.isPaused) {
    if (pulseBadge) {
      pulseBadge.className = 'status-pulse-badge paused';
      statusText.textContent = 'Tracking Paused';
    }
    if (btnPauseIcon) btnPauseIcon.textContent = '▶️';
    if (btnPauseText) btnPauseText.textContent = 'Resume';
    if (appName) appName.textContent = 'Paused';
    if (windowTitle) windowTitle.textContent = 'Tracker is currently paused';
    if (appAvatar) appAvatar.textContent = '⏸️';
    return;
  }

  if (btnPauseIcon) btnPauseIcon.textContent = '⏸️';
  if (btnPauseText) btnPauseText.textContent = 'Pause';

  if (state.isIdle) {
    if (pulseBadge) {
      pulseBadge.className = 'status-pulse-badge idle';
      statusText.textContent = 'System Idle';
    }
    if (appName) appName.textContent = 'Idle Time';
    if (windowTitle) windowTitle.textContent = 'User inactive (> 3 mins)';
    if (appAvatar) appAvatar.textContent = '💤';
  } else {
    if (pulseBadge) {
      pulseBadge.className = 'status-pulse-badge online';
      statusText.textContent = 'Tracking Active';
    }

    const tool = state.currentTool || 'Active Window';
    if (appName) appName.textContent = tool;
    if (windowTitle) windowTitle.textContent = state.currentTitle || tool;

    if (appAvatar) {
      appAvatar.textContent = getAppInitials(tool);
    }
  }
}

function getAppInitials(name) {
  if (!name) return 'PC';
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const words = clean.split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase() || 'IL';
}

/* ==========================================================================
   TAB 1: STAYFREE DASHBOARD & CHARTS (MATCHING SCREENSHOTS 2, 3, 4)
   ========================================================================== */
function initChartControls() {
  const btnChartType = document.getElementById('btn-chart-type-toggle');
  if (btnChartType) {
    btnChartType.addEventListener('click', () => {
      chartTrendType = chartTrendType === 'line' ? 'bar' : 'line';
      btnChartType.textContent = chartTrendType === 'line' ? 'Line Chart' : 'Bar Chart';
      loadDashboardData();
    });
  }
}

async function loadDashboardData() {
  if (!window.api) return;

  try {
    const data = await window.api.getDashboardData({
      startDate: currentDateRange.startDate,
      endDate: currentDateRange.endDate
    });
    if (!data) return;

    renderUsageStats(data);
    renderUsageTrendChart(data);
    renderAppUsageDonutChart(data.topApplications || []);
    renderCategoryDonutChart(data.categoryTotals || {});
    renderTopAppsRanking(data.topApplications || []);
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
}

function renderUsageStats(data) {
  const screenTime = data.screenTime || {};
  const kpi = data.kpi || {};

  const statUsage = document.getElementById('stat-total-usage');
  const statSessions = document.getElementById('stat-total-sessions');
  const statAvgDaily = document.getElementById('stat-avg-daily');
  const statDays = document.getElementById('stat-monitored-days');
  const trendUsageTitle = document.getElementById('trend-usage-time-val');
  const trendSubRange = document.getElementById('trend-sub-range-label');

  if (statUsage) statUsage.textContent = screenTime.totalFormatted || '00:00:00';
  if (trendUsageTitle) trendUsageTitle.textContent = screenTime.totalHHMM || '0h 00m';
  if (trendSubRange) trendSubRange.textContent = currentDateRange.label;

  if (statSessions) statSessions.textContent = `${kpi.sessionCount || 0}`;
  if (statAvgDaily) statAvgDaily.textContent = screenTime.averageDailyHHMM || '0h 00m';
  if (statDays) statDays.textContent = `${data.daysCount || 1} ${data.daysCount === 1 ? 'Day' : 'Days'}`;

  const appsSub = document.getElementById('apps-list-sub-range');
  if (appsSub) {
    appsSub.textContent = `All applications used in ${currentDateRange.label}`;
  }
}

function renderUsageTrendChart(data) {
  const canvas = document.getElementById('chart-usage-trend');
  if (!canvas) return;

  const isRange = data.isRange;
  let labels = [];
  let values = [];

  if (isRange && data.dailyDistribution) {
    labels = data.dailyDistribution.map(d => d.shortLabel);
    values = data.dailyDistribution.map(d => +(d.screenTimeSeconds / 3600).toFixed(2));
  } else if (data.hourlyDistribution) {
    labels = data.hourlyDistribution.map(h => h.shortLabel);
    values = data.hourlyDistribution.map(h => +(h.screenTimeSeconds / 3600).toFixed(2));
  }

  const colors = getThemeColors();
  const ctx = canvas.getContext('2d');

  let gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

  if (chartUsageTrend) {
    chartUsageTrend.destroy();
  }

  chartUsageTrend = new Chart(ctx, {
    type: chartTrendType,
    data: {
      labels,
      datasets: [{
        label: 'Screen Time (Hours)',
        data: values,
        borderColor: '#10b981',
        borderWidth: 2.5,
        backgroundColor: chartTrendType === 'line' ? gradient : 'rgba(16, 185, 129, 0.65)',
        fill: chartTrendType === 'line',
        tension: 0.35,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#10b981',
          bodyColor: '#ffffff',
          borderColor: 'rgba(16, 185, 129, 0.4)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} hours (${formatHoursToHHMM(ctx.parsed.y)})`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.textColor, font: { size: 11, family: 'Plus Jakarta Sans' } }
        },
        y: {
          beginAtZero: true,
          grid: { color: colors.gridColor },
          ticks: {
            color: colors.textColor,
            font: { size: 10.5 },
            callback: (v) => `${v}h`
          }
        }
      }
    }
  });
}

function renderAppUsageDonutChart(topApps) {
  const canvas = document.getElementById('chart-apps-donut');
  if (!canvas) return;

  const labels = [];
  const dataHours = [];

  const palette = [
    '#3b82f6', // Chrome Blue
    '#00f2fe', // Cyan
    '#eab308', // Yellow
    '#8b5cf6', // Purple
    '#10b981', // Green
    '#f97316', // Orange
    '#64748b'  // Others
  ];

  let topSlice = topApps.slice(0, 5);
  topSlice.forEach(app => {
    labels.push(app.tool);
    dataHours.push(app.durationHours);
  });

  if (topApps.length > 5) {
    const othersHours = topApps.slice(5).reduce((acc, a) => acc + a.durationHours, 0);
    labels.push('Others');
    dataHours.push(+othersHours.toFixed(2));
  }

  if (labels.length === 0) {
    labels.push('No Apps');
    dataHours.push(1);
  }

  if (chartAppsDonut) {
    chartAppsDonut.destroy();
  }

  const ctx = canvas.getContext('2d');
  chartAppsDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: dataHours,
        backgroundColor: palette.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 5,
            useBorderRadius: true,
            color: getThemeColors().textColor,
            font: { size: 10.5, family: 'Plus Jakarta Sans' },
            padding: 8
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#00f2fe',
          bodyColor: '#ffffff',
          borderColor: 'rgba(0, 242, 254, 0.3)',
          borderWidth: 1,
          padding: 8,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed}h`
          }
        }
      }
    }
  });
}

function renderCategoryDonutChart(categoryTotals) {
  const canvas = document.getElementById('chart-categories-donut');
  if (!canvas) return;

  const labels = Object.keys(categoryTotals);
  const dataHours = Object.values(categoryTotals).map(sec => +(sec / 3600).toFixed(2));

  const palette = [
    '#00f2fe',
    '#8b5cf6',
    '#10b981',
    '#3b82f6',
    '#f59e0b',
    '#ec4899',
    '#64748b'
  ];

  if (labels.length === 0) {
    labels.push('No Activity');
    dataHours.push(1);
  }

  if (chartCategoriesDonut) {
    chartCategoriesDonut.destroy();
  }

  const ctx = canvas.getContext('2d');
  chartCategoriesDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: dataHours,
        backgroundColor: palette.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 5,
            useBorderRadius: true,
            color: getThemeColors().textColor,
            font: { size: 10.5, family: 'Plus Jakarta Sans' },
            padding: 8
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#8b5cf6',
          bodyColor: '#ffffff',
          borderColor: 'rgba(139, 92, 246, 0.4)',
          borderWidth: 1,
          padding: 8,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed}h`
          }
        }
      }
    }
  });
}

function renderTopAppsRanking(topApps) {
  const container = document.getElementById('apps-ranking-container');
  const countTag = document.getElementById('ranking-count-tag');
  if (!container) return;

  if (countTag) {
    countTag.textContent = `${topApps.length} Apps Tracked`;
  }

  if (!topApps || topApps.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <span class="empty-icon">📊</span>
        <h4>No activity recorded in this date range</h4>
        <p>Start working on your computer — i-Look will automatically record your app and site usage here.</p>
      </div>
    `;
    return;
  }

  let html = '';
  topApps.forEach((app, idx) => {
    const initials = getAppInitials(app.tool);
    html += `
      <div class="app-ranking-item">
        <span class="app-rank-num">#${idx + 1}</span>
        <div class="app-icon-avatar">${initials}</div>
        <div class="app-info-block">
          <span class="app-title-line truncate">${escapeHtml(app.tool)}</span>
          <span class="app-proc-category">${escapeHtml(app.category || 'System Tools')} • ${app.switches} sessions</span>
        </div>
        <div class="app-progress-block">
          <div class="app-progress-bar-bg">
            <div class="app-progress-bar-fill" style="width: ${Math.max(3, app.percentage)}%;"></div>
          </div>
        </div>
        <div class="app-metrics-block">
          <span class="app-duration-val">${app.durationHHMM || app.durationFormatted}</span>
          <span class="app-switches-val">${app.percentage}%</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/* ==========================================================================
   TAB 2: DETAILED SESSIONS TABLE (MATCHING EXACT USER SPECIFICATION)
   Columns: # | ID | Date | Tool Name | Process | Window Title | URL / Domain | Category | Impact | Activity Type | Start Time | End Time | Duration (Seconds) | Duration (HH:MM:SS)
   ========================================================================== */
function initTableFilters() {
  const searchInput = document.getElementById('session-search-input');
  const catSelect = document.getElementById('session-category-select');
  const typeSelect = document.getElementById('session-type-select');

  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilter.search = e.target.value.trim();
        loadSessionsTable();
      }, 250);
    });
  }

  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      currentFilter.category = e.target.value;
      loadSessionsTable();
    });
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      currentFilter.type = e.target.value;
      loadSessionsTable();
    });
  }
}

async function loadSessionsTable() {
  if (!window.api) return;

  try {
    const filter = Object.assign({
      startDate: currentDateRange.startDate,
      endDate: currentDateRange.endDate
    }, currentFilter);

    const data = await window.api.getSessions(filter);
    const tbody = document.getElementById('sessions-tbody');
    const badge = document.getElementById('sessions-counter-badge');

    if (badge) {
      badge.textContent = `Showing ${data.total || 0} sessions`;
    }

    if (!tbody) return;

    if (!data.sessions || data.sessions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="14" class="table-empty-row">
            <div class="empty-state-card">
              <span class="empty-icon">⏱️</span>
              <h4>No sessions recorded for this date range</h4>
              <p>When you switch windows or browse sites, your session start, end, and duration appear here live.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    data.sessions.forEach((s, idx) => {
      const toolName = s.tool_name || s.process_name || 'System';
      const urlOrDomain = s.url || s.domain || '';

      let impactClass = 'neutral';
      if (s.impact === 'Productive') impactClass = 'productive';
      else if (s.impact === 'Non Productive') impactClass = 'distracting';

      rowsHtml += `
        <tr>
          <td style="color: var(--text-muted); font-size: 11px;">${idx + 1}</td>
          <td><span class="session-id-mono">${escapeHtml(s.id || '')}</span></td>
          <td><strong>${escapeHtml(s.date || '')}</strong></td>
          <td><strong>${escapeHtml(toolName)}</strong></td>
          <td style="color: var(--text-muted); font-family: var(--font-mono); font-size: 11px;">${escapeHtml(s.process_name || '')}</td>
          <td style="max-width: 260px;" class="truncate" title="${escapeHtml(s.window_title || '')}">
            ${escapeHtml(s.window_title || toolName)}
          </td>
          <td style="max-width: 140px; color: var(--accent-cyan);" class="truncate" title="${escapeHtml(urlOrDomain)}">
            ${escapeHtml(urlOrDomain)}
          </td>
          <td><span class="category-tag-badge">${escapeHtml(s.category || 'System Tools')}</span></td>
          <td><span class="impact-tag ${impactClass}">${escapeHtml(s.impact || 'Productive')}</span></td>
          <td><span class="category-tag-badge">${escapeHtml(s.activity_type || 'TOS')}</span></td>
          <td><span class="time-stamp-badge start">${s.start_time || '--:--'}</span></td>
          <td><span class="time-stamp-badge end">${s.end_time || '--:--'}</span></td>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-purple); text-align: right;">${s.duration_seconds || 0}</td>
          <td><span class="time-stamp-badge duration">${s.duration_formatted || '00:00:01'}</span></td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;
  } catch (err) {
    console.error('Error loading sessions table:', err);
  }
}

/* ==========================================================================
   TAB 3: 24-HOUR CONTINUOUS TIMELINE
   ========================================================================== */
async function loadTimesheetGrid() {
  if (!window.api) return;

  try {
    const data = await window.api.getTimesheetGrid({
      startDate: currentDateRange.startDate,
      endDate: currentDateRange.endDate
    });
    const container = document.getElementById('timeline-hours-container');
    if (!container || !data || !data.hours) return;

    let html = '';
    data.hours.forEach(hour => {
      let blocksHtml = '';
      hour.blocks.forEach(b => {
        const tooltip = `${b.tool}: ${b.startFormatted} - ${b.endFormatted} (${b.durationFormatted})`;
        blocksHtml += `
          <div class="timeline-block ${b.blockClass}" 
               style="left: ${b.leftPct}%; width: ${b.widthPct}%;" 
               title="${escapeHtml(tooltip)}">
          </div>
        `;
      });

      const totalFormatted = formatSecondsToHHMM(hour.totalScreenTimeSeconds);

      html += `
        <div class="timeline-hour-row">
          <span class="timeline-hour-label">${hour.label}</span>
          <div class="timeline-hour-track">
            ${blocksHtml}
          </div>
          <span class="timeline-hour-total">${hour.totalScreenTimeSeconds > 0 ? totalFormatted : ''}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.error('Error loading timesheet grid:', err);
  }
}

/* ==========================================================================
   TAB 4: APP RULES ENGINE
   ========================================================================== */
function initRuleModal() {
  const btnOpen = document.getElementById('btn-add-rule-modal');
  const modal = document.getElementById('modal-rule');
  const btnClose = document.getElementById('modal-rule-close');
  const btnCancel = document.getElementById('modal-rule-cancel');
  const btnSave = document.getElementById('modal-rule-save');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => modal.classList.add('active'));
  }
  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('active'));
  }
  if (btnCancel && modal) {
    btnCancel.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (btnSave && modal && window.api) {
    btnSave.addEventListener('click', async () => {
      const pattern = document.getElementById('rule-pattern').value.trim();
      const type = document.getElementById('rule-type').value;
      const tool = document.getElementById('rule-tool').value.trim();
      const category = document.getElementById('rule-category').value;
      const impact = document.getElementById('rule-impact').value;

      if (!pattern) {
        alert('Please enter a pattern keyword or executable name');
        return;
      }

      let rating = 2;
      if (impact === 'No Impact') rating = 0;
      else if (impact === 'Non Productive') rating = -2;

      const currentRules = (await window.api.getRules()) || [];
      currentRules.push({
        id: 'rule_' + Date.now(),
        pattern,
        matchType: type,
        tool: tool || pattern,
        category,
        impact,
        rating
      });

      await window.api.saveRules(currentRules);
      modal.classList.remove('active');
      document.getElementById('rule-pattern').value = '';
      document.getElementById('rule-tool').value = '';
      loadRules();
    });
  }
}

async function loadRules() {
  if (!window.api) return;

  try {
    const rules = await window.api.getRules();
    const tbody = document.getElementById('rules-tbody');
    if (!tbody) return;

    if (!rules || rules.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="table-empty-row">
            <div class="empty-state-card">
              <span class="empty-icon">🏷️</span>
              <h4>No custom rules defined</h4>
              <p>Default classifications are active. Click "+ Add Custom Rule" to map your applications.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    rules.forEach((r, idx) => {
      rowsHtml += `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-cyan);">${escapeHtml(r.pattern)}</td>
          <td><span class="category-tag-badge">${escapeHtml(r.matchType || 'any')}</span></td>
          <td><strong>${escapeHtml(r.tool)}</strong></td>
          <td><span class="category-tag-badge">${escapeHtml(r.category)}</span></td>
          <td><span class="impact-tag ${r.impact === 'Productive' ? 'productive' : (r.impact === 'Non Productive' ? 'distracting' : 'neutral')}">${escapeHtml(r.impact)}</span></td>
          <td><strong>${r.rating > 0 ? '+' + r.rating : r.rating}</strong></td>
          <td>
            <button class="btn-glass-secondary" style="padding: 4px 10px; font-size: 11px; color: var(--accent-rose);" onclick="deleteRule('${r.id || idx}')">Delete</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;
  } catch (err) {
    console.error('Error loading rules:', err);
  }
}

window.deleteRule = async function(id) {
  if (!window.api) return;
  const currentRules = (await window.api.getRules()) || [];
  const updated = currentRules.filter((r, idx) => r.id !== id && String(idx) !== id);
  await window.api.saveRules(updated);
  loadRules();
};

/* ==========================================================================
   TAB 5: SETTINGS & COMPANY DETAILS
   ========================================================================== */
async function loadSettingsAndAppInfo() {
  if (!window.api) return;

  try {
    const settings = await window.api.getSettings();
    if (settings) {
      const nameInput = document.getElementById('setting-user-name');
      const emailInput = document.getElementById('setting-user-email');
      const empInput = document.getElementById('setting-employee-id');
      const desigInput = document.getElementById('setting-designation');
      const compInput = document.getElementById('setting-company-name');
      const deptInput = document.getElementById('setting-department');
      const targetInput = document.getElementById('setting-daily-target');
      const idleInput = document.getElementById('setting-idle-threshold');
      const trayCheck = document.getElementById('setting-minimize-tray');
      const startupCheck = document.getElementById('setting-launch-startup');

      if (nameInput && settings.userName) nameInput.value = settings.userName;
      if (emailInput && settings.userEmail) emailInput.value = settings.userEmail;
      if (empInput && settings.employeeId) empInput.value = settings.employeeId;
      if (desigInput && settings.designation) desigInput.value = settings.designation;
      if (compInput && settings.companyName) compInput.value = settings.companyName;
      if (deptInput && settings.department) deptInput.value = settings.department;
      if (targetInput && settings.dailyTargetHours) targetInput.value = settings.dailyTargetHours;
      if (idleInput && settings.idleThresholdSeconds) idleInput.value = settings.idleThresholdSeconds;
      if (trayCheck) trayCheck.checked = settings.minimizeToTray !== false;
      if (startupCheck) startupCheck.checked = settings.launchOnStartup !== false;
    }

    // Load App & Company Info from package.json
    const appInfo = await window.api.getAppInfo();
    if (appInfo) {
      const aboutName = document.getElementById('about-app-name');
      const aboutVersion = document.getElementById('about-version');
      const aboutAuthor = document.getElementById('about-author');
      const aboutCompany = document.getElementById('about-company');
      const aboutWebsite = document.getElementById('about-website');
      const aboutSupport = document.getElementById('about-support');

      if (aboutName) aboutName.textContent = appInfo.displayName || 'i-Look Tracker';
      if (aboutVersion) aboutVersion.textContent = appInfo.version || '1.0.0';
      if (aboutAuthor && appInfo.author) aboutAuthor.textContent = appInfo.author.name || 'VARUNAKSHAY S';
      if (aboutCompany && appInfo.company) aboutCompany.textContent = appInfo.company.name || 'Runit Infotech';
      if (aboutWebsite && appInfo.company) aboutWebsite.textContent = appInfo.company.website || 'https://runito.in';
      if (aboutSupport && appInfo.company) aboutSupport.textContent = appInfo.company.support || 'runitinfotech@gmail.com';
    }

    // Save Settings Button
    const btnSaveSettings = document.getElementById('btn-save-settings');
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', async () => {
        const updated = {
          userName: document.getElementById('setting-user-name').value.trim(),
          userEmail: document.getElementById('setting-user-email').value.trim(),
          employeeId: document.getElementById('setting-employee-id').value.trim(),
          designation: document.getElementById('setting-designation').value.trim(),
          companyName: document.getElementById('setting-company-name').value.trim(),
          department: document.getElementById('setting-department').value.trim(),
          dailyTargetHours: parseFloat(document.getElementById('setting-daily-target').value) || 8.0,
          idleThresholdSeconds: parseInt(document.getElementById('setting-idle-threshold').value, 10) || 180,
          minimizeToTray: document.getElementById('setting-minimize-tray').checked,
          launchOnStartup: document.getElementById('setting-launch-startup').checked
        };

        await window.api.saveSettings(updated);
        btnSaveSettings.textContent = '✓ Preferences Saved!';
        btnSaveSettings.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        setTimeout(() => {
          btnSaveSettings.textContent = 'Save All Preferences';
          btnSaveSettings.style.background = '';
        }, 2000);

        loadDashboardData();
      });
    }
  } catch (err) {
    console.error('Error loading settings and app info:', err);
  }
}

/* ==========================================================================
   CSV Export
   ========================================================================== */
async function exportCsvData() {
  if (!window.api) return;
  try {
    const filter = Object.assign({
      startDate: currentDateRange.startDate,
      endDate: currentDateRange.endDate
    }, currentFilter);

    const result = await window.api.exportCsv(filter);
    if (result && result.success) {
      alert(`Successfully exported timesheet sessions to:\n${result.filePath}`);
    }
  } catch (err) {
    console.error('Error exporting CSV:', err);
  }
}

/* ==========================================================================
   Helper Utilities
   ========================================================================== */
function formatSecondsToHHMM(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const hr = Math.floor(s / 3600);
  const mi = Math.floor((s % 3600) / 60);
  return `${hr}h ${mi < 10 ? '0' + mi : mi}m`;
}

function formatHoursToHHMM(hours) {
  const totalMin = Math.round(hours * 60);
  const hr = Math.floor(totalMin / 60);
  const mi = totalMin % 60;
  return `${hr}h ${mi < 10 ? '0' + mi : mi}m`;
}

function parseYMD(ymd) {
  const parts = ymd.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateYMD(d) {
  const pad = n => (n < 10 ? '0' + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getTodayDate() {
  return formatDateYMD(new Date());
}

function pad(n) {
  return n < 10 ? '0' + n : n;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
