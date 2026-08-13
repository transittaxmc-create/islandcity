const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : '';

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
