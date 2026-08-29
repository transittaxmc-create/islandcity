const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : '';

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setApiAuthTokenGetter(getter: () => Promise<string | null>) {
  authTokenGetter = getter;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await authTokenGetter?.();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `API error ${res.status}`);
  return data as T;
}

export interface LimoOffer {
  decision: string;
  company: string;
  price: number;
  pickupTime: string;
  origin: string;
  destination: string;
  hourlyRate: number;
  perMileRate: number;
  distance: number;
  estimatedMinutes: number;
  isBest?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
