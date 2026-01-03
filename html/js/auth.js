/** -------------------------
 *  Google OAuth Authentication
 *  ------------------------- */
import { getAuthHeaders } from './api.js';

// Note: getAuthHeaders is imported from api.js which imports getGoogleToken from auth.js
// This creates a circular dependency, but it's handled by the function being called at runtime
import { getState, saveState } from './state.js';
import * as ui from './ui.js';

let googleToken = null;
let currentUser = null;
let googleClientId = null;

export function getGoogleToken() {
  return googleToken;
}

export function getCurrentUser() {
  return currentUser;
}

export async function loadGoogleClientId() {
  try {
    const res = await fetch("/api/user/config");
    if (res.ok) {
      const data = await res.json();
      if (data.client_id) {
        return data.client_id;
      }
    }
  } catch (e) {
    console.warn("Config endpoint not available, trying fallback");
  }
  return null;
}

export async function initGoogleSignIn() {
  console.log("initGoogleSignIn called");
  const clientId = await loadGoogleClientId();
  console.log("Client ID loaded:", clientId ? "Yes" : "No");
  googleClientId = clientId;

  if (!clientId) {
    console.warn("Google Client ID not configured, authentication disabled");
    const loginSection = document.getElementById("loginSection");
    if (loginSection) loginSection.style.display = "none";
    return;
  }

  if (typeof google === 'undefined' || !google.accounts) {
    console.warn("Google Sign-In script not loaded, waiting...");
    const checkGoogle = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts) {
        clearInterval(checkGoogle);
        console.log("Google script loaded, initializing...");
        setupGoogleSignIn(clientId);
      }
    }, 500);
    setTimeout(() => clearInterval(checkGoogle), 10000);
    return;
  }

  setupGoogleSignIn(clientId);
}

function setupGoogleSignIn(clientId) {
  console.log("setupGoogleSignIn called with clientId:", clientId ? "present" : "missing");

  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleCredentialResponse,
    auto_select: false
  });

  const signInBtn = document.getElementById("googleSignIn");
  if (!signInBtn) {
    console.error("Google Sign-In button not found!");
    return;
  }

  console.log("Adding click handler to button");

  const newBtn = signInBtn.cloneNode(true);
  signInBtn.parentNode.replaceChild(newBtn, signInBtn);

  newBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Google Sign-In button clicked!");

    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const redirectUri = window.location.origin;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=openid%20profile%20email&nonce=${nonce}`;

    console.log("Redirecting to Google OAuth:", authUrl);
    window.location.href = authUrl;
  });

  try {
    google.accounts.id.renderButton(newBtn, {
      theme: "outline",
      size: "large",
      width: "100%",
      text: "signin_with",
      locale: "tr"
    });
    console.log("Google renderButton applied");
  } catch (e) {
    console.warn("Google renderButton failed (this is OK, manual handler will work):", e);
  }
}

function handleCredentialResponse(response) {
  googleToken = response.credential;
  localStorage.setItem("google_token", googleToken);
  verifyToken(googleToken);
}

export function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  const idToken = urlParams.get('id_token');
  if (idToken) {
    googleToken = idToken;
    localStorage.setItem("google_token", googleToken);
    verifyToken(googleToken);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

export async function verifyToken(token) {
  try {
    const res = await fetch("/api/user/me", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      currentUser = await res.json();
      ui.updateUserUI(currentUser);
      loadRateLimitInfo();
    } else {
      googleToken = null;
      localStorage.removeItem("google_token");
      ui.showLoginUI();
    }
  } catch (e) {
    console.error("Token verification error:", e);
    ui.showLoginUI();
  }
}

export function showLoginUI() {
  const loginSection = document.getElementById("loginSection");
  const userSection = document.getElementById("userSection");
  const rateLimitInfoEl = document.getElementById("rateLimitInfo");
  if (loginSection) loginSection.style.display = "block";
  if (userSection) userSection.style.display = "none";
  if (rateLimitInfoEl) rateLimitInfoEl.textContent = "Giriş gerekli";
}

export async function loadRateLimitInfo() {
  try {
    const { getAuthHeaders } = await import('./api.js');
    const res = await fetch("/api/user/rate-limit", {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      ui.updateRateLimitDisplay(data);
    } else {
      const rateLimitInfoEl = document.getElementById("rateLimitInfo");
      if (rateLimitInfoEl) rateLimitInfoEl.textContent = "Yüklenemedi";
    }
  } catch (e) {
    console.error("Rate limit info error:", e);
    const rateLimitInfoEl = document.getElementById("rateLimitInfo");
    if (rateLimitInfoEl) rateLimitInfoEl.textContent = "Hata";
  }
}

export function updateRateLimitFromHeaders(response) {
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const limit = response.headers.get("X-RateLimit-Limit");
  const reset = response.headers.get("X-RateLimit-Reset");

  if (remaining !== null && limit !== null) {
    const remainingNum = parseInt(remaining);
    const limitNum = parseInt(limit);
    const resetDate = reset ? new Date(parseInt(reset) * 1000) : new Date(Date.now() + 3600000);
    const resetTime = resetDate.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' });
    const rateLimitInfoEl = document.getElementById("rateLimitInfo");
    if (rateLimitInfoEl) {
      rateLimitInfoEl.textContent = `${remainingNum}/${limitNum} (${resetTime})`;
    }
    return true;
  }
  return false;
}

export function signOut() {
  googleToken = null;
  currentUser = null;
  localStorage.removeItem("google_token");
  ui.showLoginUI();
  location.reload();
}

