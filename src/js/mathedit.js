// Two-dimensional math entry.
//
// The entry line holds a tree rather than a string, so a fraction really is a
// numerator stacked over a denominator and the cursor can move into either
// one. `linearize()` turns the tree back into text for the engine.
//
//   { t:'row', items:[...] }   a horizontal slot -- the only container
//   { t:'ch', c:'x' }          one character
//   anything else              a template node whose slots are rows

export const row = (items = []) => ({ t: 'row', items });
export const ch = (c) => ({ t: 'ch', c });
export const rowOf = (text) => row([...String(text)].map(ch));

/* ============================== template table ============================== */

// slots        : the row-valued fields, in cursor order
// vertical     : up/down moves between slots (fractions, sums, integrals)
// render(r, n) : HTML, where r('slot') renders that slot and n is the node
// lin(l)       : linear text, where l('slot') linearises that slot

export const NODES = {
  frac: {
    slots: ['num', 'den'],
    vertical: true,
    render: (r) => `<span class="m-frac"><span class="m-num">${r('num')}</span><span class="m-den">${r('den')}</span></span>`,
    lin: (l) => `(${l('num')})/(${l('den')})`,
  },

  sup: {
    slots: ['exp'],
    render: (r) => `<span class="m-sup">${r('exp')}</span>`,
    lin: (l) => `^(${l('exp')})`,
  },

  sqrt: {
    slots: ['rad'],
    render: (r) => `<span class="m-sqrt"><span class="m-radsign">√</span><span class="m-radicand">${r('rad')}</span></span>`,
    lin: (l) => `sqrt(${l('rad')})`,
  },

  nthroot: {
    slots: ['idx', 'rad'],
    vertical: true,
    render: (r) => `<span class="m-sqrt"><span class="m-rootidx">${r('idx')}</span><span class="m-radsign">√</span><span class="m-radicand">${r('rad')}</span></span>`,
    lin: (l) => `root(${l('rad')},${l('idx')})`,
  },

  expE: {
    slots: ['exp'],
    render: (r) => `<span class="m-fn">ℯ</span><span class="m-sup">${r('exp')}</span>`,
    lin: (l) => `ℯ^(${l('exp')})`,
  },

  log: {
    slots: ['base', 'arg'],
    render: (r) => `<span class="m-fn">log</span><span class="m-sub">${r('base')}</span><span class="m-paren">(</span>${r('arg')}<span class="m-paren">)</span>`,
    lin: (l) => `log(${l('base')},${l('arg')})`,
  },

  abs: {
    slots: ['body'],
    render: (r) => `<span class="m-abs">${r('body')}</span>`,
    lin: (l) => `abs(${l('body')})`,
  },

  dms: {
    slots: ['dd', 'mm', 'ss'],
    render: (r) => `${r('dd')}<span class="m-unit">°</span>${r('mm')}<span class="m-unit">′</span>${r('ss')}<span class="m-unit">″</span>`,
    lin: (l) => `(${l('dd')}+(${l('mm')})/60+(${l('ss')})/3600)`,
  },

  sum: {
    slots: ['var', 'lo', 'hi', 'body'],
    vertical: true,
    render: (r) => bigOp('Σ', r),
    lin: (l) => `sum(seq(${l('body')},${l('var')},${l('lo')},${l('hi')}))`,
  },

  prod: {
    slots: ['var', 'lo', 'hi', 'body'],
    vertical: true,
    render: (r) => bigOp('Π', r),
    lin: (l) => `product(seq(${l('body')},${l('var')},${l('lo')},${l('hi')}))`,
  },

  integral: {
    slots: ['lo', 'hi', 'body', 'var'],
    vertical: true,
    render: (r) =>
      '<span class="m-bigop">' +
      `<span class="m-lim-top">${r('hi')}</span>` +
      '<span class="m-opsign m-int">∫</span>' +
      `<span class="m-lim-bot">${r('lo')}</span></span>` +
      `${r('body')}<span class="m-fn">d</span>${r('var')}`,
    lin: (l) => `integral(${l('body')},${l('var')},${l('lo')},${l('hi')})`,
  },

  integralInd: {
    slots: ['body', 'var'],
    render: (r) => `<span class="m-opsign m-int">∫</span>${r('body')}<span class="m-fn">d</span>${r('var')}`,
    lin: (l) => `integral(${l('body')},${l('var')})`,
  },

  deriv: {
    slots: ['var', 'body'],
    vertical: true,
    render: (r) =>
      '<span class="m-frac m-dfrac"><span class="m-num">d</span>' +
      `<span class="m-den">d${r('var')}</span></span>` +
      `<span class="m-paren">(</span>${r('body')}<span class="m-paren">)</span>`,
    lin: (l) => `derivative(${l('body')},${l('var')})`,
  },

  derivN: {
    slots: ['ord', 'var', 'body'],
    vertical: true,
    render: (r) =>
      '<span class="m-frac m-dfrac"><span class="m-num">d<sup>' + r('ord') + '</sup></span>' +
      `<span class="m-den">d${r('var')}<sup>${r('ord')}</sup></span></span>` +
      `<span class="m-paren">(</span>${r('body')}<span class="m-paren">)</span>`,
    lin: (l) => `derivative(${l('body')},${l('var')},${l('ord')})`,
  },

  // A Notes math box. `result` and `showResult` are filled in by the Notes
  // application after it evaluates the expression.
  mathbox: {
    slots: ['expr'],
    render: (r, n) =>
      '<span class="nt-mbox' + (n.active === false ? ' off' : '') + '">' +
      r('expr') +
      (n.showResult && n.result != null
        ? `<span class="nt-eq">${n.error ? '' : '='}</span><span class="nt-res${n.error ? ' err' : ''}">${n.result}</span>`
        : '') +
      '</span>',
    lin: (l) => l('expr'),
  },

  limit: {
    slots: ['var', 'to', 'body'],
    vertical: true,
    render: (r) =>
      '<span class="m-bigop"><span class="m-opsign m-lim">lim</span>' +
      `<span class="m-lim-bot">${r('var')}→${r('to')}</span></span>${r('body')}`,
    lin: (l) => `limit(${l('body')},${l('var')},${l('to')})`,
  },
};

