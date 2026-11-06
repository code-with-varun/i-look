const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcFile = path.join(projectRoot, 'src', 'native', 'watcher.cs');
const binDir = path.join(projectRoot, 'bin');
const outFile = path.join(binDir, 'i-look-watcher.exe');

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

// Find csc.exe in standard .NET Framework locations
const cscCandidates = [
  'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
  'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe'
];

const cscPath = cscCandidates.find(p => fs.existsSync(p)) || 'csc.exe';

// Reference UIAutomation DLLs located in WPF directory
const frameworkDir = path.dirname(cscPath);
const wpfDir = path.join(frameworkDir, 'WPF');
const uiaClient = path.join(wpfDir, 'UIAutomationClient.dll');
const uiaTypes = path.join(wpfDir, 'UIAutomationTypes.dll');

console.log(`Compiling watcher using: ${cscPath}`);
console.log(`Source: ${srcFile}`);
console.log(`Output: ${outFile}`);

try {
  let references = '';
  if (fs.existsSync(uiaClient) && fs.existsSync(uiaTypes)) {
    references = `/r:"${uiaClient}" /r:"${uiaTypes}"`;
  }

  const cmd = `"${cscPath}" /target:exe /platform:anycpu /optimize+ ${references} /out:"${outFile}" "${srcFile}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log('✅ Successfully compiled i-look-watcher.exe!');
} catch (err) {
  console.error('❌ Failed to compile watcher:', err.message);
  process.exit(1);
}
