import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const broadcastEvalRouter = Router();

broadcastEvalRouter.post("/broadcast-eval", async (req, res) => {
  const { imageBase64, mimeType, currentTime, driverLocation } = req.body as {
    imageBase64?: string;
    mimeType?: string;
    currentTime?: string;
    driverLocation?: { lat: number; lng: number };
  };

  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  const mime = (mimeType ?? "image/jpeg").toLowerCase();
  if (!allowedTypes.includes(mime)) {
    res.status(400).json({ error: "Unsupported image type" });
    return;
  }

  const now = currentTime ? new Date(currentTime) : new Date();
  const hour = now.getHours();
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  // NYC traffic tier based on time of day
  const trafficTier =
    (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)
      ? "HEAVY RUSH HOUR"
      : hour >= 10 && hour <= 15
      ? "MODERATE (midday)"
      : hour >= 22 || hour <= 5
      ? "LIGHT (late night)"
      : "MODERATE";

  const prompt = `You are an expert NYC rideshare driver advisor. Analyze this job offer screenshot and tell the driver whether to accept it.

Current time: ${timeStr} on ${dayOfWeek}
NYC traffic conditions now: ${trafficTier}
${driverLocation ? `Driver location: lat ${driverLocation.lat.toFixed(4)}, lng ${driverLocation.lng.toFixed(4)} (NYC area)` : ""}

Evaluate the job and respond ONLY with a valid JSON object — no markdown, no explanation.

Consider these NYC-specific factors:
- Airport runs (JFK, LGA, EWR, HPN): always high value — long trip, guaranteed fare, often surge
- Outer borough to outer borough (Brooklyn↔Queens, Bronx↔Staten Island): lower $/hr due to deadhead back
- Manhattan pickup during rush hour: high surge potential but slow streets
- Late night (10pm–3am Fri/Sat): surge pricing common, fewer dead miles
- Short trips under 1 mile: rarely worth it (parking, loading time kills $/hr)
- Deadhead distance to pickup: >3 miles is costly unless fare is very high
- Platform boost/surge indicators visible in screenshot: major GO signal

Return this exact JSON shape:
{
  "recommendation": "GO" | "SKIP" | "MAYBE",
  "confidence": "high" | "medium" | "low",
  "jobDetails": {
    "pickup": "<pickup address/area as read from screenshot, or empty string if not visible>",
    "dropoff": "<dropoff address/area as read from screenshot, or empty string if not visible>",
    "fare": "<fare amount as string e.g. '$23.50', or 'not shown' if not visible>",
    "distance": "<trip distance e.g. '4.2 mi', or 'not shown' if not visible>",
    "estimatedDuration": "<trip time e.g. '18 min', or 'not shown' if not visible>",
    "platform": "<platform name if logo/name visible in screenshot, else empty string>"
  },
  "trafficNote": "<One sentence about traffic impact on this specific route right now. Be specific.>",
  "estimatedNetDollars": <estimated net earnings as number after ~28% platform cut, 0 if fare not shown>,
  "estimatedHourlyRate": <estimated $/hr this job yields accounting for trip + return time, 0 if cannot estimate>,
  "factors": ["<key factor 1>", "<key factor 2>", "<key factor 3 max — omit if fewer factors>"],
  "tip": "<One actionable tip for the driver under 15 words. Be specific and useful.>"
}

Recommendation rules:
- GO: Good $/hr, favorable direction, airport pickup, surge visible, or route ends in high-demand zone
- SKIP: Very short trip with long pickup, dead-end dropoff (far outer borough), very low fare, heavy traffic with no surge
- MAYBE: Borderline — acceptable but driver should weigh their current position
- If the image is NOT a rideshare job offer (wrong screenshot), set recommendation "SKIP", confidence "low", and explain in tip

Driver's transcript: analyze the screenshot image provided.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mime, data: imageBase64 } },
            { text: prompt },
          ],
        },
      ],
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
    const jd = (p.jobDetails as Record<string, unknown>) ?? {};
    const factors = Array.isArray(p.factors)
      ? (p.factors as unknown[]).map((f) => String(f)).slice(0, 3)
      : [];

    const safeNum = (v: unknown) =>
      typeof v === "number" && isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
    const safeStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");

    const validRecs = ["GO", "SKIP", "MAYBE"];
    const recommendation = validRecs.includes(safeStr(p.recommendation))
      ? safeStr(p.recommendation)
      : "MAYBE";

    res.json({
      recommendation,
      confidence: ["high", "medium", "low"].includes(safeStr(p.confidence))
        ? safeStr(p.confidence)
        : "medium",
      jobDetails: {
        pickup: safeStr(jd.pickup),
        dropoff: safeStr(jd.dropoff),
        fare: safeStr(jd.fare) || "not shown",
        distance: safeStr(jd.distance) || "not shown",
        estimatedDuration: safeStr(jd.estimatedDuration) || "not shown",
        platform: safeStr(jd.platform),
      },
      trafficNote: safeStr(p.trafficNote),
      estimatedNetDollars: safeNum(p.estimatedNetDollars),
      estimatedHourlyRate: safeNum(p.estimatedHourlyRate),
      factors,
      tip: safeStr(p.tip),
    });
  } catch (err: unknown) {
    console.error("Broadcast eval error:", err);
    res.status(500).json({ error: "AI processing failed. Please try again." });
  }
});

export default broadcastEvalRouter;