function bigOp(sign, r) {
  return (
    '<span class="m-bigop">' +
    `<span class="m-lim-top">${r('hi')}</span>` +
    `<span class="m-opsign">${sign}</span>` +
    `<span class="m-lim-bot">${r('var')}=${r('lo')}</span></span>${r('body')}`
  );
}

/* ---------------- variable-size templates ---------------- */

/** Matrices, systems and piecewise all hold a grid of rows. */
export function grid(kind, rows, cols) {
  const cells = [];
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) cells.push(row());
  }
  return { t: kind, rows, cols, cells };
}

const GRID_KINDS = {
  matrix: {
    open: '[', close: ']',
    lin: (cells, rows, cols, l) => {
      const out = [];
      for (let i = 0; i < rows; i += 1) {
        out.push(`[${Array.from({ length: cols }, (_, j) => l(cells[i * cols + j])).join(',')}]`);
      }
      return `[${out.join(',')}]`;
    },
  },
  system: {
    open: '{', close: '',
    lin: (cells, rows, cols, l) => `system(${cells.map(l).join(',')})`,
  },
  piecewise: {
    open: '{', close: '',
    lin: (cells, rows, cols, l) => {
      const out = [];
      for (let i = 0; i < rows; i += 1) out.push(l(cells[i * cols]), l(cells[i * cols + 1]));
      return `piecewise(${out.join(',')})`;
    },
  },
};

export const isGrid = (n) => n && GRID_KINDS[n.t] !== undefined;

/* ============================== tree walking ============================== */

