const fs = require('fs');
const path = require('path');

const metroPath = 'metro.config.js';
let config = fs.readFileSync(metroPath, 'utf8');

// Fix 1: strip react-native-worklets/ prefix to avoid double-path bug
// Module name already includes "react-native-worklets/" but the resolver
// joins it under workletsPackageDir, creating a double-nested path
config = config.replace(
  "path.join(workletsPackageDir, moduleName)",
  "path.join(workletsPackageDir, moduleName.replace('react-native-worklets/', ''))"
);

// Fix 2: create placeholder file when .worklets file doesn't exist yet
// Metro resolves imports before transforming, but the babel plugin only
// generates worklet files during transform. On clean builds, the files
// don't exist yet, causing SHA-1 errors. Create a dummy that gets
// overwritten by the babel plugin during transform.
config = config.replace(
  'return { type: "sourceFile", filePath: fullModuleName };',
  `if (!fs.existsSync(fullModuleName)) {
    fs.mkdirSync(path.dirname(fullModuleName), { recursive: true });
    fs.writeFileSync(fullModuleName, 'export default function __w() {}');
  }
  return { type: "sourceFile", filePath: fullModuleName };`
);

// Ensure .worklets directory exists
fs.mkdirSync('node_modules/react-native-worklets/.worklets', { recursive: true });

fs.writeFileSync(metroPath, config);
console.log('Worklets CI fix applied');
