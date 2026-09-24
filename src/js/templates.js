// The expression-template palette, opened by the templates key.
//
// Contents and order follow the "Expression Templates" section that opens the
// CAS Reference Guide, including the key shortcut TI prints for each one.

import { setModal, clearModal, refresh } from './screen.js';
import { row, rowOf, ch, render, grid } from './mathedit.js';

const r = () => row();

export const TEMPLATES = [
  { id: 'frac', keys: 'ctrl ÷', make: () => ({ t: 'frac', num: r(), den: r() }) },
  { id: 'sup', keys: '^', make: () => ({ t: 'sup', exp: r() }) },
  { id: 'sqrt', keys: 'ctrl x²', make: () => ({ t: 'sqrt', rad: r() }) },
  { id: 'nthroot', keys: 'ctrl ^', make: () => ({ t: 'nthroot', idx: r(), rad: r() }) },
  { id: 'expE', keys: 'e^x', make: () => ({ t: 'expE', exp: r() }) },
  { id: 'log', keys: 'ctrl 10^x', make: () => ({ t: 'log', base: r(), arg: r() }) },

  { id: 'piece2', make: () => grid('piecewise', 2, 2) },
  { id: 'pieceN', make: () => grid('piecewise', 3, 2) },
  { id: 'system2', make: () => grid('system', 2, 1) },
  { id: 'systemN', make: () => grid('system', 3, 1) },

  { id: 'abs', make: () => ({ t: 'abs', body: r() }) },
  { id: 'dms', make: () => ({ t: 'dms', dd: r(), mm: r(), ss: r() }) },

  { id: 'mat22', make: () => grid('matrix', 2, 2) },
  { id: 'mat12', make: () => grid('matrix', 1, 2) },
  { id: 'mat21', make: () => grid('matrix', 2, 1) },
  { id: 'matmn', make: () => grid('matrix', 3, 3) },

  { id: 'sum', make: () => ({ t: 'sum', var: rowOf('n'), lo: rowOf('1'), hi: r(), body: r() }) },
  { id: 'prod', make: () => ({ t: 'prod', var: rowOf('n'), lo: rowOf('1'), hi: r(), body: r() }) },

  { id: 'deriv', make: () => ({ t: 'deriv', var: rowOf('x'), body: r() }) },
  { id: 'deriv2', make: () => ({ t: 'derivN', ord: rowOf('2'), var: rowOf('x'), body: r() }) },
  { id: 'derivN', make: () => ({ t: 'derivN', ord: r(), var: rowOf('x'), body: r() }) },

  { id: 'integral', make: () => ({ t: 'integral', lo: r(), hi: r(), body: r(), var: rowOf('x') }) },
  { id: 'integralInd', make: () => ({ t: 'integralInd', body: r(), var: rowOf('x') }) },
  { id: 'limit', make: () => ({ t: 'limit', var: rowOf('x'), to: r(), body: r() }) },
];

// A filled-in miniature so each cell in the palette reads at a glance.
const PREVIEW = {
  frac: () => ({ t: 'frac', num: rowOf('□'), den: rowOf('□') }),
  sup: () => row([ch('□'), { t: 'sup', exp: rowOf('□') }]),
  sqrt: () => ({ t: 'sqrt', rad: rowOf('□') }),
  nthroot: () => ({ t: 'nthroot', idx: rowOf('□'), rad: rowOf('□') }),
  expE: () => ({ t: 'expE', exp: rowOf('□') }),
  log: () => ({ t: 'log', base: rowOf('□'), arg: rowOf('□') }),
  abs: () => ({ t: 'abs', body: rowOf('□') }),
  dms: () => ({ t: 'dms', dd: rowOf('□'), mm: rowOf('□'), ss: rowOf('□') }),
  sum: () => ({ t: 'sum', var: rowOf('n'), lo: rowOf('□'), hi: rowOf('□'), body: rowOf('□') }),
  prod: () => ({ t: 'prod', var: rowOf('n'), lo: rowOf('□'), hi: rowOf('□'), body: rowOf('□') }),
  deriv: () => ({ t: 'deriv', var: rowOf('x'), body: rowOf('□') }),
  deriv2: () => ({ t: 'derivN', ord: rowOf('2'), var: rowOf('x'), body: rowOf('□') }),
  derivN: () => ({ t: 'derivN', ord: rowOf('n'), var: rowOf('x'), body: rowOf('□') }),
  integral: () => ({ t: 'integral', lo: rowOf('□'), hi: rowOf('□'), body: rowOf('□'), var: rowOf('x') }),
  integralInd: () => ({ t: 'integralInd', body: rowOf('□'), var: rowOf('x') }),
  limit: () => ({ t: 'limit', var: rowOf('x'), to: rowOf('□'), body: rowOf('□') }),
};

function previewHtml(tpl) {
  const node = PREVIEW[tpl.id] ? PREVIEW[tpl.id]() : tpl.make();
  const wrapped = node.t === 'row' ? node : row([node]);
  return render(wrapped, null);
}

const COLS = 4;

/** Open the palette; `onPick` receives a freshly built template node. */
export function openTemplates(onPick) {
  let sel = 0;

  setModal({
    id: 'templates',

    mount(host) {
      const cells = TEMPLATES
        .map((tpl, i) =>
          `<div class="tp-cell${i === sel ? ' sel' : ''}" data-i="${i}">${previewHtml(tpl)}</div>`)
        .join('');
      const keys = TEMPLATES[sel].keys;
      host.innerHTML =
        '<div class="tp-panel">' +
        `<div class="tp-grid">${cells}</div>` +
        `<div class="tp-foot">${keys ? `shortcut: ${keys}` : '&nbsp;'}</div>` +
        '</div>';

      host.addEventListener('mousedown', (e) => {
        const cell = e.target.closest('[data-i]');
        if (!cell) return;
        sel = Number(cell.dataset.i);
        choose();
      });

      const node = host.querySelector('.tp-cell.sel');
      if (node) node.scrollIntoView({ block: 'nearest' });
    },

    onKey(ev) {
      const { id } = ev;
      if (id === 'esc' || id === 'templ') { clearModal(); return true; }
      if (id === 'right') { sel = Math.min(sel + 1, TEMPLATES.length - 1); refresh(); return true; }
      if (id === 'left') { sel = Math.max(sel - 1, 0); refresh(); return true; }
      if (id === 'down') { sel = Math.min(sel + COLS, TEMPLATES.length - 1); refresh(); return true; }
      if (id === 'up') { sel = Math.max(sel - COLS, 0); refresh(); return true; }
      if (id === 'enter' || id === 'click') return choose();
      return true;
    },
  });

  function choose() {
    const tpl = TEMPLATES[sel];
    clearModal();
    onPick(tpl.make());
    return true;
  }
}
