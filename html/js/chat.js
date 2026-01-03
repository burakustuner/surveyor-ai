/** -------------------------
 *  Chat Functions
 *  ------------------------- */
import { getState, saveState, getAborter, setAborter } from './state.js';
import { getActiveSession, clearActiveSession } from './sessions.js';
import { getEffectiveSystemPrompt } from './templates.js';
import { clamp, summarizeTitleFromText } from './utils.js';
import { getAuthHeaders } from './api.js';
import { updateRateLimitFromHeaders, loadRateLimitInfo, showLoginUI } from './auth.js';
import * as ui from './ui.js';
import * as dom from './dom.js';

export function buildMessages(prompt) {
  const s = getActiveSession();
  const system = getEffectiveSystemPrompt();
  const state = getState();
  const messages = [];

  if (system && system.trim().length) {
    messages.push({ role: "system", content: system.trim() });
  }

  const limit = clamp(Number(state.historyLimit) || 0, 0, 50);

  if (limit > 0 && s?.messages?.length) {
    const filtered = s.messages.filter(m => m.role === "user" || m.role === "assistant");
    const last = filtered.slice(-limit);
    for (const m of last) {
      messages.push({ role: m.role, content: m.content });
    }
  }

  messages.push({ role: "user", content: prompt });
  return messages;
}

export async function ask(prompt) {
  const s = getActiveSession();
  if (!s) return;

  const state = getState();
  const model = state.selectedModel;
  if (!model) {
    ui.addBubble("err", "Hata", "Model seçili değil. /api/tags ile model çekilemedi.", "http");
    return;
  }

  if (!s.name || s.name === "Yeni sohbet") {
    s.name = summarizeTitleFromText(prompt);
  }
  s.model = model;
  s.templateId = state.selectedTemplateId;

  s.messages.push({ role: "user", content: prompt, ts: Date.now(), model });
  s.updatedAt = Date.now();
  saveState();
  ui.renderChat();
  ui.renderSessions();

  ui.setStatus(true, "İstek gönderiliyor…");

  const started = performance.now();
  const thinking = ui.addThinking(`model: ${model}`);
  const timer = setInterval(() => {
    const secs = (performance.now() - started) / 1000;
    thinking.timerTag.textContent = `düşünüyor… ${secs.toFixed(1)}s`;
  }, 120);

  let assistantText = "";
  let assistantBubble = null;
  let firstChunkSeen = false;

  if (getAborter()) getAborter().abort();
  const aborter = new AbortController();
  setAborter(aborter);

  const payload = {
    model,
    messages: buildMessages(prompt),
    stream: !!state.stream,
    options: {
      num_ctx: Number(state.num_ctx) || 4096,
      temperature: Number(state.temperature) || 0.7
    }
  };

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      signal: aborter.signal
    });

    if (!res.ok) {
      clearInterval(timer);
      const t = await res.text();
      thinking.div.remove();
      if (assistantBubble?.div) assistantBubble.div.remove();

      if (res.status === 401) {
        ui.addBubble("err", "Hata", "Giriş yapmanız gerekiyor. Lütfen Google ile giriş yapın.", "auth");
        showLoginUI();
      } else if (res.status === 429) {
        const data = JSON.parse(t || "{}");
        ui.addBubble("err", "Hata", `Rate limit aşıldı. ${data.reset_at ? new Date(data.reset_at * 1000).toLocaleTimeString("tr-TR") : ""} sıfırlanır.`, "rate-limit");
        loadRateLimitInfo();
      } else {
        ui.addBubble("err", "Hata", `${res.status} ${t}`, "http");
      }

      s.messages.push({ role: "error", content: `${res.status} ${t}`, ts: Date.now() });
      s.updatedAt = Date.now();
      saveState();
      ui.renderSessions();
      ui.setStatus(false, "Hata");
      return;
    }

    if (!state.stream) {
      thinking.div.remove();
      const data = await res.json();
      assistantText = data?.message?.content ?? "(boş cevap)";
      const created = ui.addBubble("bot", "Ollama", assistantText, `model: ${model}`);
      assistantBubble = { div: created.div, body: created.body };

      clearInterval(timer);
      const dur = ((performance.now() - started) / 1000).toFixed(1) + "s";
      const { escapeHtml } = await import('./utils.js');
      assistantBubble.div.querySelector(".meta").innerHTML =
        `<span class="who">Ollama</span> <span class="time">model: ${escapeHtml(model)}</span> <span class="time">tamamlandı • ${dur}</span>`;

      s.messages.push({ role: "assistant", content: assistantText, ts: Date.now(), model });
      s.updatedAt = Date.now();
      saveState();
      ui.renderSessions();
      ui.setStatus(true, "Hazır");
      if (!updateRateLimitFromHeaders(res)) {
        loadRateLimitInfo();
      }
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);

        if (!line) continue;

        let obj;
        try {
          obj = JSON.parse(line);
        } catch {
          continue;
        }

        const chunk = obj?.message?.content ?? "";
        if (chunk) {
          if (!firstChunkSeen) {
            firstChunkSeen = true;
            thinking.div.remove();
            const created = ui.addBubble("bot", "Ollama", "", `model: ${model}`);
            assistantBubble = { div: created.div, body: created.body };
          }

          assistantText += chunk;
          assistantBubble.body.textContent = assistantText;
          const chatEl = dom.getChatEl();
          chatEl.scrollTop = chatEl.scrollHeight;
        }

        if (obj?.done) {
          const dur = ((performance.now() - started) / 1000).toFixed(1) + "s";
          if (assistantBubble?.div) {
            const meta = assistantBubble.div.querySelector(".meta");
            const { escapeHtml } = await import('./utils.js');
            meta.innerHTML =
              `<span class="who">Ollama</span> <span class="time">model: ${escapeHtml(model)}</span> <span class="time">tamamlandı • ${dur}</span>`;
          }
        }
      }
    }

    clearInterval(timer);
    if (!firstChunkSeen) {
      thinking.div.remove();
      const created = ui.addBubble("bot", "Ollama", "(cevap gelmedi)", `model: ${model}`);
      assistantBubble = { div: created.div, body: created.body };
      assistantText = "(cevap gelmedi)";
    }

    if (!assistantText.trim()) assistantText = "(boş cevap)";
    s.messages.push({ role: "assistant", content: assistantText, ts: Date.now(), model });
    s.updatedAt = Date.now();
    saveState();
    ui.renderSessions();
    ui.setStatus(true, "Hazır");
    loadRateLimitInfo();

  } catch (e) {
    clearInterval(timer);
    thinking.div.remove();
    if (assistantBubble?.div) assistantBubble.div.remove();
    ui.addBubble("err", "Hata", String(e), "client");
    const s2 = getActiveSession();
    s2.messages.push({ role: "error", content: String(e), ts: Date.now() });
    s2.updatedAt = Date.now();
    saveState();
    ui.renderSessions();
    ui.setStatus(false, "Hata");
  }
}

