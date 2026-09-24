// The document model: a document holds problems, a problem holds pages, and a
// page holds one application. Page tabs read "1.2" for problem 1, page 2,
// exactly as the handheld labels them.
//
// Variables are scoped per problem on the handheld ("adding problems enables
// you to reuse variable names"), which is why each problem carries its own
// variable snapshot.

import { setView } from './screen.js';
import { APP_BY_ID, APPS } from './apps/registry.js';
import { vars } from './math/engine.js';

export const doc = {
  name: 'Unsaved',
  dirty: false,
  problems: [],
  p: 0,      // current problem
  pg: 0,     // current page within it
};

export const page = () => doc.problems[doc.p]?.pages[doc.pg] ?? null;
export const pageLabel = () => `${doc.p + 1}.${doc.pg + 1}`;

export function pageCount() {
  return doc.problems.reduce((n, pr) => n + pr.pages.length, 0);
}

/* ------------------------------ building ------------------------------ */

export function newDocument(appId = 'calculator') {
  doc.name = 'Unsaved';
  doc.dirty = false;
  doc.problems = [{ vars: new Map(), pages: [] }];
  doc.p = 0;
  doc.pg = -1;
  vars.clear();
  addPage(appId);
}

export function addProblem(appId = 'calculator') {
  if (!doc.problems.length) { newDocument(appId); return; }
  saveProblemVars();
  doc.problems.push({ vars: new Map(), pages: [] });
  doc.p = doc.problems.length - 1;
  doc.pg = -1;
  vars.clear();
  addPage(appId);
}

export function addPage(appId = 'calculator') {
  const app = APP_BY_ID[appId];
  if (!app) return;
  // Inserting a page before any document exists starts one, rather than
  // throwing on an empty problem list.
  if (!doc.problems.length) {
    doc.problems = [{ vars: new Map(), pages: [] }];
    doc.p = 0;
    doc.pg = -1;
  }
  const pr = doc.problems[doc.p];
  pr.pages.splice(doc.pg + 1, 0, { appId, view: app.make() });
  doc.pg += 1;
  doc.dirty = true;
  show();
}

export function deletePage() {
  const pr = doc.problems[doc.p];
  if (!pr || pageCount() <= 1) return;
  pr.pages.splice(doc.pg, 1);
  if (!pr.pages.length) {
    doc.problems.splice(doc.p, 1);
    doc.p = Math.max(0, doc.p - 1);
    doc.pg = doc.problems[doc.p].pages.length - 1;
    loadProblemVars();
  } else {
    doc.pg = Math.min(doc.pg, pr.pages.length - 1);
  }
  doc.dirty = true;
  show();
}

/* ------------------------------ navigation ------------------------------ */

/** Flatten to a list of {p, pg} so next/previous can cross problems. */
export function allPages() {
  const out = [];
  doc.problems.forEach((pr, p) => pr.pages.forEach((_, pg) => out.push({ p, pg })));
  return out;
}

export function goTo(p, pg) {
  if (!doc.problems[p]?.pages[pg]) return;
  if (p !== doc.p) { saveProblemVars(); doc.p = p; loadProblemVars(); }
  doc.pg = pg;
  show();
}

export function step(dir) {
  const list = allPages();
  const i = list.findIndex((e) => e.p === doc.p && e.pg === doc.pg);
  const next = list[i + dir];
  if (next) goTo(next.p, next.pg);
}

/* ------------------------------ per-problem variables ------------------------------ */

function saveProblemVars() {
  const pr = doc.problems[doc.p];
  if (!pr) return;
  pr.vars = new Map(vars);
}

function loadProblemVars() {
  const pr = doc.problems[doc.p];
  vars.clear();
  if (pr) for (const [k, v] of pr.vars) vars.set(k, v);
}

/* ------------------------------ display ------------------------------ */

export function show() {
  const pg = page();
  if (!pg) return;
  const view = pg.view;
  view.tab = pageLabel();
  view.docName = `${doc.dirty ? '*' : ''}${doc.name}`;
  setView(view);
}

export const markDirty = () => { doc.dirty = true; };

/* ------------------------------ persistence ------------------------------ */

const KEY = 'opencx.documents';

export function listSaved() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Save the document skeleton plus whatever each application chooses to hand
 * back from `serialize()`. Applications without that hook simply restore empty.
 */
export function saveDocument(name) {
  saveProblemVars();
  const data = {
    name,
    problems: doc.problems.map((pr) => ({
      pages: pr.pages.map((pg) => ({
        appId: pg.appId,
        state: typeof pg.view.serialize === 'function' ? pg.view.serialize() : null,
      })),
    })),
  };
  const all = listSaved();
  all[name] = data;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) {
    return e.message;
  }
  doc.name = name;
  doc.dirty = false;
  show();
  return null;
}

export function openDocument(name) {
  const all = listSaved();
  const data = all[name];
  if (!data) return `"${name}" not found`;

  doc.name = name;
  doc.dirty = false;
  doc.problems = data.problems.map((pr) => ({
    vars: new Map(),
    pages: pr.pages.map((pg) => {
      const app = APP_BY_ID[pg.appId] ?? APP_BY_ID.calculator;
      const view = app.make();
      if (pg.state && typeof view.restore === 'function') view.restore(pg.state);
      return { appId: pg.appId, view };
    }),
  }));
  doc.p = 0;
  doc.pg = 0;
  vars.clear();
  show();
  return null;
}

export function deleteDocument(name) {
  const all = listSaved();
  delete all[name];
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

export const APP_CHOICES = APPS.map((a) => ({ id: a.id, name: a.name }));
