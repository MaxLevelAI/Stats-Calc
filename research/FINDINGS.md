# Research: Does a 1:1 TI-Nspire CX CAS replica already exist?

## The device in the photos
- **TI-Nspire CX CAS** (original CX, *not* CX II). Home screen shows Scratchpad (A Calculate,
  B Graph) + Documents (1 New Document, 2 My Documents, 3 Recent, 4 Current, 5 Settings)
  and a 7-icon application dock.
- Asset tag: Olympia High School, Set 28-3. School-owned, so it stays at school.
- Hardware: ARM9 @132 MHz, 64 MB RAM, 100 MB flash, **320x240 16-bit color LCD** (65,536 colors).

## What already exists

| Option | Free? | 1:1 with this model? | Usable at home? |
|---|---|---|---|
| TI-Nspire CX II CAS Online Calculator (official, nspirecxii.ti.com) | No — subscription (~$27.50) | No — it's the **CX II**, different keypad + home screen | Only if paid |
| TI-Nspire CX CAS Student Software (official desktop) | No — paid license (trial only) | Close (same OS, desktop chrome) | Only if paid |
| Firebird emulator (GPLv3, github.com/nspire-emus/firebird) | Yes, the emulator | Yes — *if* you supply the ROM | **No** — needs boot1/boot2 + OS images dumped from a physical calculator you own |
| nspire_emu | Yes | Same caveat | No — same ROM problem |
| tinspireapps.com / tinspire.ai "online calculators" | Partly | **No** — unrelated one-off solver forms, no keypad, no menus | n/a |

## Conclusion
**Nothing free reproduces this exact handheld.** The official browser version is paid and is the
wrong model. The community emulators are accurate but legally and practically blocked: they need
a ROM dumped off a calculator, and this one is school property that can't leave campus.

So: build a clean-room replica. No TI code or ROM involved — only the public specification
documents below, which describe the behavior a replica must match.

## Primary sources captured locally
- `TI-Nspire-CX-CAS-Reference-Guide.pdf` (289 pp) -> `refguide.txt`
  Official CAS command reference. Every function, exact syntax, exact output.
  Expression Templates + alphabetical listing A-Z + symbols + draw commands.
- `TI-Nspire_CX_Student_Software_Guidebook.pdf` (547 pp) -> `guidebook.txt`
  Official per-application documentation: Calculator, Graphs, Geometry, 3D Graphs,
  Lists & Spreadsheet, Data & Statistics, Notes, Data Collection, Program Editor,
  Libraries, Widgets, settings, and Appendix A (unit conversion categories).
- `TI-Nspire_CX_Handheld_GettingStarted.pdf` (114 pp) -> `gettingstarted.txt`
  Handheld-specific: home screen, keypad, key shortcuts, document/page model.

## Sources
- https://education.ti.com/en/products/online-calculators/ti-nspire-cxii-cas
- https://github.com/nspire-emus/firebird
- https://www.hackspire.org/Hardware/
- https://www.tinspireapps.com/Online-Calculators/TiNspire-Online-Calculator.php
- https://education.ti.com/en/guidebook/details/en/0AF942A4AC0E47ABA20853691FA6712E/TI-NspireCXCASReferenceGuide
