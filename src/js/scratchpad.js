// The Scratchpad: a Calculate page and a Graph page that live outside the
// document model, reached with A / B from Home or the scratchpad key.

import { pushView } from './screen.js';
import { makeCalculatorView } from './apps/calculator.js';
import { makeGraphsView } from './apps/graphs.js';

let lastPage = 'calculator';

export function openScratchpad(page = lastPage) {
  lastPage = page;
  if (page === 'graphs') {
    const gv = makeGraphsView();
    gv.id = 'scratch-graph';
    gv.title = 'Scratchpad – Graph';
    pushView(gv);
    return;
  }
  const v = makeCalculatorView();
  v.id = 'scratch-calc';
  v.title = 'Scratchpad – Calculate';
  pushView(v);
}

export function toggleScratchpad() {
  openScratchpad(lastPage);
}
