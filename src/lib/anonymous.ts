const STORAGE_KEY = "mythgateway_id";

export function getAnonymousId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function getDisplayName(): string {
  const id = getAnonymousId();
  if (!id) return "Anonymous";
  const shortId = id.substring(0, 4).toUpperCase();
  return `Anonymous #${shortId}`;
}

export function generateColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
