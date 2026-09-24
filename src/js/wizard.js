// Statistics wizards: the dialogs the Stat Calculations, Confidence Intervals
// and Stat Tests menus open.
//
// Each definition lists the fields TI's dialog shows and knows how to assemble
// the corresponding command, so the wizard is a front end for the same
// commands you can type on the entry line.

import { setModal, clearModal, refresh } from './screen.js';

const TXT = (key, label, value = '') => ({ t: 'text', key, label, value });
const CHOICE = (key, label, options, value = 0) => ({ t: 'choice', key, label, options, value });

const HYP = (key = 'hyp') => CHOICE(key, 'Alternate Hyp', ['Ha: ≠', 'Ha: <', 'Ha: >']);
const HYP_CODE = ['0', '-1', '1'];
const CLEVEL = () => TXT('cl', 'C Level', '0.95');
const POOLED = () => CHOICE('pooled', 'Pooled', ['No', 'Yes']);

const listOrStats = () => CHOICE('mode', 'Data Input Method', ['Data', 'Stats']);

const v = (f, k) => f.find((x) => x.key === k)?.value ?? '';
const choice = (f, k) => f.find((x) => x.key === k)?.value ?? 0;

/**
 * fields(state) -> array of field descriptors
 * build(fields)  -> the command string to evaluate
 */
export const WIZARDS = {
  /* ---------------- stat calculations ---------------- */
  OneVar: {
    title: 'One-Variable Statistics',
    fields: () => [TXT('x', 'X1 List', 'a[]'), TXT('freq', 'Frequency List', '1')],
    build: (f) => `OneVar ${v(f, 'x')}${v(f, 'freq') && v(f, 'freq') !== '1' ? `,${v(f, 'freq')}` : ''}`,
  },
  TwoVar: {
    title: 'Two-Variable Statistics',
    fields: () => [TXT('x', 'X List', 'a[]'), TXT('y', 'Y List', 'b[]'), TXT('freq', 'Frequency List', '1')],
    build: (f) => `TwoVar ${v(f, 'x')},${v(f, 'y')}`,
  },
};

// the regression family all share one dialog shape
for (const [name, title] of [
  ['LinRegMx', 'Linear Regression (mx+b)'],
  ['LinRegBx', 'Linear Regression (a+bx)'],
  ['MedMed', 'Median-Median Line'],
  ['QuadReg', 'Quadratic Regression'],
  ['CubicReg', 'Cubic Regression'],
  ['QuartReg', 'Quartic Regression'],
  ['PowerReg', 'Power Regression'],
  ['ExpReg', 'Exponential Regression'],
  ['LnReg', 'Logarithmic Regression'],
]) {
  WIZARDS[name] = {
    title,
    fields: () => [TXT('x', 'X List', 'a[]'), TXT('y', 'Y List', 'b[]'), TXT('freq', 'Frequency List', '1')],
    build: (f) => `${name} ${v(f, 'x')},${v(f, 'y')}`,
  };
}

/* ---------------- confidence intervals ---------------- */

WIZARDS.zInterval = {
  title: 'z Interval',
  fields: (s) => (s.mode === 1
    ? [listOrStats(), TXT('sigma', 'σ', '1'), TXT('xbar', 'x̄', '0'), TXT('n', 'n', '1'), CLEVEL()]
    : [listOrStats(), TXT('sigma', 'σ', '1'), TXT('list', 'List', 'a[]'), CLEVEL()]),
  build: (f, s) => (s.mode === 1
    ? `zInterval ${v(f, 'sigma')},${v(f, 'xbar')},${v(f, 'n')},${v(f, 'cl')}`
    : `zInterval ${v(f, 'sigma')},${v(f, 'list')},1,${v(f, 'cl')}`),
};

WIZARDS.tInterval = {
  title: 't Interval',
  fields: (s) => (s.mode === 1
    ? [listOrStats(), TXT('xbar', 'x̄', '0'), TXT('sx', 'sx', '1'), TXT('n', 'n', '2'), CLEVEL()]
    : [listOrStats(), TXT('list', 'List', 'a[]'), CLEVEL()]),
  build: (f, s) => (s.mode === 1
    ? `tInterval ${v(f, 'xbar')},${v(f, 'sx')},${v(f, 'n')},${v(f, 'cl')}`
    : `tInterval ${v(f, 'list')},1,${v(f, 'cl')}`),
};

