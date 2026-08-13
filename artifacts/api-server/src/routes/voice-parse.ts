import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const voiceParseRouter = Router();

const SYSTEM_PROMPT = `You are a voice command parser for a NYC rideshare driver accounting app.
The driver speaks Spanish and English — often mixed in the same sentence.
Listen carefully to the audio or read the text and return structured data.
Respond ONLY with a valid JSON object — no markdown, no explanation.

Return this exact shape:
{
  "transcript": "<verbatim transcription of what you heard or the text provided>",
  "intent": "trip" | "expense" | "clockIn" | "clockOut" | "break" | "cancel" | "unknown",
  "confidence": "high" | "medium" | "low",
  "fields": {
    "platform": "<one of: Uber, Lyft, Empower, EcoRide, Gallant, Aventus Ride, Classic Ryde, Aki Technology, Island City Transit, Transit Tax, Throo, TBZI Luxury, Brakha Group, Other — or empty string>",
    "pickup": "<pickup location or empty string>",
    "dropoff": "<dropoff location or empty string>",
    "fare": <gross fare as a number, 0 if not mentioned>,
    "tips": <tip amount as a number, 0 if not mentioned>,
    "toll": <toll amount as a number, 0 if not mentioned>,
    "fee": <platform fee as a number, 0 if not mentioned>,
    "miles": <trip miles as a number, 0 if not mentioned>,
    "notes": "<any extra notes or empty string>",
    "vendor": "<business/merchant name for expenses, or empty string>",
    "amount": <expense total as a number, 0 if not mentioned>,
    "category": "<one of: Gas/Fuel, Car Wash, Tolls, EZ-Pass, Food & Drink, Vehicle Maintenance, Insurance, Phone, Parking, Supplies, Other — or empty string>",
    "description": "<brief expense description or empty string>"
  }
}

Intent classification rules:
- "trip": driver completed or is logging a rideshare trip (mentions fare, passengers, platform, pickup/dropoff)
- "expense": driver spent money on something (gas, food, car wash, maintenance, etc.)
- "clockIn": starting work (e.g. "clock in", "empezar", "start shift", "iniciando", "empezando el día")
- "clockOut": ending work (e.g. "clock out", "done", "terminar", "end shift", "cerrando el día")
- "break": taking a break (e.g. "break", "descanso", "pause", "tomar un descanso")
- "cancel": driver wants to cancel, dismiss, or stop (e.g. "cancelar", "cancela", "no", "para", "stop", "salir", "olvídalo", "forget it")
- "unknown": cannot determine intent

Amount/number rules (English and Spanish):
- English: "forty-five" → 45, "three fifty" → 3.50, "a dollar eighty" → 1.80, "twenty" → 20.00
- Spanish: "cuarenta y cinco" → 45, "tres con cincuenta" → 3.50, "veinte" → 20.00, "cien" → 100, "ciento veinte" → 120, "diez" → 10
- Mixed: "forty-five dos de propina tres de peaje" → fare 45, tips 2, toll 3
- "propina" or "tip" = tips field
- "peaje" or "toll" = toll field
- "cargo" or "fee" = fee field
- "millas" or "miles" = miles field
- Do NOT convert miles to km

Platform name rules:
- "eco ride" / "ecoride" → "EcoRide"
- "island city" / "isla city" → "Island City Transit"
- "transit tax" → "Transit Tax"
- "classic ride" / "classic ryde" → "Classic Ryde"
- "aventus" → "Aventus Ride"`;

voiceParseRouter.post("/voice-parse", async (req, res) => {
  const { transcript, audioBase64, mimeType } = req.body as {
    transcript?: string;
    audioBase64?: string;
    mimeType?: string;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contents: any;

  if (audioBase64 && mimeType) {
    // Normalize iOS audio/mp4 → audio/m4a which Gemini handles more reliably
    const geminiMime = mimeType === "audio/mp4" ? "audio/m4a" : mimeType;
    // Audio input — Gemini transcribes AND parses in one step
    contents = [{
      role: "user",
      parts: [
        { inlineData: { mimeType: geminiMime, data: audioBase64 } },
        { text: SYSTEM_PROMPT }
      ]
    }];
  } else if (transcript && typeof transcript === "string" && transcript.trim()) {
    // Text transcript fallback
    const textPrompt = SYSTEM_PROMPT + `\n\nDriver's voice command: "${transcript.trim().replace(/"/g, "'")}"`;
    contents = [{ role: "user", parts: [{ text: textPrompt }] }];
  } else {
    res.status(400).json({ error: "Either audioBase64+mimeType or transcript is required" });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: { maxOutputTokens: 1024 },
    });

    const rawText = response.text ?? "";
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      res.status(422).json({ error: "Could not parse AI response", raw: rawText.slice(0, 300) });
      return;
    }

    const p = parsed as Record<string, unknown>;
    const f = (p.fields as Record<string, unknown>) ?? {};

    const safeNum = (v: unknown) =>
      typeof v === "number" && isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
    const safeStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");

    const validIntents = ["trip", "expense", "clockIn", "clockOut", "break", "cancel", "unknown"];
    const intent = validIntents.includes(safeStr(p.intent)) ? safeStr(p.intent) : "unknown";
    const confidence = ["high", "medium", "low"].includes(safeStr(p.confidence))
      ? safeStr(p.confidence)
      : "medium";

    res.json({
      transcript: safeStr(p.transcript),
      intent,
      confidence,
      fields: {
        platform:    safeStr(f.platform),
        pickup:      safeStr(f.pickup),
        dropoff:     safeStr(f.dropoff),
        fare:        safeNum(f.fare),
        tips:        safeNum(f.tips),
        toll:        safeNum(f.toll),
        fee:         safeNum(f.fee),
        miles:       safeNum(f.miles),
        notes:       safeStr(f.notes),
        vendor:      safeStr(f.vendor),
        amount:      safeNum(f.amount),
        category:    safeStr(f.category),
        description: safeStr(f.description),
      },
    });
  } catch (err: unknown) {
    console.error("Voice parse error:", err);
    res.status(500).json({ error: "AI processing failed. Please try again." });
  }
});

export default voiceParseRouter;
