const sharp = require('./node_modules/sharp');
const path = require('path');
const fs = require('fs');

const iconSrc = "C:\\Users\\Ashok Chingari\\.gemini\\antigravity-ide\\brain\\ff716f4d-b372-43ce-bbd0-358e39bc5ba9\\splitmate_icon_1791046106421.jpg";
const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const sizes = [
  { folder: 'mipmap-mdpi',    size: 48  },
  { folder: 'mipmap-hdpi',    size: 72  },
  { folder: 'mipmap-xhdpi',   size: 96  },
  { folder: 'mipmap-xxhdpi',  size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

(async () => {
  for (const { folder, size } of sizes) {
    const outDir = path.join(resDir, folder);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    await sharp(iconSrc).resize(size, size).png().toFile(path.join(outDir, 'ic_launcher.png'));
    await sharp(iconSrc).resize(size, size).png().toFile(path.join(outDir, 'ic_launcher_round.png'));
    console.log(`✓ ${folder} (${size}x${size})`);
  }
  console.log('All icons generated!');
})();
