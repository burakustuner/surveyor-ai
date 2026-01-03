/** -------------------------
 *  State Management
 *  ------------------------- */
import { STORE_KEY, DEFAULT_TEMPLATES } from './config.js';

let state = loadState();
let aborter = null;

export function getState() {
  return state;
}

export function setState(newState) {
  state = { ...state, ...newState };
  saveState();
}

export function getAborter() {
  return aborter;
}

export function setAborter(controller) {
  aborter = controller;
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return {
      stream: s.stream ?? true,
      num_ctx: s.num_ctx ?? 4096,
      temperature: s.temperature ?? 0.7,
      historyLimit: s.historyLimit ?? 16,
      templates: s.templates ?? DEFAULT_TEMPLATES,
      templateOverride: s.templateOverride ?? {},
      sessions: s.sessions ?? [],
      activeSessionId: s.activeSessionId ?? null,
      lastModels: s.lastModels ?? [],
      selectedModel: s.selectedModel ?? "",
      selectedTemplateId: s.selectedTemplateId ?? (s.templates?.[0]?.id ?? DEFAULT_TEMPLATES[0].id),
    };
  } catch {
    return {
      stream: true,
      num_ctx: 4096,
      temperature: 0.7,
      historyLimit: 16,
      templates: DEFAULT_TEMPLATES,
      templateOverride: {},
      sessions: [],
      activeSessionId: null,
      lastModels: [],
      selectedModel: "",
      selectedTemplateId: DEFAULT_TEMPLATES[0].id
    };
  }
}

export function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

