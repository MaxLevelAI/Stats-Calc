// Data & Statistics application menu.
//
// The top level is VERIFIED from TI's own screenshot in the Student Software
// Guidebook (research/pdfimg/ds350_img567.png):
//   1 Plot Type, 2 Plot Properties, 3 Actions, 4 Analyze, 5 Window/Zoom, 6 Settings...
//
// Plot Type leaves come from the guidebook's own section headings (Dot Plot,
// Box Plot, Histogram, Normal Probability Plot, Scatter Plot, X-Y Line Plot,
// Dot Chart, Bar Chart, Pie Chart). Analyze and Window/Zoom leaves are
// confirmed in part by TI help pages (Show Linear (mx+b), Show Residual
// Squares, Show Residual Plot, Zoom-Data, Window Settings); the remainder are
// RECONSTRUCTED.

const D = (k, label, ins) => ({ k, label, ins });
const S = (k, label, sub) => ({ k, label, sub });
const A = (k, label, act) => ({ k, label, ins: `\u0000${act}` });

export const STATS_MENU = [
  S('1', 'Plot Type', [
    A('1', 'Dot Plot', 'type:dot'),
    A('2', 'Box Plot', 'type:box'),
    A('3', 'Histogram', 'type:hist'),
    A('4', 'Normal Probability Plot', 'type:normprob'),
    A('5', 'Scatter Plot', 'type:scatter'),
    A('6', 'X-Y Line Plot', 'type:xyline'),
    A('7', 'Dot Chart', 'type:dotchart'),
    A('8', 'Bar Chart', 'type:bar'),
    A('9', 'Pie Chart', 'type:pie'),
  ]),

  S('2', 'Plot Properties', [
    A('1', 'Add X Variable', 'pick:x'),
    A('2', 'Add Y Variable', 'pick:y'),
    A('3', 'Remove X Variable', 'remove:x'),
    A('4', 'Remove Y Variable', 'remove:y'),
    A('5', 'Show Box Plot Outliers', 'toggle:outliers'),
    A('6', 'Histogram Properties', 'hist:bins'),
    A('7', 'Force Categorical X', 'toggle:categorical'),
  ]),

  S('3', 'Actions', [ // RECONSTRUCTED
    A('1', 'Select All Points', 'select:all'),
    A('2', 'Insert Slider', 'slider'),
    A('3', 'Clear All', 'clear'),
  ]),

  S('4', 'Analyze', [
    A('1', 'Add Movable Line', 'analyze:movable'),
    S('2', 'Regression', [
      A('1', 'Show Linear (mx+b)', 'reg:LinRegMx'),
      A('2', 'Show Linear (a+bx)', 'reg:LinRegBx'),
      A('3', 'Show Median-Median', 'reg:MedMed'),
      A('4', 'Show Quadratic', 'reg:QuadReg'),
      A('5', 'Show Cubic', 'reg:CubicReg'),
      A('6', 'Show Quartic', 'reg:QuartReg'),
      A('7', 'Show Power', 'reg:PowerReg'),
      A('8', 'Show Exponential', 'reg:ExpReg'),
      A('9', 'Show Logarithmic', 'reg:LnReg'),
    ]),
    S('3', 'Residuals', [
      A('1', 'Show Residual Squares', 'resid:squares'),
      A('2', 'Show Residual Plot', 'resid:plot'),
    ]),
    A('4', 'Plot Value', 'analyze:plotValue'),
    A('5', 'Plot Function', 'analyze:plotFunction'),
    A('6', 'Remove Plotted Value / Function', 'analyze:removePlot'),
    A('7', 'Graph Trace', 'analyze:trace'),
  ]),

  S('5', 'Window/Zoom', [
    A('1', 'Window Settings', 'zoom:settings'),
    A('2', 'Zoom - Data', 'zoom:data'),
    A('3', 'Zoom - In', 'zoom:in'),
    A('4', 'Zoom - Out', 'zoom:out'),
  ]),

  D('6', 'Settings...', '\u0000settings'),

  { k: '7', label: 'Hints', ins: '\u0000hints', sep: true },
];
