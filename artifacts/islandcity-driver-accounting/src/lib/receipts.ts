// ── Receipts · IndexedDB photo store + OCR service (Gemini-ready) ───
// PHASE 1: photos live in IndexedDB (localStorage is too small for
// images). OCR uses Gemini when an API key is configured, otherwise
// falls back to manual amount entry — the driver is never blocked.

const DB_NAME = "ic-receipts";
const STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable"));
  });
}

export async function putPhoto(key: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("photo save failed"));
  });
  db.close();
}

export async function getPhoto(key: string): Promise<string | null> {
  const db = await openDb();
  const out = await new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => reject(req.error ?? new Error("photo read failed"));
  });
  db.close();
  return out;
}

/** File → downscaled dataURL (max 1024px) so photos stay small. */
export function fileToDataUrl(file: File, maxDim = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas unavailable"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("invalid image"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

// ── OCR service (pluggable) ─────────────────────────────────────────
export interface OcrResult {
  amount?: number;
  vendor?: string;
  raw?: string;
  engine: "gemini" | "manual";
}

function geminiKey(): string | null {
  // Vite env var — set VITE_GEMINI_API_KEY in .env.local to enable auto-OCR.
  const key = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? null;
  return key && key.trim() ? key : null;
}

export async function ocrReceipt(dataUrl: string): Promise<OcrResult | null> {
  const key = geminiKey();
  if (!key) return null; // manual fallback — driver is never blocked
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'This is a toll receipt or expense receipt. Return ONLY compact JSON: {"amount": number, "vendor": string}. The amount is the total paid in USD.',
                },
                { inline_data: { mime_type: "image/jpeg", data: dataUrl.split(",")[1] ?? "" } },
              ],
            },
          ],
        }),
      },
    );
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as { amount?: number; vendor?: string };
    return { amount: parsed.amount, vendor: parsed.vendor, raw: text, engine: "gemini" };
  } catch (e) {
    console.warn("OCR failed — manual fallback", e);
    return null;
  }
}

// ── Expense records ──────────────────────────────────────────────────
export type ExpenseKind = "personal" | "business";

export interface ReceiptRecord {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  dueDate: string;
  imageBase64?: string;
  thumbnailBase64?: string;
  businessCategory?: string;
  type: ExpenseKind;
  /** receipt = captured via scan, regular = manual/recurring entry */
  expenseType: "receipt" | "regular";
  frequency?: "daily" | "weekly" | "monthly" | "one-time";
  /** Repeat-until date for recurring expenses (stop projecting after it) */
  endDate?: string;
  createdAt?: string;
}

export const EXPENSE_CATEGORIES: string[] = [
  "Fuel",
  "Tolls",
  "Maintenance",
  "Cleaning",
  "Insurance",
  "Parking",
  "Phone",
  "Food",
  "Medical",
  "Other",
];

const CATEGORY_KEYWORDS: Array<[string, RegExp]> = [
  ["Fuel", /shell|chevron|mobil|exxon|sunoco|gas|fuel|bp\b/i],
  ["Tolls", /toll|ezpass|e-zpass|mta|bridge|tunnel/i],
  ["Maintenance", /jiffy|mechanic|tire|goodyear|midas|pep boys|auto repair|oil/i],
  ["Cleaning", /car ?wash|detail/i],
  ["Insurance", /insur|geico|progressive|state farm/i],
  ["Parking", /park(ing)?/i],
  ["Phone", /verizon|t-?mobile|at&t|mint mobile/i],
  ["Food", /deli|restaurant|mcdonald|starbucks|dunkin|pizza|food/i],
  ["Medical", /pharmacy|cvs|walgreens|medical|clinic/i],
];

/** Guess an expense category from the vendor name (offline heuristics). */
export function detectCategoryFromVendor(vendor: string): string {
  for (const [category, re] of CATEGORY_KEYWORDS) {
    if (re.test(vendor)) return category;
  }
  return "Other";
}

/**
 * Manual fallback when no Gemini key is configured (or OCR fails):
 * returns an empty editable record so the driver is never blocked.
 */
export async function simulateOCR(dataUrl: string): Promise<ReceiptRecord> {
  return {
    id: Math.random().toString(36).slice(2),
    vendor: "Unknown Vendor",
    amount: 0,
    category: "Other",
    dueDate: new Date().toISOString().slice(0, 10),
    imageBase64: dataUrl,
    thumbnailBase64: dataUrl,
    businessCategory: "Other",
    type: "business",
    expenseType: "receipt",
    createdAt: new Date().toISOString(),
  };
}