WIZARDS.zInterval_2Samp = {
  title: '2-Sample z Interval',
  fields: () => [
    TXT('s1', 'σ1', '1'), TXT('s2', 'σ2', '1'),
    TXT('x1', 'x̄1', '0'), TXT('n1', 'n1', '1'),
    TXT('x2', 'x̄2', '0'), TXT('n2', 'n2', '1'), CLEVEL(),
  ],
  build: (f) => `zInterval_2Samp ${v(f, 's1')},${v(f, 's2')},${v(f, 'x1')},${v(f, 'n1')},${v(f, 'x2')},${v(f, 'n2')},${v(f, 'cl')}`,
};

WIZARDS.tInterval_2Samp = {
  title: '2-Sample t Interval',
  fields: () => [
    TXT('x1', 'x̄1', '0'), TXT('sx1', 'sx1', '1'), TXT('n1', 'n1', '2'),
    TXT('x2', 'x̄2', '0'), TXT('sx2', 'sx2', '1'), TXT('n2', 'n2', '2'),
    CLEVEL(), POOLED(),
  ],
  build: (f) => `tInterval_2Samp ${v(f, 'x1')},${v(f, 'sx1')},${v(f, 'n1')},${v(f, 'x2')},${v(f, 'sx2')},${v(f, 'n2')},${v(f, 'cl')},${choice(f, 'pooled')}`,
};

WIZARDS.zInterval_1Prop = {
  title: '1-Prop z Interval',
  fields: () => [TXT('x', 'Successes, x', '0'), TXT('n', 'n', '1'), CLEVEL()],
  build: (f) => `zInterval_1Prop ${v(f, 'x')},${v(f, 'n')},${v(f, 'cl')}`,
};

WIZARDS.zInterval_2Prop = {
  title: '2-Prop z Interval',
  fields: () => [
    TXT('x1', 'Successes, x1', '0'), TXT('n1', 'n1', '1'),
    TXT('x2', 'Successes, x2', '0'), TXT('n2', 'n2', '1'), CLEVEL(),
  ],
  build: (f) => `zInterval_2Prop ${v(f, 'x1')},${v(f, 'n1')},${v(f, 'x2')},${v(f, 'n2')},${v(f, 'cl')}`,
};

WIZARDS.LinRegtIntervals = {
  title: 'Linear Reg t Intervals',
  fields: () => [TXT('x', 'X List', 'a[]'), TXT('y', 'Y List', 'b[]'), CLEVEL()],
  build: (f) => `LinRegtIntervals ${v(f, 'x')},${v(f, 'y')},1,0,${v(f, 'cl')}`,
};

/* ---------------- hypothesis tests ---------------- */

WIZARDS.zTest = {
  title: 'z Test',
  fields: (s) => (s.mode === 1
    ? [listOrStats(), TXT('mu', 'μ0', '0'), TXT('sigma', 'σ', '1'), TXT('xbar', 'x̄', '0'), TXT('n', 'n', '1'), HYP()]
    : [listOrStats(), TXT('mu', 'μ0', '0'), TXT('sigma', 'σ', '1'), TXT('list', 'List', 'a[]'), HYP()]),
  build: (f, s) => (s.mode === 1
    ? `zTest ${v(f, 'mu')},${v(f, 'sigma')},${v(f, 'xbar')},${v(f, 'n')},${HYP_CODE[choice(f, 'hyp')]}`
    : `zTest ${v(f, 'mu')},${v(f, 'sigma')},${v(f, 'list')},1,${HYP_CODE[choice(f, 'hyp')]}`),
};