/** Every row in the tree, in cursor order, with its parent template node. */
export function allRows(node, parent = null, out = []) {
  if (node.t === 'row') {
    out.push({ row: node, parent });
    for (const it of node.items) allRows(it, node, out);
    return out;
  }
  if (isGrid(node)) {
    for (const c of node.cells) allRows(c, node, out);
    return out;
  }
  const def = NODES[node.t];
  if (def) for (const s of def.slots) allRows(node[s], node, out);
  return out;
}

const slotRows = (node) =>
  (isGrid(node) ? node.cells : (NODES[node.t]?.slots ?? []).map((s) => node[s]));

/* ============================== rendering ============================== */

const CURSOR = '<span class="m-caret"></span>';

export function render(root, cur) {
  return renderRow(root, cur);
}

function renderRow(r, cur) {
  let out = '';
  r.items.forEach((it, i) => {
    if (cur && cur.row === r && cur.i === i) out += CURSOR;
    out += renderNode(it, cur);
  });
  if (cur && cur.row === r && cur.i === r.items.length) out += CURSOR;
  return `<span class="m-row">${out || '<span class="m-slot"></span>'}</span>`;
}

function renderNode(n, cur) {
  if (n.t === 'ch') return `<span class="m-ch">${escapeChar(n.c)}</span>`;

  if (isGrid(n)) {
    const g = GRID_KINDS[n.t];
    let body = '';
    for (let i = 0; i < n.rows; i += 1) {
      body += '<span class="m-grow">';
      for (let j = 0; j < n.cols; j += 1) body += `<span class="m-gcell">${renderRow(n.cells[i * n.cols + j], cur)}</span>`;
      body += '</span>';
    }
    return `<span class="m-grid"><span class="m-brace">${g.open}</span><span class="m-gbody">${body}</span><span class="m-brace">${g.close}</span></span>`;
  }

  const def = NODES[n.t];
  if (!def) return '';
  return def.render((slot) => renderRow(n[slot], cur), n);
}

function escapeChar(c) {
  if (c === '&') return '&amp;';
  if (c === '<') return '&lt;';
  if (c === '>') return '&gt;';
  if (c === ' ') return '&nbsp;';
  return c;
}

/* ============================== linearisation ============================== */

export function linearize(node) {
  if (node.t === 'row') {
    return node.items.map(linearize).join('') || '';
  }
  if (node.t === 'ch') return node.c;
  if (isGrid(node)) {
    return GRID_KINDS[node.t].lin(node.cells, node.rows, node.cols, linearize);
  }
  const def = NODES[node.t];
  if (!def) return '';
  return def.lin((slot) => linearize(node[slot]) || '');
}

/* ============================== cursor movement ============================== */

export function moveLeft(root, cur) {
  if (cur.i > 0) {
    const prev = cur.row.items[cur.i - 1];
    // stepping left past a template drops into its last slot
    const inner = lastRowOf(prev);
    if (inner) return { row: inner, i: inner.items.length };
    return { row: cur.row, i: cur.i - 1 };
  }
  return exitTo(root, cur.row, -1);
}

export function moveRight(root, cur) {
  if (cur.i < cur.row.items.length) {
    const next = cur.row.items[cur.i];
    const inner = firstRowOf(next);
    if (inner) return { row: inner, i: 0 };
    return { row: cur.row, i: cur.i + 1 };
  }
  return exitTo(root, cur.row, 1);
}

function firstRowOf(node) {
  if (node.t === 'ch') return null;
  const rows = slotRows(node);
  return rows.length ? rows[0] : null;
}

function lastRowOf(node) {
  if (node.t === 'ch') return null;
  const rows = slotRows(node);
  return rows.length ? rows[rows.length - 1] : null;
}

/**
 * Leave the current row: into the neighbouring slot of the same template, or
 * out past the template itself. A row is only ever a template's slot (or the
 * root), so its owner is always a template node.
 */
