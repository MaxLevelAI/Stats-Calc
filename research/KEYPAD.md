# Verified keypad + geometry spec (TI-Nspire CX CAS, Touchpad keypad)

Sources: TI line drawing in `TI-Nspire_CX_Handheld_GettingStarted.pdf` p.8 (measured with
numpy), TI's own shortcut table in the Student Software Guidebook pp.7-11, and the user's photos.

## Geometry (measured from TI's line drawing)
Device aspect h/w = **2.195** (real device 190.0 x 86.4 mm -> 2.199 ✓).

| Element | x (frac of W) | y (frac of H) |
|---|---|---|
| Screen opening | 0.1203 .. 0.8797 (w 0.7594) | 0.0870 .. 0.3478 (h 0.2608) |
| Top key block (esc/touchpad/on) | full | 0.380 .. 0.542 |
| Numeric block | full | 0.542 .. 0.800 |
| Alpha block | full | 0.815 .. 0.930 |

Screen opening is 4:3 and holds the **320 x 240** panel.
Chosen build size: device **843 x 1850** px, screen at **(101, 161)** rendered **640 x 480** (scale 2).

## Screen colors (sampled from photo, normalized)
| Role | Value |
|---|---|
| Screen background | `#020b2a` (dark navy, gradient to near-black) |
| Title bar | `#0f204c` |
| Selection highlight | `#0b6bf7` |
| Heading / link blue | `#026be1` |
| Menu text | `#3b78e3` |

## Key blocks

### Top block
| Left column | Center | Right column |
|---|---|---|
| `esc` (2nd: `↰` undo) | Touchpad: ◄ ► ▲ ▼ + center click | `⌂on` (2nd: `off`) |
| scratchpad (2nd: `save`) | left `◄▯` prev page, right `▯►` next page | `doc▾` (2nd: `+page`) |
| `tab` | above `↗▦` page sorter, below `▯✓` | `menu` (2nd: context menu) |

### Numeric block (2nd functions shown in parentheses)
```
ctrl        ⇧shift(CAPS)   var(sto→)      del(clear)
=(≠≥▸)  trig(?hints)   7   8   9   ⊦templates(▸)  📖catalog(∞β°)
^(ⁿ√x)  x²(√)          4   5   6   ×('"°)         ÷(fraction)
e^x(ln) 10^x(log)      1   2   3   +(contrast+)   −(contrast−)
( ([ ]) ) ({ })        0   .(capture)  (−)(ans)    enter(≈)
```

### Alpha block
```
EE    A  B  C  D  E  F  G   ?!▸
π▸    H  I  J  K  L  M  N   ⚑accent
,     O  P  Q  R  S  T  U   ⏎return
      V  W  X  Y  Z  [ space ]
```
The `⚑` flag key is the **accent** key (TI shortcut table: "English: Change key to include
appropriate accent"). It was the one ambiguous glyph in the photo; resolved against TI docs.

## TI key-font glyph map (decoded from the shortcut table)
`/`=ctrl · `g`=shift · `d`=esc · `e`=tab · `b`=menu · `~`=doc · `»`=scratchpad · `c`=on ·
`·`=enter · `h`=var · `k`=catalog · `t`=templates · `µ`=trig · `¹`=π · `º`=`?!` · `;`=accent ·
`@`=return · `q`=x² · `s`=10^x · `u`=e^x · `v`=(−) · `p`=÷ · `.`=del ·
`£ ¤ ¡ ¢`=▲ ▼ ◄ ► · uppercase letters = letter keys.

## Confirmed ctrl- combinations (complete, from TI)
cut `/X` · copy `/C` · paste `/V` · undo `/Z` or `/d` · redo `/Y` · approx/exact toggle `/·` ·
symbol palette `/k` · underscore `/_` · templates `t` · clear `/.` · caps lock `/g` · store `/h` ·
`[ ]` `/(` · `{ }` `/)` · trig palette `µ` · inequality palette `/=` · π palette `¹` ·
marks palette `º` · √ `/q` · log `/s` · ln `/u` · ans `/v` · hints `/µ` ·
doc menu `~` · open `/O` · close `/W` · new `/N` · insert page `/I` · select app `/K` · save `/S` or `/»` ·
top of page `/7` · end `/1` · pg up `/9` · pg dn `/3` · page sorter `/£` · prev/next page `/¡` `/¢` ·
scratchpad `»` · power off `/c` · contrast `/+` `/-` · matrix row `@` · matrix col `g@` ·
integral `g+` · derivative `g-` · fraction `/p` · group/ungroup `/4` `//6`
