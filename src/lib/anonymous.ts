const STORAGE_KEY = "noirgateway_id";

export function getAnonymousId(): string {
  if (typeof window === "undefined") return "";

  // Try localStorage first
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }

  // Sync to cookie for server-side access
  document.cookie = `${STORAGE_KEY}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  return id;
}

export function getDisplayName(): string {
  const id = getAnonymousId();
  if (!id) return "Detective";
  const shortId = id.substring(0, 4).toUpperCase();
  return `Detective #${shortId}`;
}

export function generateColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
