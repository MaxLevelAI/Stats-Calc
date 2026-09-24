import { t, group } from './harness.mjs';
import * as G from '../src/js/geom.js';

const P = G.pt;
const n = (v, d = 4) => Number(v).toFixed(d);
const show = (p) => (p ? `${n(p.x)},${n(p.y)}` : 'null');

group('basics');
t('distance', G.dist(P(0, 0), P(3, 4)), 5);
t('midpoint', show(G.mid(P(0, 0), P(4, 6))), '2.0000,3.0000');
t('slope inverts screen y', G.slope(P(0, 0), P(1, -1)), 1);
t('vertical slope', G.slope(P(2, 0), P(2, 5)), Infinity);

group('angles');
t('right angle', n(G.angleAt(P(1, 0), P(0, 0), P(0, 1))), '90.0000');
t('straight angle', n(G.angleAt(P(1, 0), P(0, 0), P(-1, 0))), '180.0000');
t('45 degrees', n(G.angleAt(P(1, 0), P(0, 0), P(1, -1))), '45.0000');
t('directed angle sign', G.directedAngle(P(1, 0), P(0, 0), P(0, -1)) > 0, true);

group('lines');
t('intersection', show(G.intersectLines(P(0, 0), P(4, 4), P(0, 4), P(4, 0))), '2.0000,2.0000');
t('parallel lines do not meet', G.intersectLines(P(0, 0), P(1, 0), P(0, 1), P(1, 1)), null);
t('perpendicular foot', show(G.perpFoot(P(2, 3), P(0, 0), P(4, 0))), '2.0000,0.0000');
t('distance to line', n(G.distToLine(P(2, 3), P(0, 0), P(4, 0))), '3.0000');
t('distance to segment clamps', n(G.distToSegment(P(10, 0), P(0, 0), P(4, 0))), '6.0000');

group('clipping');
const rect = { x0: 0, y0: 0, x1: 100, y1: 100 };
const clipped = G.clipLine(P(50, 50), P(60, 50), rect);
t('horizontal line spans the box', `${n(clipped[0].x, 1)}..${n(clipped[1].x, 1)}`, '0.0..100.0');
t('ray starts at its origin', n(G.clipRay(P(50, 50), P(60, 50), rect)[0].x, 1), '50.0');

group('circles');
t('line meets circle twice', G.intersectLineCircle(P(-10, 0), P(10, 0), P(0, 0), 5).length, 2);
t('and at the right places',
  G.intersectLineCircle(P(-10, 0), P(10, 0), P(0, 0), 5).map((p) => n(p.x, 1)).sort().join(','),
  '-5.0,5.0');
t('circles meet twice', G.intersectCircles(P(0, 0), 5, P(6, 0), 5).length, 2);
t('distant circles miss', G.intersectCircles(P(0, 0), 1, P(10, 0), 1).length, 0);

group('transformations');
t('reflect across a horizontal line', show(G.reflectPoint(P(3, 2), P(0, 0), P(10, 0))), '3.0000,-2.0000');
t('point symmetry', show(G.symmetryPoint(P(3, 2), P(0, 0))), '-3.0000,-2.0000');
t('rotate 90 degrees', show(G.rotatePoint(P(1, 0), P(0, 0), 90)), '0.0000,-1.0000');
t('dilate by 2', show(G.dilatePoint(P(2, 3), P(0, 0), 2)), '4.0000,6.0000');
t('translate', show(G.translatePoint(P(1, 1), P(2, 3))), '3.0000,4.0000');

group('constructions');
const bis = G.angleBisectorDir(P(1, 0), P(0, 0), P(0, -1));
t('bisector of a right angle', `${n(bis.x, 3)},${n(bis.y, 3)}`, '0.707,-0.707');
t('area of a unit square', G.polygonArea([P(0, 0), P(2, 0), P(2, 2), P(0, 2)]), 4);
t('perimeter', G.polygonPerimeter([P(0, 0), P(2, 0), P(2, 2), P(0, 2)]), 8);
