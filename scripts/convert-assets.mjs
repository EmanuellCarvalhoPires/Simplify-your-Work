import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.resolve(__dirname, '../public/assets');
const buildDir = path.resolve(__dirname, '../build');

async function convertSvgToPng(svgFileName, pngFileName, width, height) {
  const svgPath = path.join(assetsDir, svgFileName);
  const pngPath = path.join(assetsDir, pngFileName);

  const svgBuffer = fs.readFileSync(svgPath);
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  fs.writeFileSync(pngPath, pngBuffer);
  console.log(`[OK] Generated ${pngFileName} (${width}x${height || width}px)`);
  return pngBuffer;
}

async function main() {
  console.log('Converting SVG assets to PNG and ICO...');

  // Ensure build directory exists
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // 1. logo-symbol.svg -> app-icon.png (512x512)
  const appIconBuffer = await convertSvgToPng('logo-symbol.svg', 'app-icon.png', 512, 512);

  // Generate PNGs at standard sizes for multi-resolution ICO generation
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoPngPaths = [];

  for (const size of icoSizes) {
    const tmpPngName = `app-icon-${size}.png`;
    await convertSvgToPng('logo-symbol.svg', tmpPngName, size, size);
    icoPngPaths.push(path.join(assetsDir, tmpPngName));
  }

  // 2. logo-symbol.svg -> tray-icon.png (32x32)
  const trayIconBuffer = await convertSvgToPng('logo-symbol.svg', 'tray-icon.png', 32, 32);

  // 3. jira-badge.svg -> jira-badge.png (64x64)
  await convertSvgToPng('jira-badge.svg', 'jira-badge.png', 64, 64);

  // 4. app-badge.svg -> app-badge.png (64x64)
  await convertSvgToPng('app-badge.svg', 'app-badge.png', 64, 64);

  // 5. logo-full.svg -> logo-full.png (800x200)
  await convertSvgToPng('logo-full.svg', 'logo-full.png', 800, 200);

  // 6. Convert PNGs to multi-resolution app-icon.ico
  try {
    const icoBuffer = await pngToIco(icoPngPaths);
    const icoPath = path.join(assetsDir, 'app-icon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    console.log('[OK] Generated multi-resolution app-icon.ico successfully!');

    // Copy to build folder for electron-builder buildResources
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
    fs.writeFileSync(path.join(buildDir, 'installerIcon.ico'), icoBuffer);
    fs.writeFileSync(path.join(buildDir, 'uninstallerIcon.ico'), icoBuffer);
    fs.copyFileSync(path.join(assetsDir, 'app-icon.png'), path.join(buildDir, 'icon.png'));
    console.log('[OK] Copied icon assets to build/ directory!');

    // Cleanup temporary resolution PNGs
    for (const p of icoPngPaths) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  } catch (err) {
    console.error('Error generating ICO file:', err);
  }
}

main().catch((err) => {
  console.error('Conversion failed:', err);
  process.exit(1);
});
