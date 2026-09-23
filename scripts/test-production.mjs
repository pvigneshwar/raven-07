import { spawn } from 'node:child_process';

const preview = spawn(process.execPath,
  ['./node_modules/vite/bin/vite.js', 'preview', '--port', '5176', '--strictPort'],
  { stdio: 'ignore', windowsHide: true });

async function waitForPreview() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (preview.exitCode !== null) throw new Error('Production preview exited before becoming ready');
    try {
      const response = await fetch('http://localhost:5176/');
      if (response.ok) return;
    } catch { /* Still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Production preview did not become ready');
}

try {
  await waitForPreview();
  const tests = spawn(process.execPath,
    ['./node_modules/playwright/cli.js', 'test', '-c', 'playwright.production.config.ts'],
    { stdio: 'inherit', windowsHide: true });
  const exitCode = await new Promise((resolve, reject) => {
    tests.once('error', reject);
    tests.once('exit', (code) => resolve(code ?? 1));
  });
  process.exitCode = exitCode;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  preview.kill();
}
