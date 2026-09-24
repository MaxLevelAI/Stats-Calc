// Notes application menu.
//
// The six top-level entries are VERIFIED from TI's own screenshot in the
// Student Software Guidebook (research/pdfimg/nt397_img628.png):
//   1 Actions, 2 Templates, 3 Insert, 4 Format, 5 Math Box Options, 6 Calculations
//
// Templates is VERIFIED from the guidebook's own table:
//   1 Q&A, 2 Proof, 3 Default, 4 Hide Answer (Q&A)
//
// Calculations is VERIFIED from the guidebook's table, which says each entry
// uses the corresponding Calculator menu -- so those submenus are reused here
// rather than duplicated:
//   1 Define Variables, 2 Number, 3 Algebra, 4 Calculus, 5 Probability,
//   6 Statistics, 7 Matrix & Vector, 8 Finance
//
// Actions, Insert, Format and Math Box Options leaves are RECONSTRUCTED.

import { CALC_MENU } from './calc-menu.js';

const D = (k, label, ins) => ({ k, label, ins });
const S = (k, label, sub) => ({ k, label, sub });
const A = (k, label, act) => ({ k, label, ins: `\u0000${act}` });

/** Pull a submenu out of the Calculator tree by its label. */
const calcSub = (label) => CALC_MENU.find((m) => m.label === label)?.sub ?? [];

export const NOTES_MENU = [
  S('1', 'Actions', [ // RECONSTRUCTED
    A('1', 'Select All', 'act:selectAll'),
    A('2', 'Clear', 'act:clear'),
    A('3', 'Insert Comment', 'act:comment'),
  ]),

  S('2', 'Templates', [
    A('1', 'Q&A', 'tpl:qa'),
    A('2', 'Proof', 'tpl:proof'),
    A('3', 'Default', 'tpl:default'),
    A('4', 'Hide Answer', 'tpl:hideAnswer'),
  ]),

  S('3', 'Insert', [ // RECONSTRUCTED
    A('1', 'Math Expression Box', 'ins:mathbox'),
    A('2', 'Chemical Equation Box', 'ins:chembox'),
    S('3', 'Comment', [
      A('1', 'Teacher', 'ins:commentTeacher'),
      A('2', 'Reviewer', 'ins:commentReviewer'),
    ]),
    A('4', 'Shape', 'ins:shape'),
    A('5', 'Image', 'ins:image'),
  ]),

  S('4', 'Format', [ // RECONSTRUCTED
    A('1', 'Format Text', 'fmt:text'),
    A('2', 'Bold', 'fmt:bold'),
    A('3', 'Italic', 'fmt:italic'),
    A('4', 'Underline', 'fmt:underline'),
  ]),

  S('5', 'Math Box Options', [ // RECONSTRUCTED
    A('1', 'Math Box Attributes', 'mb:attributes'),
    A('2', 'Show / Hide Output', 'mb:toggleOutput'),
    A('3', 'Deactivate', 'mb:deactivate'),
    A('4', 'Deactivate All', 'mb:deactivateAll'),
    A('5', 'Activate All', 'mb:activateAll'),
  ]),

  S('6', 'Calculations', [
    A('1', 'Define Variables', 'calc:define'),
    S('2', 'Number', calcSub('Number')),
    S('3', 'Algebra', calcSub('Algebra')),
    S('4', 'Calculus', calcSub('Calculus')),
    S('5', 'Probability', calcSub('Probability')),
    S('6', 'Statistics', calcSub('Statistics')),
    S('7', 'Matrix & Vector', calcSub('Matrix & Vector')),
    S('8', 'Finance', calcSub('Finance')),
  ]),

  { k: '7', label: 'Hints', ins: '\u0000hints', sep: true },
];
