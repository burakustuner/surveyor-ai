/** -------------------------
 *  Utility Functions
 *  ------------------------- */
export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function nowStr() {
  return new Date().toLocaleString("tr-TR", { hour12: false });
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[m]));
}

export function summarizeTitleFromText(text) {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "Yeni sohbet";
  return t.length <= 28 ? t : t.slice(0, 28) + "…";
}

