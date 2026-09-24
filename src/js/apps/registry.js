// The seven applications, in dock order.  `tone` picks the icon colour class.

import { pushView } from '../screen.js';
import { makeCalculatorView } from './calculator.js';
import { makeListsView } from './lists.js';
import { makeDataStatsView } from './data-stats.js';
import { makeGraphsView } from './graphs.js';
import { makeGeometryView } from './geometry.js';
import { makeNotesView } from './notes.js';

function placeholder(name, note) {
  return () => ({
    id: 'ph-' + name,
    title: name,
    mount(host) {
      host.innerHTML =
        `<div class="placeholder"><b>${name}</b><span>${note}</span>` +
        '<span>esc returns to Home</span></div>';
    },
  });
}

export const APPS = [
  { id: 'calculator', name: 'Calculator', tone: 'calc', make: makeCalculatorView },
  { id: 'graphs', name: 'Graphs', tone: 'graph', make: makeGraphsView },
  { id: 'geometry', name: 'Geometry', tone: 'geo', make: makeGeometryView },
  { id: 'lists', name: 'Lists & Spreadsheet', tone: 'lists', make: makeListsView },
  { id: 'stats', name: 'Data & Statistics', tone: 'stats', make: makeDataStatsView },
  { id: 'notes', name: 'Notes', tone: 'notes', make: makeNotesView },
  { id: 'dataquest', name: 'Data Collection', tone: 'quest', make: placeholder('Data Collection', 'not built yet') },
];

export const APP_BY_ID = Object.fromEntries(APPS.map((a) => [a.id, a]));

export function openApp(id) {
  const app = APP_BY_ID[id];
  if (!app) return;
  // Choosing an application from Home opens it as a page in the document.
  import('../doc.js').then((D) => {
    if (D.page()) D.addPage(id);
    else D.newDocument(id);
  });
}