function exitTo(root, r, dir) {
  const owner = ownerOf(root, r);
  if (!owner) return null; // r is the root row

  const rows = slotRows(owner);
  const k = rows.indexOf(r);
  if (dir < 0 && k > 0) { const t = rows[k - 1]; return { row: t, i: t.items.length }; }
  if (dir > 0 && k < rows.length - 1) return { row: rows[k + 1], i: 0 };

  const host = hostRowOf(root, owner);
  if (!host) return null;
  const idx = host.items.indexOf(owner);
  return { row: host, i: dir < 0 ? idx : idx + 1 };
}

/** The template node that holds `r` as one of its slots. */
function ownerOf(root, r) {
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    if (n.t === 'row') { for (const it of n.items) stack.push(it); continue; }
    if (n.t === 'ch') continue;
    const rows = slotRows(n);
    if (rows.includes(r)) return n;
    for (const s of rows) stack.push(s);
  }
  return null;
}

/** The row whose items array contains `node`. */
function hostRowOf(root, node) {
  const stack = [root];
  while (stack.length) {
    const r = stack.pop();
    if (r.t === 'row') {
      if (r.items.includes(node)) return r;
      for (const it of r.items) stack.push(it);
    } else if (isGrid(r)) {
      for (const c of r.cells) stack.push(c);
    } else if (NODES[r.t]) {
      for (const s of NODES[r.t].slots) stack.push(r[s]);
    }
  }
  return null;
}

/**
 * Up and down step between the slots of the enclosing template -- numerator to
 * denominator, an integral's limits, a matrix row. If the nearest template has
 * no vertical pair, keep climbing outwards.
 */
export function moveVertical(root, cur, dir) {
  let here = cur.row;
  for (let guard = 0; guard < 32; guard += 1) {
    const owner = ownerOf(root, here);
    if (!owner) return null;

    const rows = slotRows(owner);
    const k = rows.indexOf(here);
    const vertical = isGrid(owner) || NODES[owner.t]?.vertical;
    if (vertical && k >= 0) {
      const step = isGrid(owner) ? owner.cols : 1;
      const target = k + (dir < 0 ? -step : step);
      if (target >= 0 && target < rows.length) {
        const t = rows[target];
        return { row: t, i: Math.min(cur.i, t.items.length) };
      }
    }
    here = hostRowOf(root, owner);
    if (!here) return null;
  }
  return null;
}

/* ============================== editing ============================== */

export function insertNode(cur, node) {
  cur.row.items.splice(cur.i, 0, node);
  const inner = firstRowOf(node);
  if (inner) return { row: inner, i: 0 };
  return { row: cur.row, i: cur.i + 1 };
}

export function insertText(cur, text) {
  const chars = [...text].map(ch);
  cur.row.items.splice(cur.i, 0, ...chars);
  return { row: cur.row, i: cur.i + chars.length };
}

/** Backspace: remove the item before the cursor, or step into a template. */
export function backspace(root, cur) {
  if (cur.i > 0) {
    const prev = cur.row.items[cur.i - 1];
    if (prev.t === 'ch') {
      cur.row.items.splice(cur.i - 1, 1);
      return { row: cur.row, i: cur.i - 1 };
    }
    // deleting a template keeps whatever was inside its first slot
    const inner = firstRowOf(prev);
    cur.row.items.splice(cur.i - 1, 1, ...(inner ? inner.items : []));
    return { row: cur.row, i: cur.i - 1 + (inner ? inner.items.length : 0) };
  }
  return moveLeft(root, cur) ?? cur;
}

/** Deep copy of a row, so a recalled entry can be edited independently. */
export function cloneRow(r) {
  return { t: 'row', items: r.items.map(cloneNode) };
}

function cloneNode(n) {
  if (n.t === 'ch') return { t: 'ch', c: n.c };
  if (n.t === 'row') return cloneRow(n);
  if (isGrid(n)) return { ...n, cells: n.cells.map(cloneRow) };
  const def = NODES[n.t];
  if (!def) return { ...n };
  const out = { ...n };
  for (const s of def.slots) out[s] = cloneRow(n[s]);
  return out;
}

export function isEmpty(root) {
  return root.items.length === 0;
}
