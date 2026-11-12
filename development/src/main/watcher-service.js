const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const SENSOR_SCRIPT = require('./sensor-script');

class WatcherService extends EventEmitter {
  constructor(database, categorizer) {
    super();
    this.db = database;
    this.categorizer = categorizer;
    this.process = null;

    this.currentSession = null;
    this.isIdle = false;
    this.isPaused = false;
    this.isRunning = false;

    this.buffer = '';
    this.sensorPath = null;
    this.lastSampleTime = 0;
  }

  ensureSensorFile() {
    this.sensorPath = path.join(this.db.dataDir, 'sensor.ps1');
    try {
      fs.writeFileSync(this.sensorPath, SENSOR_SCRIPT, 'utf8');
      console.log('[WatcherService] Deployed sensor script to:', this.sensorPath);
    } catch (err) {
      console.error('[WatcherService] Failed to write sensor.ps1 to disk:', err);
      this.sensorPath = null;
    }
  }

  start() {
    if (this.isRunning && this.process) return;
    this.isRunning = true;

    this.ensureSensorFile();

    let spawnArgs = [];
    if (this.sensorPath && fs.existsSync(this.sensorPath)) {
      spawnArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', this.sensorPath];
    } else {
      const b64 = Buffer.from(SENSOR_SCRIPT, 'utf16le').toString('base64');
      spawnArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', b64];
    }

    try {
      this.process = spawn('powershell.exe', spawnArgs, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.process.stdout.on('data', (data) => {
        this.buffer += data.toString();
        const lines = this.buffer.split(/\r?\n/);
        this.buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              const sample = JSON.parse(trimmed);
              this.handleSample(sample);
            } catch (err) {
              console.error('[WatcherService] Error handling sample:', err);
            }
          }
        }
      });

      this.process.stderr.on('data', (data) => {
        const text = data.toString().trim();
        if (text && !text.includes('CLIXML')) {
          console.warn('[WatcherService Sensor Warning]:', text);
        }
      });

      this.process.on('close', (code) => {
        console.log('[WatcherService] Sensor exited with code:', code);
        this.process = null;
        if (this.isRunning && !this.isPaused) {
          setTimeout(() => this.start(), 2000);
        }
      });

