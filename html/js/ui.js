/** -------------------------
 *  UI Rendering Functions
 *  ------------------------- */
import { getState, saveState } from './state.js';
import { getActiveSession, setActiveSession, createNewSession, clearActiveSession } from './sessions.js';
import { renderTemplates } from './templates.js';
import { clamp, escapeHtml, nowStr } from './utils.js';
import * as dom from './dom.js';

export function setStatus(ok, text) {
  const statusDot = dom.getStatusDotEl();
  const rightHint = dom.getRightHintEl();
  statusDot.style.background = ok ? "rgba(34,197,94,.85)" : "rgba(239,68,68,.85)";
  statusDot.style.boxShadow = ok ? "0 0 0 3px rgba(34,197,94,.15)" : "0 0 0 3px rgba(239,68,68,.15)";
  rightHint.textContent = text;
}

export function addBubble(type, who, text, metaTag) {
  const chatEl = dom.getChatEl();
  const div = document.createElement("div");
  div.className = `bubble ${type}`;
  const meta = document.createElement("div");
  meta.className = "meta";
  const t = nowStr().split(" ").pop();
  meta.innerHTML =
    `<span class="who">${escapeHtml(who)}</span>` +
    (metaTag ? ` <span class="time">${escapeHtml(metaTag)}</span>` : "") +
    ` <span class="time">${escapeHtml(t)}</span>`;
  div.appendChild(meta);

  const body = document.createElement("div");
  body.textContent = text;
  div.appendChild(body);

  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return { div, body };
}

export function addThinking(metaTag) {
  const chatEl = dom.getChatEl();
  const div = document.createElement("div");
  div.className = "bubble bot";
  div.innerHTML = `
    <div class="meta">
      <span class="who">Ollama</span>
      ${metaTag ? `<span class="time">${escapeHtml(metaTag)}</span>` : ""}
      <span class="time" id="timerTag">düşünüyor… 0.0s</span>
    </div>
    <div class="typingDots" aria-label="thinking">
      <span class="td"></span><span class="td"></span><span class="td"></span>
    </div>
  `;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  const timerTag = div.querySelector("#timerTag");
  return { div, timerTag };
}

export function renderSessions() {
  const state = getState();
  const sessionsEl = dom.getSessionsEl();
  const sessCountEl = dom.getSessCountEl();
  sessCountEl.textContent = String(state.sessions.length);
  sessionsEl.innerHTML = "";

  if (state.sessions.length === 0) {
    const p = document.createElement("div");
    p.className = "smallMuted";
    p.textContent = "Henüz sohbet yok. \"Yeni sohbet\" ile başla.";
    sessionsEl.appendChild(p);
    return;
  }

  for (const s of state.sessions) {
    const el = document.createElement("div");
    el.className = "sess";
    el.onclick = () => setActiveSession(s.id);

    const left = document.createElement("div");
    left.className = "left";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = s.name || "Sohbet";
    left.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "meta";
    const d = new Date(s.updatedAt || s.createdAt || Date.now());
    meta.innerHTML = `${escapeHtml(d.toLocaleString("tr-TR", { hour12: false }))} • ${escapeHtml(String(s.messages?.length || 0))} mesaj`;
    left.appendChild(meta);

    const tag = document.createElement("span");
    tag.className = "tagMini";
    tag.textContent = s.model || "-";

    el.appendChild(left);
    el.appendChild(tag);

    if (s.id === state.activeSessionId) {
      el.style.outline = "2px solid rgba(59,130,246,.35)";
      el.style.background = "rgba(59,130,246,.10)";
    }

    sessionsEl.appendChild(el);
  }
}

export function renderChat() {
  const state = getState();
  const chatEl = dom.getChatEl();
  const chatTitleEl = dom.getChatTitleEl();
  const chatSubEl = dom.getChatSubEl();
  chatEl.innerHTML = "";
  const s = getActiveSession();
  if (!s) return;

  chatTitleEl.textContent = s.name || "Sohbet";
  const upd = new Date(s.updatedAt || Date.now()).toLocaleString("tr-TR", { hour12: false });
  const streamTxt = state.stream ? "Streaming aktif" : "Streaming kapalı";
  chatSubEl.textContent = `Son güncelleme: ${upd} • Enter gönderir • Shift+Enter alt satır • ${streamTxt}`;

  if (!s.messages || s.messages.length === 0) {
    addBubble("bot", "Ollama", "Hazırım. Bir şey sor 🙂", "local");
    return;
  }

  for (const m of s.messages) {
    if (m.role === "user") {
      addBubble("me", "Sen", m.content, m.model ? `model: ${m.model}` : "");
    } else if (m.role === "assistant") {
      addBubble("bot", "Ollama", m.content, m.model ? `model: ${m.model}` : "");
    } else if (m.role === "error") {
      addBubble("err", "Hata", m.content, "http");
    }
  }
}

