// Screen framework: owns the 320x240 panel, the title bar, and a stack of
// views.  A view is { id, title, mount(host), onKey(ev), unmount? } and gets
// every key event that the keypad produces while it is on top.

const panel = () => document.getElementById('panel');

const stack = [];

// A modal (menu, palette, dialog) floats over the active view and gets keys first.
let modal = null;

export function current() {
  return stack[stack.length - 1] ?? null;
}

export function setModal(m) {
  modal = m;
  draw();
}

export function clearModal() {
  modal = null;
  draw();
}

export function currentModal() {
  return modal;
}

function renderChrome(view) {
  const host = panel();
  host.innerHTML = '';

  const bar = document.createElement('div');
  bar.className = 'tbar';
  // Inside a document the bar reads "1.1 *Unsaved", the way the handheld
  // labels the current page; elsewhere it just names the screen.
  const centre = view.tab
    ? `<span class="tbar-tab">${view.tab}</span>${view.docName ?? ''}<span class="caret">▽</span>`
    : (view.title ?? '');
  bar.innerHTML =
    '<div class="tbar-home"></div>' +
    `<div class="tbar-title">${centre}</div>` +
    '<div class="tbar-batt"></div>';
  host.appendChild(bar);

  const body = document.createElement('div');
  body.className = 'app-body';
  host.appendChild(body);
  return body;
}

function draw() {
  const view = current();
  if (!view) return;
  const body = renderChrome(view);
  view.mount(body);
  if (modal) {
    const layer = document.createElement('div');
    layer.className = 'modal-layer';
    panel().appendChild(layer);
    modal.mount(layer);
  }
}

/** Replace the whole stack with one view. */
export function setView(view) {
  modal = null;
  while (stack.length) stack.pop().unmount?.();
  stack.push(view);
  draw();
}

/** Push a view on top of the current one (esc pops back). */
export function pushView(view) {
  stack.push(view);
  draw();
}

/** Pop the top view.  Returns false when there is nothing to pop. */
export function popView() {
  if (stack.length < 2) return false;
  stack.pop().unmount?.();
  draw();
  return true;
}

/** Re-render the current view in place (after it mutates its own state). */
export function refresh() {
  draw();
}

/** Route a key event from the keypad: modal first, then the active view. */
export function dispatch(ev) {
  if (modal) {
    if (modal.onKey?.(ev) === true) return;
    if (ev.id === 'esc') { clearModal(); return; }
    return; // a modal swallows everything else
  }
  const view = current();
  if (!view) return;
  if (view.onKey?.(ev) === true) return; // view consumed it
  if (ev.id === 'esc') popView();
}
