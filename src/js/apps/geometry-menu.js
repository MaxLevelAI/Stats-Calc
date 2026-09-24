// Geometry application menu.
//
// The nine top-level entries are VERIFIED from TI's own screenshot in the
// Student Software Guidebook (research/pdfimg/ge257_img503.png):
//   1 Actions, 2 View, 3 Trace, 4 Points & Lines, 5 Shapes,
//   6 Measurement, 7 Construction, 8 Transformation, 9 Settings...
//
// Tool names are quoted in the guidebook text:
//   Points & Lines -> Point, Point On, Intersection Points, Line, Segment,
//                     Ray, Tangent, Vector, Circle Arc, Point by Coordinates
//   Shapes         -> Circle, Triangle, Rectangle, Polygon, Ellipse, Parabola
//   Measurement    -> Length, Area, Slope, Angle, Directed Angle
//   Construction   -> Midpoint, Parallel, Perpendicular, Perpendicular
//                     Bisector, Angle Bisector, Locus, Compass,
//                     Measurement Transfer
//   Transformation -> Symmetry, Reflection, Translation, Rotation, Dilation
// Ordering within each submenu is RECONSTRUCTED.

const D = (k, label, ins) => ({ k, label, ins });
const S = (k, label, sub) => ({ k, label, sub });
const T = (k, label, tool) => ({ k, label, ins: `\u0000tool:${tool}` });
const A = (k, label, act) => ({ k, label, ins: `\u0000${act}` });

export const GEOMETRY_MENU = [
  S('1', 'Actions', [
    T('1', 'Pointer', 'pointer'),
    T('2', 'Select', 'pointer'),
    T('3', 'Delete', 'delete'),
    A('4', 'Text', 'act:text'),
    A('5', 'Attributes', 'act:attributes'),
    A('6', 'Insert Slider', 'act:slider'),
    A('7', 'Delete All', 'act:deleteAll'),
  ]),

  S('2', 'View', [
    A('1', 'Show Labels', 'view:labels'),
    A('2', 'Hide / Show', 'view:hideshow'),
    S('3', 'Grid', [
      A('1', 'No Grid', 'grid:none'),
      A('2', 'Dot Grid', 'grid:dot'),
      A('3', 'Lined Grid', 'grid:line'),
    ]),
    A('4', 'Show Scale', 'view:scale'),
  ]),

  S('3', 'Trace', [
    A('1', 'Geometry Trace', 'trace:on'),
    A('2', 'Erase Geometry Trace', 'trace:erase'),
  ]),

  S('4', 'Points & Lines', [
    T('1', 'Point', 'point'),
    T('2', 'Point On', 'pointOn'),
    T('3', 'Intersection Points', 'intersection'),
    T('4', 'Line', 'line'),
    T('5', 'Segment', 'segment'),
    T('6', 'Ray', 'ray'),
    T('7', 'Tangent', 'tangent'),
    T('8', 'Vector', 'vector'),
    T('9', 'Circle Arc', 'arc'),
  ]),

  S('5', 'Shapes', [
    T('1', 'Circle', 'circle'),
    T('2', 'Triangle', 'triangle'),
    T('3', 'Rectangle', 'rectangle'),
    T('4', 'Polygon', 'polygon'),
    T('5', 'Regular Polygon', 'regular'),
    A('6', 'Ellipse', 'todo:Ellipse'),
    A('7', 'Parabola', 'todo:Parabola'),
  ]),

  S('6', 'Measurement', [
    T('1', 'Length', 'length'),
    T('2', 'Area', 'area'),
    T('3', 'Slope', 'slopeM'),
    T('4', 'Angle', 'angle'),
    T('5', 'Directed Angle', 'dangle'),
  ]),

  S('7', 'Construction', [
    T('1', 'Midpoint', 'midpoint'),
    T('2', 'Parallel', 'parallel'),
    T('3', 'Perpendicular', 'perpendicular'),
    T('4', 'Perpendicular Bisector', 'perpBisector'),
    T('5', 'Angle Bisector', 'angleBisector'),
    A('6', 'Locus', 'todo:Locus'),
    A('7', 'Compass', 'todo:Compass'),
    A('8', 'Measurement Transfer', 'todo:Measurement Transfer'),
  ]),

  S('8', 'Transformation', [
    T('1', 'Symmetry', 'symmetry'),
    T('2', 'Reflection', 'reflection'),
    T('3', 'Translation', 'translation'),
    T('4', 'Rotation', 'rotation'),
    T('5', 'Dilation', 'dilation'),
  ]),

  D('9', 'Settings...', '\u0000settings'),

  { k: 'A', label: 'Hints', ins: '\u0000hints', sep: true },
];
