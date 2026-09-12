import { AuthResponse, AuthUser, ProviderStatus } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const TOKEN_KEY = "gardevoir_token";
const MEMORY_KEY = "gardevoir_ai_memory";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export function loadAiMemory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function saveAiMemory(lessons: string[]) {
  if (typeof window === "undefined") return;
  const merged = Array.from(new Set([...loadAiMemory(), ...lessons].map((item) => item.trim()).filter(Boolean)));
  localStorage.setItem(MEMORY_KEY, JSON.stringify(merged.slice(-80)));
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({ detail: res.statusText }));
  return data.detail || `Request failed (${res.status})`;
}

export async function getProviders(): Promise<ProviderStatus> {
  const res = await fetch(`${API_BASE_URL}/auth/providers`);
  if (!res.ok) return { google: false, github: false };
  return res.json();
}

export async function signup(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeaders(), credentials: "include" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function logoutRemote() {
  await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
}

export function oauthUrl(provider: "google" | "github", _intent: "login" | "signup") {
  if (provider === "github") return "/auth/github";
  return `${API_BASE_URL}/auth/${provider}`;
}
