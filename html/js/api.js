/** -------------------------
 *  API Functions
 *  ------------------------- */
// Note: Circular dependency with auth.js - getGoogleToken is called at runtime
export function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  // Import at runtime to avoid circular dependency
  const token = localStorage.getItem("google_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

