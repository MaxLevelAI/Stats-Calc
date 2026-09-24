// Graphs application menu.
//
// The nine top-level entries are VERIFIED from TI's own screenshot in the
// Student Software Guidebook (research/pdfimg/gm170_img310.png):
//   1 Actions, 2 View, 3 Graph Entry/Edit, 4 Window/Zoom, 5 Trace,
//   6 Analyze Graph, 7 Table, 8 Geometry, 9 Settings...
//
// Grounded leaves, quoted in the guidebook text:
//   Window/Zoom  -> Zoom-Box, Zoom-In, Zoom-Out, Zoom-Standard, Zoom-Quadrant1,
//                   Zoom-User, Zoom-Trig, Zoom-Data, Zoom-Fit, Window Settings
//   Entry/Edit   -> Function, Equation (Line/Parabola/Circle/Ellipse/Hyperbola/
//                   Conic), Parametric, Polar, Scatter Plot, Sequence, Relation
//   Analyze      -> Zero, Minimum, Maximum, Intersection, Inflection (CAS),
//                   dy/dx, Integral, Bounded Area, Analyze Conics
//   View         -> Grid (Dot Grid / Lined Grid / No Grid)
//   Actions      -> Text, Attributes, Insert Slider, Select > Grid
// Everything else is RECONSTRUCTED.

const D = (k, label, ins) => ({ k, label, ins });
const S = (k, label, sub) => ({ k, label, sub });
const A = (k, label, act) => ({ k, label, ins: `\u0000${act}` });

export const GRAPHS_MENU = [
  S('1', 'Actions', [ // RECONSTRUCTED apart from Text / Attributes / Insert Slider
    A('1', 'Pointer', 'act:pointer'),
    A('2', 'Select', 'act:select'),
    A('3', 'Delete', 'act:delete'),
    A('4', 'Text', 'act:text'),
    A('5', 'Attributes', 'act:attributes'),
    A('6', 'Insert Slider', 'act:slider'),
    A('7', 'Delete All', 'act:deleteAll'),
  ]),

  S('2', 'View', [
    A('1', 'Graphing', 'view:graphing'),
    S('2', 'Grid', [
      A('1', 'No Grid', 'grid:none'),
      A('2', 'Dot Grid', 'grid:dot'),
      A('3', 'Lined Grid', 'grid:line'),
    ]),
    A('3', 'Show Axes', 'view:axes'),
    A('4', 'Axis End Values', 'view:endvalues'),
    A('5', 'Hide Entry Line', 'view:entryline'),
    A('6', 'Show Function Labels', 'view:labels'),
  ]),

  S('3', 'Graph Entry/Edit', [
    A('1', 'Function', 'entry:function'),
    S('2', 'Equation', [ // RECONSTRUCTED leaves under the verified categories
      A('1', 'Line', 'entry:line'),
      A('2', 'Parabola', 'entry:parabola'),
      A('3', 'Circle', 'entry:circle'),
      A('4', 'Ellipse', 'entry:ellipse'),
      A('5', 'Hyperbola', 'entry:hyperbola'),
      A('6', 'Conic', 'entry:conic'),
    ]),
    A('3', 'Parametric', 'entry:parametric'),
    A('4', 'Polar', 'entry:polar'),
    A('5', 'Scatter Plot', 'entry:scatter'),
    A('6', 'Sequence', 'entry:sequence'),
    A('7', 'Diff Eq', 'entry:diffeq'),
    A('8', 'Relation', 'entry:relation'),
  ]),

  S('4', 'Window / Zoom', [
    A('1', 'Window Settings', 'zoom:settings'),
    A('2', 'Zoom - Box', 'zoom:box'),
    A('3', 'Zoom - In', 'zoom:in'),
    A('4', 'Zoom - Out', 'zoom:out'),
    A('5', 'Zoom - Standard', 'zoom:standard'),
    A('6', 'Zoom - Quadrant 1', 'zoom:quadrant1'),
    A('7', 'Zoom - User', 'zoom:user'),
    A('8', 'Zoom - Trig', 'zoom:trig'),
    A('9', 'Zoom - Data', 'zoom:data'),
    A('A', 'Zoom - Fit', 'zoom:fit'),
    A('B', 'Zoom - Square', 'zoom:square'),
  ]),

  S('5', 'Trace', [
    A('1', 'Graph Trace', 'trace:on'),
    A('2', 'Trace Settings', 'trace:settings'),
    A('3', 'Trace Step', 'trace:step'),
    A('4', 'Path Plot', 'trace:path'),
  ]),

  S('6', 'Analyze Graph', [
    A('1', 'Zero', 'an:zero'),
    A('2', 'Minimum', 'an:min'),
    A('3', 'Maximum', 'an:max'),
    A('4', 'Intersection', 'an:intersect'),
    A('5', 'Inflection', 'an:inflection'),
    A('6', 'dy/dx', 'an:dydx'),
    A('7', 'Integral', 'an:integral'),
    A('8', 'Bounded Area', 'an:bounded'),
    A('9', 'Analyze Conics', 'an:conics'),
  ]),

  S('7', 'Table', [ // RECONSTRUCTED
    A('1', 'Split-screen Table', 'table:split'),
    A('2', 'Table Settings', 'table:settings'),
    A('3', 'Remove Table', 'table:remove'),
  ]),

  S('8', 'Geometry', [ // RECONSTRUCTED; the categories are quoted in the guidebook
    S('1', 'Points & Lines', [
      A('1', 'Point', 'geo:point'),
      A('2', 'Point On', 'geo:pointOn'),
      A('3', 'Intersection Points', 'geo:intersection'),
      A('4', 'Line', 'geo:line'),
      A('5', 'Segment', 'geo:segment'),
      A('6', 'Ray', 'geo:ray'),
      A('7', 'Tangent', 'geo:tangent'),
      A('8', 'Vector', 'geo:vector'),
      A('9', 'Circle Arc', 'geo:arc'),
    ]),
    S('2', 'Shapes', [
      A('1', 'Circle', 'geo:circle'),
      A('2', 'Triangle', 'geo:triangle'),
      A('3', 'Rectangle', 'geo:rectangle'),
      A('4', 'Polygon', 'geo:polygon'),
      A('5', 'Ellipse', 'geo:ellipseShape'),
      A('6', 'Parabola', 'geo:parabolaShape'),
    ]),
    S('3', 'Measurement', [
      A('1', 'Length', 'geo:length'),
      A('2', 'Area', 'geo:area'),
      A('3', 'Slope', 'geo:slope'),
      A('4', 'Angle', 'geo:angle'),
    ]),
  ]),

  D('9', 'Settings...', '\u0000settings'),

  { k: 'A', label: 'Hints', ins: '\u0000hints', sep: true },
];