WIZARDS.tTest = {
  title: 't Test',
  fields: (s) => (s.mode === 1
    ? [listOrStats(), TXT('mu', 'μ0', '0'), TXT('xbar', 'x̄', '0'), TXT('sx', 'sx', '1'), TXT('n', 'n', '2'), HYP()]
    : [listOrStats(), TXT('mu', 'μ0', '0'), TXT('list', 'List', 'a[]'), HYP()]),
  build: (f, s) => (s.mode === 1
    ? `tTest ${v(f, 'mu')},${v(f, 'xbar')},${v(f, 'sx')},${v(f, 'n')},${HYP_CODE[choice(f, 'hyp')]}`
    : `tTest ${v(f, 'mu')},${v(f, 'list')},1,${HYP_CODE[choice(f, 'hyp')]}`),
};

WIZARDS.zTest_2Samp = {
  title: '2-Sample z Test',
  fields: () => [
    TXT('s1', 'σ1', '1'), TXT('s2', 'σ2', '1'),
    TXT('x1', 'x̄1', '0'), TXT('n1', 'n1', '1'),
    TXT('x2', 'x̄2', '0'), TXT('n2', 'n2', '1'), HYP(),
  ],
  build: (f) => `zTest_2Samp ${v(f, 's1')},${v(f, 's2')},${v(f, 'x1')},${v(f, 'n1')},${v(f, 'x2')},${v(f, 'n2')},${HYP_CODE[choice(f, 'hyp')]}`,
};

WIZARDS.tTest_2Samp = {
  title: '2-Sample t Test',
  fields: () => [
    TXT('x1', 'x̄1', '0'), TXT('sx1', 'sx1', '1'), TXT('n1', 'n1', '2'),
    TXT('x2', 'x̄2', '0'), TXT('sx2', 'sx2', '1'), TXT('n2', 'n2', '2'),
    HYP(), POOLED(),
  ],
  build: (f) => `tTest_2Samp ${v(f, 'x1')},${v(f, 'sx1')},${v(f, 'n1')},${v(f, 'x2')},${v(f, 'sx2')},${v(f, 'n2')},${HYP_CODE[choice(f, 'hyp')]},${choice(f, 'pooled')}`,
};

WIZARDS.zTest_1Prop = {
  title: '1-Prop z Test',
  fields: () => [TXT('p0', 'p0', '0.5'), TXT('x', 'Successes, x', '0'), TXT('n', 'n', '1'), HYP()],
  build: (f) => `zTest_1Prop ${v(f, 'p0')},${v(f, 'x')},${v(f, 'n')},${HYP_CODE[choice(f, 'hyp')]}`,
};

WIZARDS.zTest_2Prop = {
  title: '2-Prop z Test',
  fields: () => [
    TXT('x1', 'Successes, x1', '0'), TXT('n1', 'n1', '1'),
    TXT('x2', 'Successes, x2', '0'), TXT('n2', 'n2', '1'), HYP(),
  ],
  build: (f) => `zTest_2Prop ${v(f, 'x1')},${v(f, 'n1')},${v(f, 'x2')},${v(f, 'n2')},${HYP_CODE[choice(f, 'hyp')]}`,
};

WIZARDS['χ²GOF'] = {
  title: 'χ² GOF Test',
  fields: () => [
    TXT('obs', 'Observed List', 'a[]'),
    TXT('exp', 'Expected List', 'b[]'),
    TXT('df', 'Deg of Freedom, df', '1'),
  ],
  build: (f) => `χ²GOF ${v(f, 'obs')},${v(f, 'exp')},${v(f, 'df')}`,
};

WIZARDS['χ²2way'] = {
  title: 'χ² 2-way Test',
  fields: () => [TXT('obs', 'Observed Matrix', '[[1,2],[3,4]]')],
  build: (f) => `χ²2way ${v(f, 'obs')}`,
};

WIZARDS.Test_2S = {
  title: '2-Sample F Test',
  fields: () => [
    TXT('sx1', 'sx1', '1'), TXT('n1', 'n1', '2'),
    TXT('sx2', 'sx2', '1'), TXT('n2', 'n2', '2'), HYP(),
  ],
  build: (f) => `Test_2S ${v(f, 'sx1')},${v(f, 'n1')},${v(f, 'sx2')},${v(f, 'n2')},${HYP_CODE[choice(f, 'hyp')]}`,
};

