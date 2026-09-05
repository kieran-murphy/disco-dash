// PKCE OAuth against Spotify's Accounts service — no client secret needed (this is the public-client
// flow), so the whole login round-trip runs client-side with no backend. See
// https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
//
// Scope is deliberately read-only (no user-modify-playback-state): this only ever reads what's
// currently playing, never controls the user's Spotify session.
const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const SCOPES = "user-read-currently-playing user-read-playback-state";

const TOKENS_KEY = "disco-dash-spotify-tokens";
const VERIFIER_KEY = "disco-dash-spotify-verifier";

function redirectUri() {
  return `${window.location.origin}/callback`;
}

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return new Uint8Array(digest);
}

function randomVerifier(length = 64) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return base64UrlEncode(bytes).slice(0, length);
}

export function getStoredTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY));
  } catch {
    return null;
  }
}

function storeTokens(tokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  localStorage.removeItem(TOKENS_KEY);
}

export async function redirectToSpotifyLogin() {
  const verifier = randomVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = base64UrlEncode(await sha256(verifier));

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function exchangeCodeForTokens(code) {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status}`);
  const data = await res.json();
  storeTokens({ ...data, expires_at: Date.now() + data.expires_in * 1000 });
}

async function refreshTokens(refreshToken) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);
  const data = await res.json();
  // Spotify doesn't always rotate the refresh token — keep the old one if a new one isn't sent.
  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  storeTokens(tokens);
  return tokens;
}

// Returns a usable access token, refreshing first if the stored one is expired or about to be.
// Returns null (rather than throwing) when there's no session to refresh, so callers can treat
// that as "not logged in" without a try/catch of their own.
export async function getValidAccessToken() {
  const tokens = getStoredTokens();
  if (!tokens) return null;
  if (tokens.expires_at - Date.now() > 30000) return tokens.access_token;
  const refreshed = await refreshTokens(tokens.refresh_token);
  return refreshed.access_token;
}