      this.process.on('error', (err) => {
        console.error('[WatcherService] Sensor process error:', err);
        this.process = null;
      });
    } catch (e) {
      console.error('[WatcherService] Failed to spawn PowerShell:', e);
    }
  }

  pause() {
    this.isPaused = true;
    const now = new Date();
    this.closeCurrentSession(this.db.formatDate(now), now.getTime());
    this.emit('state-change', this.getCurrentState());
  }

  resume() {
    this.isPaused = false;
    this.emit('state-change', this.getCurrentState());
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
    return this.isPaused;
  }

  handleSample(sample) {
    try {
      if (sample.event === 'ready') {
        console.log('[WatcherService] Sensor reported ready');
        return;
      }

      this.lastSampleTime = Date.now();
      if (this.isPaused) {
        return;
      }

      const now = new Date();
      const nowEpoch = now.getTime();
      const formattedNow = this.db.formatDate(now);
      const idleThreshold = (this.db.settings && this.db.settings.idleThresholdSeconds) || 180;

      const sampleIdle = sample.idleSeconds || 0;
      const isUserIdle = sampleIdle >= idleThreshold;

      // Handle Idle Transition
      if (isUserIdle && !this.isIdle) {
        this.isIdle = true;
        this.closeCurrentSession(formattedNow, nowEpoch);

        this.currentSession = {
          id: 'idle_' + nowEpoch,
          date: formattedNow.split(' ')[0],
          tool_name: 'Idle Time',
          process_name: 'System Idle',
          window_title: 'System Inactivity (> ' + Math.round(idleThreshold / 60) + ' mins)',
          url: '',
          domain: '',
          category: 'Idle Time',
          impact: 'Idle Time',
          rating: 0,
          activity_type: 'IDLE',
          start_time: formattedNow,
          start_epoch: nowEpoch,
          end_time: formattedNow,
          end_epoch: nowEpoch,
          duration_seconds: 1,
          duration_formatted: '00:00:01'
        };

        this.db.upsertActiveSession(this.currentSession);
        this.emit('state-change', this.getCurrentState());
        return;
      } else if (!isUserIdle && this.isIdle) {
        this.isIdle = false;
        this.closeCurrentSession(formattedNow, nowEpoch);
      }

      if (this.isIdle) {
        this.updateOngoingSession(formattedNow, nowEpoch);
        this.emit('tick', this.getCurrentState());
        return;
      }

      // Active foreground window
      let processName = (sample.process || '').trim();
      let windowTitle = (sample.title || '').trim();
      const url = (sample.url || '').trim();
      const domain = (sample.domain || '').trim();

      // If no process name detected but window title exists, infer from title
      if (!processName && windowTitle) {
        processName = 'Active Window';
      }

      // If no process detected yet, wait for next sample
      if (!processName && !this.currentSession) {
        return;
      }

      const hasChanged = !this.currentSession ||
        this.currentSession.activity_type !== 'TOS' ||
        (processName && this.currentSession.process_name !== processName) ||
        (windowTitle && this.currentSession.window_title !== windowTitle) ||
        (url && this.currentSession.url !== url);

      if (hasChanged && processName) {
        // Close previous session
        this.closeCurrentSession(formattedNow, nowEpoch);

        // Classify the new activity
        const classification = this.categorizer.classify({
          process: processName,
          title: windowTitle,
          url,
          domain
        });

        // Start new session
        this.currentSession = {
          id: 'sess_' + nowEpoch + '_' + Math.floor(Math.random() * 1000),
          date: formattedNow.split(' ')[0],
          tool_name: classification.tool,
          process_name: processName,
          process_path: sample.path || '',
          window_title: windowTitle || classification.tool,
          url: url,
          domain: domain,
          category: classification.category,
          impact: classification.impact,
          rating: classification.rating,
          activity_type: 'TOS',
          start_time: formattedNow,
          start_epoch: nowEpoch,
          end_time: formattedNow,
          end_epoch: nowEpoch,
          duration_seconds: 1,
          duration_formatted: '00:00:01'
        };

        // Immediately save a 1-second record so tables & dashboards display it immediately
        this.db.upsertActiveSession(this.currentSession);
        this.emit('state-change', this.getCurrentState());
      } else if (this.currentSession) {
        // Same session continues: update duration live
        this.updateOngoingSession(formattedNow, nowEpoch);
        this.emit('tick', this.getCurrentState());
      }
    } catch (err) {
      console.error('[WatcherService] Sample processing exception:', err);
    }
  }

  updateOngoingSession(formattedNow, nowEpoch) {
    if (!this.currentSession) return;
    this.currentSession.end_time = formattedNow;
    this.currentSession.end_epoch = nowEpoch;
    this.currentSession.duration_seconds = Math.max(1, Math.round((nowEpoch - this.currentSession.start_epoch) / 1000));
    this.currentSession.duration_formatted = this.db.formatDuration(this.currentSession.duration_seconds);

    // Periodically update session record in database
    this.db.upsertActiveSession(this.currentSession);
  }

  closeCurrentSession(formattedEnd, endEpoch) {
    if (!this.currentSession) return;

    this.currentSession.end_time = formattedEnd;
    this.currentSession.end_epoch = endEpoch;
    this.currentSession.duration_seconds = Math.max(1, Math.round((endEpoch - this.currentSession.start_epoch) / 1000));
    this.currentSession.duration_formatted = this.db.formatDuration(this.currentSession.duration_seconds);

    if (this.currentSession.duration_seconds >= 1) {
      this.db.finalizeActiveSession(this.currentSession);
    }

    this.currentSession = null;
  }

  getCurrentState() {
    const now = new Date();
    const nowEpoch = now.getTime();
    let currentDurationSec = 0;

    if (this.currentSession) {
      currentDurationSec = Math.max(0, Math.round((nowEpoch - this.currentSession.start_epoch) / 1000));
    }

    let statusText = 'Online';
    if (this.isPaused) {
      statusText = 'Paused';
    } else if (this.isIdle) {
      statusText = 'Idle';
    }

    return {
      status: statusText,
      isIdle: this.isIdle,
      isPaused: this.isPaused,
      currentTool: this.isPaused ? 'Tracking Paused' : (this.currentSession ? this.currentSession.tool_name : 'Tracking...'),
      currentProcess: this.isPaused ? '' : (this.currentSession ? this.currentSession.process_name : ''),
      currentTitle: this.isPaused ? 'Tracker is currently paused' : (this.currentSession ? this.currentSession.window_title : 'Active'),
      currentCategory: this.currentSession ? this.currentSession.category : '',
      currentImpact: this.currentSession ? this.currentSession.impact : '',
      currentStartTime: this.currentSession ? this.currentSession.start_time : '--:--',
      currentDurationFormatted: this.db.formatDuration(currentDurationSec),
      currentDurationSeconds: currentDurationSec,
      sensorAlive: (Date.now() - this.lastSampleTime) < 5000
    };
  }

  stop() {
    this.isRunning = false;
    const now = new Date();
    this.closeCurrentSession(this.db.formatDate(now), now.getTime());

    if (this.process) {
      try {
        this.process.kill();
      } catch (err) {}
      this.process = null;
    }
  }
}

module.exports = WatcherService;
