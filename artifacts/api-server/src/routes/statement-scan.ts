import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { saveDocument } from "../lib/documentStorage";

const statementScanRouter = Router();

statementScanRouter.post("/statement-scan", async (req, res) => {
  const { fileBase64, mimeType } = req.body as {
    fileBase64?: string;
    mimeType?: string;
  };

  if (!fileBase64 || !mimeType) {
    res.status(400).json({ error: "fileBase64 and mimeType are required" });
    return;
  }

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
  ];
  if (!allowedTypes.includes(mimeType)) {
    res.status(400).json({ error: "Unsupported file type. Use PDF or image." });
    return;
  }

  const prompt = `You are a bank statement parser for a NYC rideshare driver expense tracker.
Analyze this bank statement and extract ALL transactions.
Respond ONLY with a valid JSON array — no markdown, no explanation, just raw JSON.

Each transaction must be an object with exactly these fields:
{
  "date": "<YYYY-MM-DD>",
  "description": "<full original transaction description from statement>",
  "vendor": "<clean merchant or business name, or empty string>",
  "amount": <positive dollar amount as a number with 2 decimal places>,
  "txType": "debit" or "credit",
  "category": "<best match from: Gas/Fuel, Car Wash, Tolls, Food & Drink, Vehicle Maintenance, Insurance, Phone, Parking, EZ-Pass, Supplies, Other>"
}

Rules:
- amount is ALWAYS a positive number — never negative
- txType "debit" = money going OUT (expenses, payments, withdrawals, fees)
- txType "credit" = money coming IN (deposits, platform payouts, refunds, transfers in)
- Rideshare platform payouts (Uber, Lyft, Empower, etc.) → txType "credit"
- Gas stations → category "Gas/Fuel"
- E-ZPass, tolls → category "EZ-Pass" or "Tolls"
- Return ALL transactions sorted by date ascending
- Skip rows that are not transactions (headers, balance rows, totals)
- If no transactions found, return an empty array []`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: fileBase64 } },
            { text: prompt },
          ],
        },
      ],
      config: { maxOutputTokens: 16384 },
    });

    const rawText = response.text ?? "";
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    let transactions: unknown[];
    try {
      const parsed = JSON.parse(cleaned);
      transactions = Array.isArray(parsed) ? parsed : [];
    } catch {
      res.status(422).json({
        error: "Could not parse AI response",
        raw: rawText.slice(0, 500),
      });
      return;
    }

    // Sanitize + validate each transaction
    const sanitized = transactions
      .map((tx: unknown) => {
        const t = tx as Record<string, unknown>;
        const dateStr =
          typeof t.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.date)
            ? t.date
            : new Date().toISOString().slice(0, 10);
        const amount =
          typeof t.amount === "number" && t.amount >= 0
            ? Math.round(t.amount * 100) / 100
            : 0;
        return {
          date: dateStr,
          description:
            typeof t.description === "string" ? t.description.trim() : "",
          vendor: typeof t.vendor === "string" ? t.vendor.trim() : "",
          amount,
          txType: t.txType === "credit" ? ("credit" as const) : ("debit" as const),
          category:
            typeof t.category === "string" ? t.category : "Other",
        };
      })
      .filter((tx) => tx.amount > 0);

    // Archive the statement document to cloud storage
    let docId: number | null = null;
    try {
      const saved = await saveDocument({
        type: "statement",
        imageBase64: fileBase64,
        mimeType,
        fileDate: null,
        category: null,
        vendor: null,
        amount: null,
        metadata: { transactionCount: sanitized.length },
      });
      docId = saved.id;
    } catch (err) {
      console.warn("Statement save to storage failed (non-fatal):", err);
    }

    res.json({ transactions: sanitized, docId });
  } catch (err: unknown) {
    console.error("Statement scan error:", err);
    res.status(500).json({ error: "AI processing failed. Please try again." });
  }
});

export default statementScanRouter;
