/** -------------------------
 *  Main Application
 *  ------------------------- */
import { getState, saveState } from './state.js';
import { getActiveSession, createNewSession, clearActiveSession } from './sessions.js';
import { uid, clamp } from './utils.js';
import { initGoogleSignIn, handleOAuthCallback, verifyToken, signOut } from './auth.js';
import { loadModels, renderAll, renderControls, renderChat, renderSessions } from './ui.js';
import * as dom from './dom.js';
import * as chat from './chat.js';
import { getTemplateById } from './templates.js';
import { DEFAULT_TEMPLATES } from './config.js';

function init() {
  dom.initDOM();

  const state = getState();
  if (!state.sessions || state.sessions.length === 0) {
    const s = {
      id: uid(),
      name: "Yeni sohbet",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: state.selectedModel || "",
      templateId: state.selectedTemplateId,
      messages: []
    };
    state.sessions = [s];
    state.activeSessionId = s.id;
    saveState();
  } else if (!state.activeSessionId) {
    state.activeSessionId = state.sessions[0].id;
    saveState();
  }

  renderAll();
  dom.autoGrow();
  const msgEl = dom.getMsgEl();
  if (msgEl) msgEl.focus();

  msgEl?.addEventListener("input", dom.autoGrow);

  const modelEl = dom.getModelEl();
  modelEl?.addEventListener("change", () => {
    const state = getState();
    state.selectedModel = modelEl.value;
    const s = getActiveSession();
    if (s) {
      s.model = state.selectedModel;
      s.updatedAt = Date.now();
    }
    saveState();
    renderSessions();
  });

  const templateEl = dom.getTemplateEl();
  templateEl?.addEventListener("change", () => {
    const state = getState();
    state.selectedTemplateId = templateEl.value;
    const s = getActiveSession();
    if (s) {
      s.templateId = state.selectedTemplateId;
      s.updatedAt = Date.now();
    }
    saveState();
  });

  const ctxEl = dom.getCtxEl();
  ctxEl?.addEventListener("input", () => {
    const state = getState();
    state.num_ctx = clamp(Number(ctxEl.value) || 4096, 256, 32768);
    saveState();
    const ctxPill = dom.getCtxPill();
    const topCtx = dom.getTopCtx();
    ctxPill.textContent = `ctx: ${state.num_ctx}`;
    topCtx.textContent = `ctx: ${state.num_ctx}`;
  });

  const tempEl = dom.getTempEl();
  tempEl?.addEventListener("input", () => {
    const state = getState();
    state.temperature = clamp(Number(tempEl.value) || 0.7, 0, 1.5);
    saveState();
    const t = state.temperature.toFixed(2);
    const tempPill = dom.getTempPill();
    const topTemp = dom.getTopTemp();
    tempPill.textContent = `temp: ${t}`;
    topTemp.textContent = `temp: ${t}`;
  });

  const historyLimitEl = dom.getHistoryLimitEl();
  historyLimitEl?.addEventListener("input", () => {
    const state = getState();
    state.historyLimit = clamp(Number(historyLimitEl.value) || 0, 0, 50);
    saveState();
  });

  const toggleStreamBtn = dom.getToggleStreamBtn();
  toggleStreamBtn?.addEventListener("click", () => {
    const state = getState();
    state.stream = !state.stream;
    saveState();
    renderControls();
    renderChat();
  });

  const newChatBtn = dom.getNewChatBtn();
  newChatBtn?.addEventListener("click", () => {
    createNewSession();
    renderAll();
    msgEl?.focus();
  });

  const clearChatBtn = dom.getClearChatBtn();
  clearChatBtn?.addEventListener("click", () => {
    clearActiveSession();
    renderAll();
    msgEl?.focus();
  });

  const sendBtnTop = dom.getSendBtnTop();
  sendBtnTop?.addEventListener("click", () => {
    const text = msgEl?.value.trim();
    if (!text) return;
    msgEl.value = "";
    dom.autoGrow();
    chat.ask(text);
  });

  msgEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtnTop?.click();
    }
  });

  const modalWrap = dom.getModalWrap();
  const openSettingsBtn = dom.getOpenSettingsBtn();
  const closeSettingsBtn = dom.getCloseSettingsBtn();
  const saveSettingsBtn = dom.getSaveSettingsBtn();
  const templateTextEl = dom.getTemplateTextEl();
  const newTemplateNameEl = dom.getNewTemplateNameEl();
  const newTemplateTextEl = dom.getNewTemplateTextEl();
  const addTemplateBtn = dom.getAddTemplateBtn();
  const deleteTemplateBtn = dom.getDeleteTemplateBtn();

  function openModal() {
    modalWrap.style.display = "grid";
    const state = getState();
    const tid = state.selectedTemplateId;
    templateTextEl.value = state.templateOverride?.[tid] ?? getTemplateById(tid)?.system ?? "";
  }

  function closeModal() {
    modalWrap.style.display = "none";
  }

  openSettingsBtn.onclick = openModal;
  closeSettingsBtn.onclick = closeModal;
  modalWrap.addEventListener("click", (e) => {
    if (e.target === modalWrap) closeModal();
  });

  saveSettingsBtn.onclick = () => {
    const state = getState();
    const tid = state.selectedTemplateId;
    state.templateOverride = state.templateOverride || {};
    state.templateOverride[tid] = templateTextEl.value;
    saveState();
    closeModal();
  };

  addTemplateBtn.onclick = () => {
    const state = getState();
    const name = (newTemplateNameEl.value || "").trim();
    const txt = (newTemplateTextEl.value || "").trim();
    if (!name || !txt) {
      alert("Şablon adı ve içeriği boş olamaz.");
      return;
    }
    const t = { id: uid(), name, system: txt };
    state.templates.push(t);
    state.selectedTemplateId = t.id;
    newTemplateNameEl.value = "";
    newTemplateTextEl.value = "";
    saveState();
    renderAll();
    openModal();
  };

  deleteTemplateBtn.onclick = () => {
    const state = getState();
    const tid = state.selectedTemplateId;
    const t = getTemplateById(tid);
    if (!t) return;
    const ok = confirm(`"${t.name}" şablonu silinsin mi?`);
    if (!ok) return;

    state.templates = state.templates.filter(x => x.id !== tid);
    delete (state.templateOverride || {})[tid];
    if (state.templates.length === 0) {
      state.templates = [...DEFAULT_TEMPLATES];
    }
    state.selectedTemplateId = state.templates[0].id;
    saveState();
    renderAll();
    openModal();
  };

  document.getElementById("googleSignOut")?.addEventListener("click", signOut);

  if (window.location.hash.includes('id_token=')) {
    handleOAuthCallback();
  } else {
    const storedToken = localStorage.getItem("google_token");
    if (storedToken) {
      console.log("Found stored token on page load, verifying...");
      verifyToken(storedToken);
    } else {
      renderAll();
    }
  }

  console.log("Initializing Google Sign-In...");
  console.log("Google object:", typeof google !== 'undefined' ? "loaded" : "not loaded");

  function waitForGoogle() {
    if (typeof google !== 'undefined' && google.accounts) {
      console.log("Google script is ready");
      initGoogleSignIn();
    } else {
      console.log("Waiting for Google script...");
      setTimeout(waitForGoogle, 500);
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('load', () => {
      setTimeout(waitForGoogle, 1000);
    });
  } else {
    setTimeout(waitForGoogle, 1000);
  }

  loadModels();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

