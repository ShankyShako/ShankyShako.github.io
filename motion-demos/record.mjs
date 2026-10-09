// Run: `npm run build && npx vite preview --port 4173`, then `PLAYWRIGHT_DIR=<dir with node_modules/playwright> [CHROMIUM=<chrome path>] node motion-demos/record.mjs [name…]` — Playwright is installed outside this project on purpose.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(
  require.resolve('playwright', { paths: [process.env.PLAYWRIGHT_DIR ?? process.cwd()] }),
);

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const OUT = dirname(fileURLToPath(import.meta.url));
const DESKTOP = { width: 1440, height: 900 };

/* Headless video has no pointer, so draw one, plus a caption saying what the
   current step is showing. Both sit above everything and take no input. */
const overlay = () => {
  const mount = () => {
    if (document.getElementById('__demo-cursor')) return;
    const c = document.createElement('div');
    c.id = '__demo-cursor';
    c.style.cssText =
      'position:fixed;left:-40px;top:-40px;width:18px;height:18px;margin:-9px 0 0 -9px;' +
      'border-radius:50%;background:rgba(255,255,255,.85);border:2px solid #111;' +
      'box-shadow:0 0 0 2px rgba(255,255,255,.5);z-index:2147483647;pointer-events:none;' +
      'transition:transform 90ms ease-out,background 90ms ease-out';
    const l = document.createElement('div');
    l.id = '__demo-label';
    l.style.cssText =
      'position:fixed;left:16px;bottom:16px;max-width:calc(100% - 32px);padding:8px 14px;' +
      'border-radius:8px;background:rgba(0,0,0,.78);color:#fff;font:600 15px/1.35 system-ui,sans-serif;' +
      'z-index:2147483646;pointer-events:none;opacity:0';
    document.body.append(c, l);
  };
  addEventListener('mousemove', (e) => {
    const c = document.getElementById('__demo-cursor');
    if (c) { c.style.left = `${e.clientX}px`; c.style.top = `${e.clientY}px`; }
  }, true);
  addEventListener('mousedown', () => {
    const c = document.getElementById('__demo-cursor');
    if (c) { c.style.transform = 'scale(.7)'; c.style.background = '#ff5a5a'; }
  }, true);
  addEventListener('mouseup', () => {
    const c = document.getElementById('__demo-cursor');
    if (c) { c.style.transform = ''; c.style.background = 'rgba(255,255,255,.85)'; }
  }, true);
  window.__label = (t) => {
    mount();
    const l = document.getElementById('__demo-label');
    l.textContent = t;
    l.style.opacity = t ? '1' : '0';
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', mount);
  else mount();
};

const label = (page, t) => page.evaluate((s) => window.__label?.(s), t);
const wait = (page, ms) => page.waitForTimeout(ms);

/** Every animation on the page's timeline (CSS and Web Animations) at `rate`. */
async function playbackRate(page, rate) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: rate });
}

