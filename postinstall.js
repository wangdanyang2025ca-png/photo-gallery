const fs = require('fs');
const path = require('path');

const binDir = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin');
fs.mkdirSync(binDir, { recursive: true });

const serverPath = path.join(__dirname, 'server.js');
const script = `#!/usr/bin/env node\nrequire(${JSON.stringify(serverPath)});\n`;

const nextBin = path.join(binDir, 'next');
fs.writeFileSync(nextBin, script, 'utf8');
fs.chmodSync(nextBin, 0o755);
console.log('next -> server.js ready');
