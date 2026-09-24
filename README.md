# OpenCX CAS

A clean-room replica of the TI-Nspire CX CAS handheld, as a program you can run at home.

No TI code, no ROM image, no emulation. Everything is written from TI's published
specification documents (captured in `research/`), which is what makes this legal to
build and legal to keep.

## Why this exists

The calculator is school property at Olympia High School and can't leave campus. Nothing
free reproduces it: TI's own browser version is a paid subscription *and* is the newer
CX II (different keypad, different home screen), and the community emulators
(Firebird, nspire_emu) need a ROM dumped off a physical calculator. See
[research/FINDINGS.md](research/FINDINGS.md) for the full survey.

## Running it

```bash
npm start
```

Then open <http://localhost:5173>. To check the production build the way a
host serves it:

```bash
npm run build && npm run preview
```

## Deploying

It is a static site with no server-side code, so any static host works.
`vercel.json` builds with `node build/build.mjs` (which copies `src/` to
`dist/`) and serves `dist/`.

Saved documents live in the browser's localStorage, so they are per browser
and per device -- they survive refreshes and reboots, but they do not follow
you between machines.

**The `research/` guidebooks are deliberately not committed.** They are TI's
copyrighted documents; `.gitignore` keeps them local. Only `FINDINGS.md` and
`KEYPAD.md`, which are my own notes, are tracked, and they cite the source
URLs so the research can be reproduced. Use the on-screen keypad, or your real keyboard
(letters, digits, operators, arrows, Enter, Esc, Tab, Backspace).

## Fidelity rules

These are the rules the build holds itself to:

- The screen is **320 x 240 logical pixels**, exactly like the hardware, scaled up 2x.
- The body is **843 x 1850** at aspect **2.195**, matching the real 190.0 x 86.4 mm case.
- Every key sits where it sits on the real keypad, with the same second-functions
  printed above it. Verified against TI's line drawing and shortcut table, not guesswork
  — see [research/KEYPAD.md](research/KEYPAD.md).
- Menus keep TI's wording, numbering and order, so muscle memory transfers.
- Results match the CAS Reference Guide, including staying **exact**: `1/3+1/6` is `1/2`,
  `2^100` is the full 31-digit integer.

The name in the wordmark is deliberately not TI's. Everything else is meant to be
indistinguishable in purpose and position.

## Layout

```
src/
  index.html          device chrome
  css/device.css      case, bezel, keypad
  css/screen.css      the 320x240 UI
  js/keys.js          keypad definition (verified layout)
  js/keypad.js        key rendering + sticky ctrl/shift, physical keyboard
  js/screen.js        view stack + title bar
  js/home.js          Home screen
  js/scratchpad.js    Scratchpad (Calculate / Graph)
  js/apps/            the seven applications
  js/math/            rational arithmetic + expression engine
research/             TI's specification PDFs and extracted text
build/serve.mjs       dev server
```

## What works, and what doesn't

**93 of the 289 commands** in TI's CAS Reference Guide are implemented. The
rest are listed in the Catalog but marked **not built**, and calling one says
so rather than quietly echoing the expression back:

```
det(5)   ->   det: in the catalog, not implemented in this build
```

Press tab in the Catalog to list only the commands that work.

Complete and usable today:

- the CAS core: exact arithmetic, radicals, exact trig, expand, factor, solve,
  zeros, derivative, integral, limit, Taylor
- **all of AP Statistics**: 18 distributions, OneVar/TwoVar, 9 regressions,
  7 confidence intervals, 11 hypothesis tests, and the wizards for them
- six applications, the document model, saving, and Settings

Not built:

| | |
|---|---|
| Data Collection | the whole application (needs physical sensors) |
| Matrix & Vector | 28 commands -- `det`, `rref`, eigenvalues, decompositions |
| Finance | 21 commands -- TVM, amortization, cash flows |
| Programming | Program Editor, Libraries, `If`/`For`/`While`/`Func` |
| Graphs | only `f(x)=`; no parametric, polar, sequence, diff-eq or conics |
| 3D Graphs | not started |
| Geometry | Locus, Compass, Measurement Transfer, Ellipse, Parabola |
| Elsewhere | split-screen pages, undo/redo, sliders, text objects, images, chemical equation boxes |

Menu submenus marked `RECONSTRUCTED` in the source have the right items but an
ordering inferred where TI did not publish one.

## Status

| Area | State |
|---|---|
| Device chrome, screen, keypad | done, verified against the photos and TI's drawing |
| Home screen | done |
| Calculator: entry line, history, exact arithmetic | done |
| Calculator: application menu (cascading, TI's numbering) | done |
| CAS: exact rationals, radicals, exact trig | done |
| CAS: expand, factor, solve, zeros, derivative, integral, limit, Taylor | done |
| Statistics: 18 distributions | done |
| Statistics: OneVar/TwoVar, 9 regressions, 7 intervals, 11 tests | done |
| Statistics wizards (the Stat Calculations / Intervals / Tests dialogs) | done |
| Lists & Spreadsheet: grid, named columns, column formulas, results blocks | done |
| Data & Statistics: 9 plot types, regressions, residuals, trace, zoom | done |
| Calculator: 2D math entry, all 24 expression templates + palette | done |
| Graphs: function plotting, trace, analyze, zoom, grid | done |
| Geometry: tools, constructions, measurements, transformations | done |
| Notes: text with live math boxes, Q&A / Proof templates | done |
| Data Collection | not started (needs physical sensors) |
| Document / problem / page model, page sorter, save & open | done |
| Settings (Display Digits, Angle, Exponential, Calculation Mode) | done |
| Catalog (289 commands), var list, symbol palettes | done |
| ans, history recall | done |
| Saving keeps content for all six built applications | done |
| Windows .exe packaging | not started |

Run `npm test` for the 200-case suite covering the symbolic core, the engine's
printed output, distribution values checked against statistical tables, and the
statistics commands checked against worked examples, and the 2D editor’s
linearisation and cursor movement, and the plane-geometry primitives.

## Keys worth knowing

| key | does |
|---|---|
| `menu` | the current application's menu |
| `doc` | Documents menu: File, Edit, View, Insert, Page Layout, Settings |
| `ctrl` + `←` / `→` | previous / next page |
| `ctrl` + `↑` | Page Sorter |
| `⌂on` | Home |
| scratchpad key | Scratchpad, without touching your document |
| 📖 catalog | all 289 commands; type letters to jump |
| `var` | variables currently defined |
| `trig`, `π`, `?!`, `ctrl`+`=` | symbol palettes |
| templates key | the 24 expression templates |
| `ctrl` + `÷` | fraction &nbsp;·&nbsp; `ctrl` + `x²` radical &nbsp;·&nbsp; `^` exponent |
| `ctrl` + `(−)` | `ans` |
| `↑` on the entry line | walk back through history |
| `ctrl` + `M` | insert a math box (Notes) |