async function center(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function moveTo(page, selector, steps = 18) {
  const { x, y } = await center(page, selector);
  await page.mouse.move(x, y, { steps });
  return { x, y };
}

async function press(page, holdMs = 350) {
  await page.mouse.down();
  await wait(page, holdMs);
  await page.mouse.up();
}

/* ------------------------------------------------------------------------ */

async function shopPressAndModal(page) {
  await page.goto(`${BASE}/shop`);
  await page.waitForSelector('.product');
  await page.mouse.move(700, 120);
  await wait(page, 900);

  await label(page, 'Hover: card lifts (pointer: fine only)');
  await moveTo(page, '.product >> nth=0', 24);
  await wait(page, 900);
  await label(page, 'Press: card gives to 0.97 and keeps its lift');
  await press(page, 450);
  await label(page, 'Modal: backdrop fades, box scales in, "Too late." stamps');
  await wait(page, 1600);
  await label(page, 'Close with ×: reverse at 180ms, then unmount');
  await moveTo(page, '.modal-close', 16);
  await wait(page, 300);
  await press(page, 120);
  await wait(page, 1100);

  await label(page, 'Open another one…');
  await moveTo(page, '.product >> nth=1', 20);
  await wait(page, 500);
  await press(page, 300);
  await wait(page, 1500);
  await label(page, 'Close with Escape');
  await page.keyboard.press('Escape');
  await wait(page, 1100);

  await label(page, 'Same again at 0.25× speed');
  await playbackRate(page, 0.25);
  await moveTo(page, '.product >> nth=2', 20);
  await wait(page, 1200);
  await press(page, 1200);
  await wait(page, 3200);
  /* The real close unmounts on a 250ms wall-clock fallback if animationend is
     late, which at 0.25× it always is. So play the exit keyframes on their own
     by setting the attribute React would, then close for real. */
  await label(page, 'Exit keyframes at 0.25× (attribute set directly, so the 250ms fallback cannot cut it)');
  await page.evaluate(() => document.querySelector('.modal-overlay')?.setAttribute('data-closing', 'true'));
  await wait(page, 1600);
  await page.keyboard.press('Escape');
  await wait(page, 900);
  await label(page, '');
  await wait(page, 300);
}

async function experienceDeckRail(page) {
  await page.goto(`${BASE}/experience`);
  await page.waitForSelector('.deck-rail');
  await page.mouse.move(720, 450);
  /* Let the intro cascade and the floor finish. */
  await wait(page, 3200);
  /* Wheel to exactly where each role sits. A headless wheel tick lands in one
     jump, and a jump that ends past the next role's threshold skips a role. */
  const toRole = async (i) => {
    const delta = await page.evaluate((n) => {
      const el = document.querySelector('.deck-scroller');
      const step = parseFloat(getComputedStyle(el).getPropertyValue('--deck-step')) || 120;
      return el.getBoundingClientRect().top + n * step;
    }, i);
    await page.mouse.wheel(0, delta);
  };

  await label(page, 'Scroll: the active rail tick scales out (transform, not width)');
  for (let i = 1; i <= 5; i++) {
    await toRole(i);
    await wait(page, 1300);
  }
  await label(page, 'And back up');
  for (let i = 4; i >= 2; i--) {
    await toRole(i);
    await wait(page, 1300);
  }
  await label(page, 'Same at 0.25× speed');
  await playbackRate(page, 0.25);
  await toRole(1);
  await wait(page, 2800);
  await toRole(2);
  await wait(page, 2800);
  await label(page, '');
  await wait(page, 300);
}

async function experienceTimeline(page) {
  await page.goto(`${BASE}/experience`);
  await page.waitForSelector('.experience-item');
  await page.mouse.move(650, 80);
  await wait(page, 1500);

  await label(page, 'Hover a role: node on the rail lights up, card nudges 4px');
  const items = await page.locator('.experience-item').count();
  for (let i = 0; i < Math.min(items, 4); i++) {
    const item = page.locator('.experience-item').nth(i);
    /* The cards are taller than half this viewport; bring each one in first. */
    await item.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    await wait(page, 700);
    await moveTo(page, `.experience-item >> nth=${i}`, 22);
    await wait(page, 1300);
  }
  await page.mouse.move(690, 860, { steps: 14 });
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(page, 1100);

  await label(page, 'Arriving from a #link: the target card flashes and its node glows');
  const id = await page.locator('.experience-item').nth(3).getAttribute('id');
  await page.evaluate((h) => { location.hash = h; }, id);
  await wait(page, 3200);
  await label(page, '');
  await wait(page, 300);
}

async function petGrabAndLand(page) {
  const isFrame = (k) => page.waitForFunction(
    (key) => document.querySelector('.pet-frame')?.getAttribute('src')?.endsWith(`/${key}.png`),
    k,
    { polling: 'raf', timeout: 20_000 },
  );

  await page.goto(`${BASE}/`);
  await page.waitForSelector('.pet-hit');
  await page.mouse.move(1100, 300);
  await wait(page, 1200);

  await label(page, 'Poke the bag in the corner: he falls in');
  await moveTo(page, '.pet-hit', 20);
  await wait(page, 300);
  await press(page, 120);
  await page.mouse.move(1000, 420, { steps: 20 });
  await isFrame('land');
  await label(page, 'Lands: squash (1.12 × 0.86), rebound, settle');
  await wait(page, 1800);

  const frameIs = (k) => page.evaluate(
    (key) => document.querySelector('.pet-frame')?.getAttribute('src')?.endsWith(`/${key}.png`),
    k,
  );

  const grabAndDrop = async (holdMs) => {
    /* He wanders, and hovering him strikes a pose that moves his hit box, so
       aim again until the press actually picks him up. */
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 6; attempt++) {
      await moveTo(page, '.pet-hit', 14);
      await wait(page, 200);
      ({ x, y } = await center(page, '.pet-hit'));
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y - 12, { steps: 2 });
      if (await frameIs('drag')) break;
      await page.mouse.up();
      await wait(page, 600);
    }
    /* Slowly enough that the release is a drop, not a throw. */
    for (let i = 2; i <= 30; i++) {
      await page.mouse.move(x, y - i * 12);
      await wait(page, 16);
    }
    await wait(page, holdMs);
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(x, y - 360 + (i % 2));
      await wait(page, 30);
    }
    await page.mouse.up();
    await page.mouse.move(x + 160, y - 200, { steps: 10 });
    await isFrame('land');
  };

  await label(page, 'Grab him: quick stretch on pick-up; drop: squash on landing');
  await grabAndDrop(700);
  await wait(page, 1600);

  await label(page, 'Same at 0.25× (the whole page clock, fall included)');
  await playbackRate(page, 0.25);
  await grabAndDrop(1400);
  await wait(page, 2600);
  await label(page, '');
  await wait(page, 300);
}

