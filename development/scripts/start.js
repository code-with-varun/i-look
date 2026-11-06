const { spawn } = require('child_process');
const path = require('path');

// Crucial: remove ELECTRON_RUN_AS_NODE so Electron runs as a desktop GUI app, not plain Node
delete process.env.ELECTRON_RUN_AS_NODE;

const electronExe = path.resolve(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
const appRoot = path.resolve(__dirname, '..');

console.log('🚀 Launching i-Look Tracker...');
const child = spawn(electronExe, [appRoot], {
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  console.log(`i-Look process closed with code ${code}`);
  process.exit(code || 0);
});

