import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const limosysEvalRouter = Router();

limosysEvalRouter.post("/limosys-eval", async (req, res) => {
  const { imageBase64, mimeType, minHourly = 40, minPerMile = 2.5 } = req.body as {
    imageBase64?: string;
    mimeType?: string;
    minHourly?: number;
    minPerMile?: number;
  };

  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }

  const mime = (mimeType ?? "image/jpeg").toLowerCase();
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  if (!allowedTypes.includes(mime)) {
    res.status(400).json({ error: "Unsupported image type" });
    return;
  }

  const prompt = `You are an expert NYC for-hire vehicle (FHV/limo) driver advisor analyzing a LimoSys job offer screenshot.

The driver's minimum acceptable rates are:
- Minimum earnings: $${minHourly.toFixed(2)}/hr
- Minimum earnings: $${minPerMile.toFixed(2)}/mi

Extract EVERY job offer visible in this screenshot. For EACH offer, calculate:
1. Estimated $/hr: price ÷ (estimated trip time in hours + ~10min loading). If no trip time shown, estimate from distance at ~25 mph NYC average.
2. Estimated $/mi: price ÷ distance. If distance not shown, estimate from route.

Location simplification rules (IMPORTANT):
- Strip street numbers, street names, and zip codes
- Show ONLY the neighborhood, city, or sector name
- Examples: "123 Main St, East Meadow, NY 11554" → "East Meadow"
- Examples: "JFK Airport Terminal 4" → "JFK Airport"
- Examples: "LaGuardia Airport" → "LGA"
- Examples: "200 Park Ave, Manhattan" → "Midtown Manhattan"

Decision rules per offer:
- "TOMAR" if BOTH $/hr >= ${minHourly} AND $/mi >= ${minPerMile}
- "RECHAZAR" if either is below threshold

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "offers": [
    {
      "decision": "TOMAR" | "RECHAZAR",
      "company": "<company or base name from screenshot, or 'LimoSys'>",
      "price": <total fare as number, 0 if not visible>,
      "pickupTime": "<time until pickup e.g. '8 min', '2:30 PM', or 'now'>",
      "origin": "<simplified origin: neighborhood/city only>",
      "destination": "<simplified destination: neighborhood/city only>",
      "distance": <trip miles as number, 0 if unknown>,
      "estimatedMinutes": <trip minutes as number, 0 if unknown>,
      "hourlyRate": <calculated $/hr as number>,
      "perMileRate": <calculated $/mi as number>
    }
  ]
}

If this is NOT a LimoSys screenshot or no offers are visible, return:
{ "offers": [], "error": "No LimoSys offers detected in screenshot" }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: mime, data: imageBase64 } },
          { text: prompt },
        ],
      }],
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
    const rawOffers = Array.isArray(p.offers) ? p.offers : [];

    const safeNum = (v: unknown) =>
      typeof v === "number" && isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
    const safeStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");

    const offers = (rawOffers as Record<string, unknown>[]).map(o => ({
      decision: ["TOMAR","RECHAZAR"].includes(safeStr(o.decision)) ? safeStr(o.decision) : "RECHAZAR",
      company: safeStr(o.company) || "LimoSys",
      price: safeNum(o.price),
      pickupTime: safeStr(o.pickupTime) || "?",
      origin: safeStr(o.origin) || "?",
      destination: safeStr(o.destination) || "?",
      distance: safeNum(o.distance),
      estimatedMinutes: safeNum(o.estimatedMinutes),
      hourlyRate: safeNum(o.hourlyRate),
      perMileRate: safeNum(o.perMileRate),
    }));

    if (offers.length === 0 && p.error) {
      res.status(422).json({ error: safeStr(p.error) });
      return;
    }

    res.json({ offers });
  } catch (err: unknown) {
    console.error("LimoSys eval error:", err);
    res.status(500).json({ error: "AI processing failed. Try again." });
  }
});

export default limosysEvalRouter;
