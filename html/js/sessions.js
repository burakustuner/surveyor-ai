/** -------------------------
 *  Session Management
 *  ------------------------- */
import { getState, saveState } from './state.js';
import { uid } from './utils.js';
import * as ui from './ui.js';

export function getActiveSession() {
  const state = getState();
  if (!state.activeSessionId) {
    const s = {
      id: uid(),
      name: "Yeni sohbet",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: state.selectedModel || "",
      templateId: state.selectedTemplateId,
      messages: []
    };
    state.sessions.unshift(s);
    state.activeSessionId = s.id;
    saveState();
  }
  return state.sessions.find(x => x.id === state.activeSessionId) || null;
}

export function setActiveSession(id) {
  const state = getState();
  state.activeSessionId = id;
  saveState();
  ui.renderAll();
}

export function createNewSession() {
  const state = getState();
  const s = {
    id: uid(),
    name: "Yeni sohbet",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: state.selectedModel || "",
    templateId: state.selectedTemplateId,
    messages: []
  };
  state.sessions.unshift(s);
  state.activeSessionId = s.id;
  saveState();
  return s;
}

export function clearActiveSession() {
  const s = getActiveSession();
  if (!s) return;
  s.messages = [];
  s.updatedAt = Date.now();
  s.name = "Yeni sohbet";
  saveState();
}

