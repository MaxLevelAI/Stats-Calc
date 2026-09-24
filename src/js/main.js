import { initKeypad } from './keypad.js';
import { dispatch, current, popView, currentModal } from './screen.js';
import { goHome } from './home.js';
import { toggleScratchpad } from './scratchpad.js';
import { openDocMenu, openPageSorter } from './docui.js';
import * as D from './doc.js';

/* ------------------------- global key routing ------------------------- */

function onKey(ev) {
  // Keys the operating system owns, handled before the active view sees them.
  if (ev.id === 'on' && !ev.ctrl) { goHome(); return; }
  if (ev.id === 'scratchpad' && !ev.ctrl) { toggleScratchpad(); return; }

  // Document navigation, available from any page but not over a modal.
  if (!currentModal()) {
    if (ev.id === 'doc') { openDocMenu(); return; }
    if (ev.ctrl && ev.id === 'left') { D.step(-1); return; }
    if (ev.ctrl && ev.id === 'right') { D.step(1); return; }
    if (ev.ctrl && ev.id === 'up' && D.page()) { openPageSorter(); return; }
  }

  if (ev.id === 'esc' && current()?.id === 'home') return;

  dispatch(ev);
}

/* ------------------------- viewport scaling ------------------------- */

const DEV_W = 843;
const DEV_H = 1850;
let zoom = null; // null = auto-fit

function applyScale() {
  const dev = document.getElementById('device');
  const pad = 24;
  const fit = Math.min((window.innerWidth - pad) / DEV_W, (window.innerHeight - pad) / DEV_H);
  const s = zoom ?? fit;
  dev.style.transform = `translate(-50%, -50%) scale(${s})`;
  const label = document.getElementById('hud-state');
  if (label) label.textContent = `${Math.round(s * 100)}%`;
}

function initHud() {
  document.getElementById('hud').addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    const dev = document.getElementById('device');
    const cur = parseFloat((dev.style.transform.match(/scale\(([\d.]+)\)/) || [])[1] || 1);
    if (act === 'zoom-in') zoom = Math.min(cur * 1.15, 3);
    if (act === 'zoom-out') zoom = Math.max(cur / 1.15, 0.15);
    if (act === 'fit') zoom = null;
    applyScale();
  });
  window.addEventListener('resize', applyScale);
}

/* ------------------------- boot ------------------------- */

initKeypad(onKey);
initHud();
goHome();
applyScale();
