/** -------------------------
 *  Template Management
 *  ------------------------- */
import { getState, saveState } from './state.js';
import { uid } from './utils.js';
import * as dom from './dom.js';

export function getTemplateById(id) {
  const state = getState();
  return state.templates.find(t => t.id === id) || state.templates[0];
}

export function getEffectiveSystemPrompt() {
  const state = getState();
  const tid = state.selectedTemplateId;
  const base = getTemplateById(tid)?.system ?? "";
  const override = state.templateOverride?.[tid];
  return (override && override.trim().length) ? override : base;
}

export function renderTemplates() {
  const state = getState();
  const templateEl = dom.getTemplateEl();
  templateEl.innerHTML = "";
  for (const t of state.templates) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    templateEl.appendChild(opt);
  }
  templateEl.value = state.selectedTemplateId;
}

export function addTemplate(name, system) {
  const state = getState();
  const t = { id: uid(), name, system: system };
  state.templates.push(t);
  state.selectedTemplateId = t.id;
  saveState();
}

export async function deleteTemplate(id) {
  const state = getState();
  state.templates = state.templates.filter(x => x.id !== id);
  delete (state.templateOverride || {})[id];
  if (state.templates.length === 0) {
    const { DEFAULT_TEMPLATES } = await import('./config.js');
    state.templates = [...DEFAULT_TEMPLATES];
  }
  state.selectedTemplateId = state.templates[0].id;
  saveState();
}