export function renderControls() {
  const state = getState();
  renderTemplates();

  const ctxEl = dom.getCtxEl();
  const tempEl = dom.getTempEl();
  const historyLimitEl = dom.getHistoryLimitEl();
  const ctxPill = dom.getCtxPill();
  const tempPill = dom.getTempPill();
  const topCtx = dom.getTopCtx();
  const topTemp = dom.getTopTemp();
  const toggleStreamBtn = dom.getToggleStreamBtn();
  const streamPill = dom.getStreamPill();

  ctxEl.value = String(clamp(Number(state.num_ctx) || 4096, 256, 32768));
  tempEl.value = String(clamp(Number(state.temperature) || 0.7, 0, 1.5));
  historyLimitEl.value = String(clamp(Number(state.historyLimit) || 16, 0, 50));

  ctxPill.textContent = `ctx: ${ctxEl.value}`;
  tempPill.textContent = `temp: ${Number(tempEl.value).toFixed(2)}`;
  topCtx.textContent = `ctx: ${ctxEl.value}`;
  topTemp.textContent = `temp: ${Number(tempEl.value).toFixed(2)}`;

  if (state.stream) {
    toggleStreamBtn.textContent = "Aktif";
    toggleStreamBtn.classList.add("primary");
    streamPill.textContent = "stream: on";
  } else {
    toggleStreamBtn.textContent = "Kapalı";
    toggleStreamBtn.classList.remove("primary");
    streamPill.textContent = "stream: off";
  }
}

export function renderAll() {
  renderControls();
  renderSessions();
  renderChat();
}

export function showLoginUI() {
  const loginSection = dom.getLoginSection();
  const userSection = dom.getUserSection();
  const rateLimitInfoEl = dom.getRateLimitInfoEl();
  if (loginSection) loginSection.style.display = "block";
  if (userSection) userSection.style.display = "none";
  if (rateLimitInfoEl) rateLimitInfoEl.textContent = "Giriş gerekli";
}

export function updateUserUI(user) {
  const loginSection = dom.getLoginSection();
  const userSection = dom.getUserSection();
  const userNameEl = dom.getUserNameEl();
  const userEmailEl = dom.getUserEmailEl();
  const userPictureEl = dom.getUserPictureEl();
  
  if (loginSection) loginSection.style.display = "none";
  if (userSection) userSection.style.display = "block";
  if (userNameEl) userNameEl.textContent = user.name || user.email || "Kullanıcı";
  if (userEmailEl) userEmailEl.textContent = user.email || "@burakustuner.com";

  if (userPictureEl) {
    if (user.picture) {
      userPictureEl.src = user.picture;
      userPictureEl.style.display = "block";
    } else {
      userPictureEl.style.display = "none";
    }
  }
}

export function updateRateLimitDisplay(data) {
  const remaining = data.remaining || 0;
  const limit = data.limit || 100;
  const resetDate = new Date(data.reset_at * 1000);
  const resetTime = resetDate.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' });
  const rateLimitInfoEl = dom.getRateLimitInfoEl();
  if (rateLimitInfoEl) {
    rateLimitInfoEl.textContent = `${remaining}/${limit} (${resetTime})`;
  }
}

export async function loadModels() {
  const state = getState();
  const modelEl = dom.getModelEl();
  const modelHintEl = dom.getModelHintEl();
  const { getAuthHeaders } = await import('./api.js');
  const { showLoginUI: authShowLoginUI } = await import('./auth.js');

  try {
    modelHintEl.textContent = "Ollama'dan modeller çekiliyor…";
    const res = await fetch("/api/tags", {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) {
        authShowLoginUI();
        throw new Error("Giriş yapmanız gerekiyor");
      }
      throw new Error(await res.text());
    }
    const data = await res.json();
    const models = (data?.models || []).map(m => m.name).filter(Boolean);

    state.lastModels = models;
    saveState();

    modelEl.innerHTML = "";
    if (models.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Model yok (ollama pull …)";
      modelEl.appendChild(opt);
      modelHintEl.textContent = "Henüz model bulunamadı. Sunucuda 'ollama pull ...' ile indir.";
      setStatus(false, "Model bulunamadı");
      return;
    }

    for (const name of models) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      modelEl.appendChild(opt);
    }

    if (!state.selectedModel || !models.includes(state.selectedModel)) {
      state.selectedModel = models[0];
      saveState();
    }
    modelEl.value = state.selectedModel;
    modelHintEl.textContent = `Bulunan modeller: ${models.length}`;
    setStatus(true, "Hazır");
  } catch (e) {
    modelEl.innerHTML = "";
    const models = state.lastModels || [];
    if (models.length) {
      for (const name of models) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        modelEl.appendChild(opt);
      }
      modelEl.value = state.selectedModel || models[0];
      modelHintEl.textContent = "Ollama erişimi yok gibi; son kayıtlı liste kullanılıyor.";
    } else {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Model yüklenemedi";
      modelEl.appendChild(opt);
      modelHintEl.textContent = "Ollama /api/tags alınamadı. Nginx proxy veya Ollama çalışmıyor olabilir.";
    }
    setStatus(false, "Bağlantı sorunu");
  }
}