WIZARDS.LinRegtTest = {
  title: 'Linear Reg t Test',
  fields: () => [TXT('x', 'X List', 'a[]'), TXT('y', 'Y List', 'b[]'), HYP()],
  build: (f) => `LinRegtTest ${v(f, 'x')},${v(f, 'y')},1,${HYP_CODE[choice(f, 'hyp')]}`,
};

WIZARDS.ANOVA = {
  title: 'ANOVA',
  fields: () => [TXT('lists', 'Lists (comma separated)', 'a[],b[],c[]')],
  build: (f) => `ANOVA ${v(f, 'lists')}`,
};

/* ============================== the dialog ============================== */

export function openWizard(name, onRun) {
  const def = WIZARDS[name];
  if (!def) return false;

  const state = { mode: 0 };
  let fields = def.fields(state);
  let focus = 0;   // index into fields; fields.length == OK, +1 == Cancel

  function rebuild() {
    const keep = Object.fromEntries(fields.map((f) => [f.key, f.value]));
    fields = def.fields(state);
    for (const f of fields) if (keep[f.key] !== undefined) f.value = keep[f.key];
  }

  const modal = {
    id: 'wizard',

    mount(host) {
      let rows = '';
      fields.forEach((f, i) => {
        const on = i === focus;
        const shown = f.t === 'choice' ? `◂ ${f.options[f.value]} ▸` : f.value;
        rows +=
          `<div class="wz-row"><span class="wz-label">${esc(f.label)}</span>` +
          `<span class="wz-field${on ? ' sel' : ''}" data-i="${i}">${esc(shown)}</span></div>`;
      });

      host.innerHTML =
        '<div class="wz-panel">' +
        `<div class="wz-title">${esc(def.title)}</div>` +
        `<div class="wz-body">${rows}</div>` +
        '<div class="wz-buttons">' +
        `<span class="wz-btn${focus === fields.length ? ' sel' : ''}" data-i="${fields.length}">OK</span>` +
        `<span class="wz-btn${focus === fields.length + 1 ? ' sel' : ''}" data-i="${fields.length + 1}">Cancel</span>` +
        '</div></div>';

      host.addEventListener('mousedown', (e) => {
        const node = e.target.closest('[data-i]');
        if (!node) return;
        focus = Number(node.dataset.i);
        if (focus === fields.length) return run();
        if (focus === fields.length + 1) { clearModal(); return undefined; }
        refresh();
        return undefined;
      });
    },

    onKey(ev) {
      const { id, def: kdef, shift } = ev;
      const last = fields.length + 1;

      if (id === 'esc') { clearModal(); return true; }
      if (id === 'down' || id === 'tab') { focus = Math.min(focus + 1, last); refresh(); return true; }
      if (id === 'up') { focus = Math.max(focus - 1, 0); refresh(); return true; }

      if (id === 'enter' || id === 'click') {
        if (focus === last) { clearModal(); return true; }
        return run();
      }

      const f = fields[focus];
      if (!f) return true;

      if (f.t === 'choice') {
        if (id === 'left') { f.value = (f.value + f.options.length - 1) % f.options.length; }
        else if (id === 'right') { f.value = (f.value + 1) % f.options.length; }
        else return true;
        if (f.key === 'mode') { state.mode = f.value; rebuild(); }
        refresh();
        return true;
      }

      if (id === 'del') { f.value = f.value.slice(0, -1); refresh(); return true; }
      if (id === 'left' || id === 'right') return true;

      const LITERAL = {
        d0: '0', d1: '1', d2: '2', d3: '3', d4: '4', d5: '5', d6: '6', d7: '7', d8: '8', d9: '9',
        dot: '.', comma: ',', minus: '-', plus: '+', mul: '*', div: '/', caret: '^',
        lparen: '(', rparen: ')', space: ' ',
      };
      let ch = LITERAL[id];
      if (!ch && kdef?.letter) ch = shift ? kdef.letter : kdef.letter.toLowerCase();
      if (ch) { f.value += ch; refresh(); return true; }
      return true;
    },
  };

  function run() {
    let cmd;
    try {
      cmd = def.build(fields, state);
    } catch (e) {
      return true;
    }
    clearModal();
    onRun(cmd, def.title);
    return true;
  }

  setModal(modal);
  return true;
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
