import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { saveDocument } from "../lib/documentStorage";

const receiptScanRouter = Router();

receiptScanRouter.post("/receipt-scan", async (req, res) => {
  const { imageBase64, mimeType } = req.body as {
    imageBase64?: string;
    mimeType?: string;
  };

  if (!imageBase64 || !mimeType) {
    res.status(400).json({ error: "imageBase64 and mimeType are required" });
    return;
  }

  // Validate mime type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  if (!allowedTypes.includes(mimeType)) {
    res.status(400).json({ error: "Unsupported image type" });
    return;
  }

  const prompt = `You are a receipt data extraction assistant for a rideshare driver expense tracker.
Analyze this receipt image and extract the following information.
Respond ONLY with a valid JSON object — no markdown, no explanation, just raw JSON.

JSON format:
{
  "vendor": "<store/business name, or empty string if unclear>",
  "amount": <total amount as a number with 2 decimal places, or 0 if unclear>,
  "date": "<date in YYYY-MM-DD format, or empty string if unclear>",
  "category": "<one of: Gas/Fuel, Car Wash, Tolls, Food & Drink, Vehicle Maintenance, Insurance, Phone, Parking, Supplies, Other>",
  "note": "<brief description, e.g. 'Fuel fill-up', 'Oil change', or empty string>"
}

Rules:
- amount must be a number (not a string)
- If you cannot read the receipt clearly, use 0 for amount and empty strings for text fields
- For category, pick the closest match from the provided list
- date must be YYYY-MM-DD or empty string`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: { maxOutputTokens: 8192 },
    });

    const rawText = response.text ?? "";

    // Strip markdown code fences if present
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    let parsed: {
      vendor?: string;
      amount?: number;
      date?: string;
      category?: string;
      note?: string;
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      res.status(422).json({
        error: "Could not parse Gemini response",
        raw: rawText,
      });
      return;
    }

    const result = {
      vendor:   typeof parsed.vendor   === "string" ? parsed.vendor   : "",
      amount:   typeof parsed.amount   === "number" ? Math.round(parsed.amount * 100) / 100 : 0,
      date:     typeof parsed.date     === "string" ? parsed.date     : "",
      category: typeof parsed.category === "string" ? parsed.category : "Other",
      note:     typeof parsed.note     === "string" ? parsed.note     : "",
    };

    // Save original image + metadata to GCS + DB — await so we can return docId for audit linking
    let docId: number | null = null;
    try {
      const saved = await saveDocument({
        type:      "receipt",
        imageBase64,
        mimeType,
        fileDate:  result.date  || null,
        category:  result.category,
        vendor:    result.vendor,
        amount:    result.amount || null,
        metadata:  { note: result.note },
      });
      docId = saved.id;
    } catch (err) {
      console.warn("Receipt save to storage failed (non-fatal):", err);
    }

    res.json({ ...result, docId });
  } catch (err: unknown) {
    console.error("Receipt scan error:", err);
    res.status(500).json({ error: "AI processing failed. Please try again." });
  }
});

export default receiptScanRouter;
