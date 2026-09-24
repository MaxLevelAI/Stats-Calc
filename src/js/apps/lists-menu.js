// Lists & Spreadsheet application menu.
//
// The top level is VERIFIED from TI's handheld screenshot
// (research/pdfimg/gs042_Im64.png): 1 Actions, 2 Insert, 3 Data,
// 4 Statistics, 5 Table, then a separated Hints.
//
// Several leaves are confirmed by menu paths quoted in the guidebook
// (Insert > Insert Cell, Insert > Lists, Data > Fill, Data > Random > Integer,
// Data > Data Capture > Manual/Automatic, Actions > Insert Slider,
// Statistics > Distributions > Normal Pdf). The rest are RECONSTRUCTED.

import { DISTRIBUTIONS, STAT_CALCS, CONF_INTERVALS, STAT_TESTS, LIST_MATH, LIST_OPS } from './calc-menu.js';

const D = (k, label, ins) => ({ k, label, ins });
const S = (k, label, sub) => ({ k, label, sub });

export const LISTS_MENU = [
  S('1', 'Actions', [
    D('1', 'Clear Data', '\u0000clearData'),
    D('2', 'Select', '\u0000select'),
    D('3', 'Resize', '\u0000resize'),
    D('4', 'Sort', '\u0000sort'),
    D('5', 'Recalculate', '\u0000recalc'),
    D('6', 'Insert Slider', '\u0000slider'),
  ]),

  S('2', 'Insert', [
    D('1', 'Insert Cell', '\u0000insertCell'),
    D('2', 'Insert Row', '\u0000insertRow'),
    D('3', 'Insert Column', '\u0000insertColumn'),
    D('4', 'Delete Cell', '\u0000deleteCell'),
    D('5', 'Delete Row', '\u0000deleteRow'),
    D('6', 'Delete Column', '\u0000deleteColumn'),
    D('7', 'Lists', '\u0000lists'),
  ]),

  S('3', 'Data', [
    D('1', 'Generate Sequence', 'seq(|,n,1,10)'),
    S('2', 'Data Capture', [
      D('1', 'Automatic', 'capture(|,1)'),
      D('2', 'Manual', 'capture(|,0)'),
    ]),
    D('3', 'Fill', '\u0000fill'),
    S('4', 'Random', [
      D('1', 'Number', 'rand(|)'),
      D('2', 'Integer', 'randInt(|)'),
      D('3', 'Binomial', 'randBin(|)'),
      D('4', 'Normal', 'randNorm(|)'),
      D('5', 'Sample', 'randSamp(|)'),
      D('6', 'Seed', 'RandSeed |'),
    ]),
    D('5', 'Quick Graph', '\u0000quickGraph'),
    D('6', 'Summary Plot', '\u0000summaryPlot'),
    S('7', 'List Math', LIST_MATH),
    S('8', 'List Operations', LIST_OPS),
  ]),

  S('4', 'Statistics', [
    S('1', 'Stat Calculations', STAT_CALCS),
    S('2', 'Distributions', DISTRIBUTIONS),
    S('3', 'Confidence Intervals', CONF_INTERVALS),
    S('4', 'Stat Tests', STAT_TESTS),
  ]),

  S('5', 'Table', [ // RECONSTRUCTED
    D('1', 'Switch to Function Table', '\u0000funcTable'),
    D('2', 'Edit Function Table Settings', '\u0000tableSettings'),
    D('3', 'Delete Column', '\u0000deleteColumn'),
  ]),

  { k: '6', label: 'Hints', ins: '\u0000hints', sep: true },
];
