// Keypad definition for the replica handheld.
// Layout and second-functions verified against TI's own line drawing and shortcut
// table -- see research/KEYPAD.md. `id` values are the canonical key names used
// everywhere else in the app.
//
// tone : 'white' (ctrl) | 'grey' (digits, X/Y/Z) | undefined (black)
// sub  : the ctrl-function printed above the key
// span : column span inside its block row

export const TOP_KEYS = [
  // left column
  { id: 'esc', label: 'esc', sub: '↰', col: 'left', row: 0 },
  {
    id: 'scratchpad',
    label: '<svg viewBox="0 0 24 20" class="gl"><rect class="st" x="2" y="2" width="20" height="16" rx="2"/><path class="st" d="M6 6.5h12M6 10h12M6 13.5h7"/></svg>',
    sub: 'save',
    col: 'left',
    row: 1,
  },
  { id: 'tab', label: 'tab', col: 'left', row: 2 },
  // right column
  { id: 'on', label: '<span class="home-ico"></span>on', sub: 'off', col: 'right', row: 0 },
  { id: 'doc', label: 'doc<span class="caret">▾</span>', sub: '+ page', col: 'right', row: 1 },
  { id: 'menu', label: 'menu', sub: '▤', col: 'right', row: 2 },
];

// Numeric block: 7 columns. c1-c2 left pair, c3-c5 digits, c6-c7 right pair.
export const NUM_KEYS = [
  { id: 'ctrl', label: 'ctrl', r: 0, c: 1, span: 2, tone: 'white', narrow: true },
  { id: 'shift', label: '⇧shift', r: 0, c: 3, sub: 'CAPS' },
  { id: 'var', label: 'var', r: 0, c: 5, sub: 'sto →' },
  { id: 'del', label: 'del', r: 0, c: 6, span: 2, sub: 'clear', narrow: true },

  { id: 'equals', label: '=', r: 1, c: 1, sub: '≠ ≥ ▸' },
  { id: 'trig', label: 'trig<span class="caret">▸</span>', r: 1, c: 2, sub: '<span class="circ">?</span>' },
  { id: 'd7', label: '7', r: 1, c: 3, tone: 'grey' },
  { id: 'd8', label: '8', r: 1, c: 4, tone: 'grey' },
  { id: 'd9', label: '9', r: 1, c: 5, tone: 'grey' },
  {
    id: 'templ',
    label: '<svg viewBox="0 0 26 18" class="gl"><path class="st" d="M1.5 9h10"/><rect class="st" x="3" y="2.5" width="7" height="4.5"/><rect class="st" x="3" y="11" width="7" height="4.5"/><path class="st" d="M14.5 9.5l2.5 4.5 4.5-10h3"/></svg>',
    r: 1, c: 6, sub: '▸',
  },
  {
    id: 'cat',
    label: '<svg viewBox="0 0 26 18" class="gl"><path class="st" d="M13 5c-3-3-7-3-10-2v11c3-1 7-1 10 2 3-3 7-3 10-2V3c-3-1-7-1-10 2zM13 5v11"/></svg>',
    r: 1, c: 7, sub: '∞ β °',
  },

  { id: 'caret', label: '^', r: 2, c: 1, sub: '<sup>n</sup>√x' },
  { id: 'sq', label: 'x<sup>2</sup>', r: 2, c: 2, sub: '√' },
  { id: 'd4', label: '4', r: 2, c: 3, tone: 'grey' },
  { id: 'd5', label: '5', r: 2, c: 4, tone: 'grey' },
  { id: 'd6', label: '6', r: 2, c: 5, tone: 'grey' },
  { id: 'mul', label: '×', r: 2, c: 6, sub: '′ ″ °' },
  { id: 'div', label: '÷', r: 2, c: 7, sub: '<span class="frac"></span>' },

  { id: 'ex', label: 'e<sup>x</sup>', r: 3, c: 1, sub: 'ln' },
  { id: 'tenx', label: '10<sup>x</sup>', r: 3, c: 2, sub: 'log' },
  { id: 'd1', label: '1', r: 3, c: 3, tone: 'grey' },
  { id: 'd2', label: '2', r: 3, c: 4, tone: 'grey' },
  { id: 'd3', label: '3', r: 3, c: 5, tone: 'grey' },
  { id: 'plus', label: '+', r: 3, c: 6, sub: '◑▸' },
  { id: 'minus', label: '−', r: 3, c: 7, sub: '◐▸' },

  { id: 'lparen', label: '(', r: 4, c: 1, sub: '[ ]' },
  { id: 'rparen', label: ')', r: 4, c: 2, sub: '{ }' },
  { id: 'd0', label: '0', r: 4, c: 3, tone: 'grey' },
  { id: 'dot', label: '.', r: 4, c: 4, tone: 'grey', sub: 'capture' },
  { id: 'neg', label: '(−)', r: 4, c: 5, tone: 'grey', sub: 'ans' },
  { id: 'enter', label: 'enter', r: 4, c: 6, span: 2, sub: '≈' },
];

// Alpha block: 9 columns.
const LETTER_ROWS = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z'],
];

export const ALPHA_KEYS = [
  { id: 'EE', label: 'EE', r: 0, c: 1, wide: true },
  { id: 'pi', label: 'π<span class="caret">▸</span>', r: 1, c: 1, wide: true },
  { id: 'comma', label: ',', r: 2, c: 1, wide: true },
  { id: 'punct', label: '?!<span class="caret">▸</span>', r: 0, c: 9, wide: true },
  {
    id: 'accent',
    label: '<svg viewBox="0 0 14 16" class="gl"><path class="st" d="M4 1v14"/><path d="M4 2h7l-2 3 2 3H4z"/></svg>',
    r: 1, c: 9, wide: true,
  },
  {
    id: 'return',
    label: '<svg viewBox="0 0 18 14" class="gl"><path class="st" d="M16 2v5H4"/><path d="M7 4L3 7l4 3z"/></svg>',
    r: 2, c: 9, wide: true,
  },
  {
    id: 'space',
    label: '<svg viewBox="0 0 30 12" class="gl"><path class="st" d="M6 4v4h18V4"/></svg>',
    r: 3, c: 7, span: 2,
  },
];

LETTER_ROWS.forEach((row, r) =>
  row.forEach((ch, i) => {
    ALPHA_KEYS.push({
      id: 'L' + ch,
      label: ch,
      letter: ch,
      r,
      c: i + 2,
      tone: 'XYZ'.includes(ch) ? 'grey' : undefined,
    });
  })
);

// Physical-keyboard -> key id, matched against event.key.
export const KBD_MAP = {
  Escape: 'esc', Tab: 'tab', Enter: 'enter', Backspace: 'del', Delete: 'del',
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  0: 'd0', 1: 'd1', 2: 'd2', 3: 'd3', 4: 'd4',
  5: 'd5', 6: 'd6', 7: 'd7', 8: 'd8', 9: 'd9',
  '+': 'plus', '-': 'minus', '*': 'mul', '/': 'div', '^': 'caret',
  '(': 'lparen', ')': 'rparen', '.': 'dot', ',': 'comma', '=': 'equals',
  ' ': 'space', F1: 'menu', F2: 'doc', F3: 'on', F4: 'scratchpad',
};

export const ALL_KEYS = [...TOP_KEYS, ...NUM_KEYS, ...ALPHA_KEYS];
export const KEY_BY_ID = Object.fromEntries(ALL_KEYS.map((k) => [k.id, k]));
