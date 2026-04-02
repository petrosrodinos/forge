export class InsufficientTokensError extends Error {
  required: number;
  balance: number;
  constructor(required: number, balance: number) {
    super("Insufficient tokens");
    this.required = required;
    this.balance = balance;
  }
}

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let res = await fetch(input, { credentials: "include", ...init });

  if (res.status === 401) {
    const r = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (r.ok) res = await fetch(input, { credentials: "include", ...init });
    else {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.location.href = "/login";
      }
      throw new Error("Session expired");
    }
  }

  if (res.status === 402) {
    const d = await res.json();
    throw new InsufficientTokensError(d.required, d.balance);
  }

  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function jsonInit(body: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
