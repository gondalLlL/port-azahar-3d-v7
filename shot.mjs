import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

async function main() {
  mkdirSync('screenshots', { recursive: true });

  // Start server
  const server = spawn('node', ['serve.ts', '--port', '8124'], { stdio: 'inherit' });
  await new Promise(r => setTimeout(r, 1500));

  const shotsData = JSON.parse(readFileSync('shots.json', 'utf8'));
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  const summary = { shots: [], errors: [] };

  for (const shot of shotsData) {
    const url = `http://127.0.0.1:8124/${shot.query}`;
    console.log(`Capturing shot: ${shot.name} at ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });

    try {
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 10000 });
    } catch (e) {
      console.warn(`Timeout waiting for __shotReady on ${shot.name}:`, e.message);
    }

    // Wait a brief moment for render stability
    await page.waitForTimeout(500);

    const outPath = join('screenshots', shot.name);
    let quality = 80;
    await page.screenshot({ path: outPath, type: 'jpeg', quality });

    let stats = statSync(outPath);
    if (stats.size > 262144) {
      console.log(`Shot ${shot.name} size ${stats.size} > 262144 bytes, retrying at quality 60...`);
      quality = 60;
      await page.screenshot({ path: outPath, type: 'jpeg', quality });
      stats = statSync(outPath);
    }

    summary.shots.push({ name: shot.name, size: stats.size });
  }

  // Load plain game once
  console.log('Loading plain game...');
  await page.goto('http://127.0.0.1:8124/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  summary.errors = errors;

  console.log('Verification Summary:', JSON.stringify(summary, null, 2));

  await browser.close();
  server.kill();
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Shot capture failed:', err);
  process.exit(1);
});
