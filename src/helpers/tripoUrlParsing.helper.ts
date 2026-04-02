export function isAllowedTripoMeshHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith(".tripo3d.com") || h.endsWith(".tripo3d.ai");
}

export function parseAllowedModelUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  if (u.protocol !== "https:") return null;
  if (!isAllowedTripoMeshHost(u.hostname)) return null;
  return u;
}