async function reducedMotion(page) {
  await page.goto(`${BASE}/`);
  await page.waitForSelector('nav a[href="/shop"]');
  await page.mouse.move(700, 450);
  await wait(page, 1200);

  await label(page, 'prefers-reduced-motion: route change is a plain fade, no rise');
  await moveTo(page, 'nav a[href="/shop"]', 18);
  await press(page, 120);
  await wait(page, 1500);

  await label(page, 'Card: no lift, no press-scale; modal and stamp fade only');
  await moveTo(page, '.product >> nth=0', 20);
  await wait(page, 700);
  await press(page, 300);
  await wait(page, 1600);
  await label(page, 'Close: unmounts at once, no exit animation');
  await moveTo(page, '.modal-close', 14);
  await press(page, 120);
  await wait(page, 1000);

  await label(page, 'Same at 0.25× speed');
  await playbackRate(page, 0.25);
  await moveTo(page, 'nav a[href="/contact"]', 18);
  await press(page, 120);
  await wait(page, 2400);
  await moveTo(page, 'nav a[href="/shop"]', 18);
  await press(page, 120);
  await wait(page, 2400);
  await moveTo(page, '.product >> nth=1', 20);
  await press(page, 300);
  await wait(page, 3000);
  await page.keyboard.press('Escape');
  await wait(page, 1000);
  await label(page, '');
  await wait(page, 300);
}

/* ------------------------------------------------------------------------ */

const DEMOS = {
  'shop-press-and-modal': { run: shopPressAndModal },
  'experience-deck-rail': {
    run: experienceDeckRail,
    /* The rail is 70px wide on a 1440px page; the .mp4 carries a 2.6× inset of it. */
    mp4Filter:
      '[0:v]split[a][b];[b]crop=170:250:1120:430,scale=442:650,drawbox=c=white@0.6:t=3[z];' +
      '[a][z]overlay=24:150,scale=1280:-2',
  },
  'experience-timeline': { run: experienceTimeline, viewport: { width: 700, height: 900 } },
  'pet-grab-and-land': { run: petGrabAndLand },
  'reduced-motion': { run: reducedMotion, reducedMotion: 'reduce' },
};

function hasFfmpeg() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; }
}

const only = process.argv.slice(2);
const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
);
const ffmpeg = hasFfmpeg();

for (const [name, demo] of Object.entries(DEMOS)) {
  if (only.length && !only.includes(name)) continue;
  const viewport = demo.viewport ?? DESKTOP;
  const dir = mkdtempSync(join(tmpdir(), 'motion-demo-'));
  const context = await browser.newContext({
    viewport,
    reducedMotion: demo.reducedMotion ?? 'no-preference',
    recordVideo: { dir, size: viewport },
  });
  await context.addInitScript(overlay);
  const page = await context.newPage();
  process.stdout.write(`${name}… `);
  try {
    await demo.run(page);
  } finally {
    await context.close();
  }
  const [file] = readdirSync(dir).filter((f) => f.endsWith('.webm'));
  const webm = join(OUT, `${name}.webm`);
  renameSync(join(dir, file), webm);
  rmSync(dir, { recursive: true, force: true });

  if (ffmpeg) {
    const mp4 = join(OUT, `${name}.mp4`);
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', webm,
      ...(demo.mp4Filter ? ['-filter_complex', demo.mp4Filter] : ['-vf', `scale=${Math.min(viewport.width, 1280)}:-2`]),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow',
      '-movflags', '+faststart', '-an', mp4,
    ]);
  }
  const sizes = [webm, ...(ffmpeg ? [webm.replace(/\.webm$/, '.mp4')] : [])]
    .filter(existsSync)
    .map((f) => `${f.split('/').pop()} ${(statSync(f).size / 1e6).toFixed(1)}MB`);
  console.log(sizes.join(', '));
}

await browser.close();
