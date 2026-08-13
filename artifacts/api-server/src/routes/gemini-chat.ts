import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const geminiChatRouter = Router();

const SYSTEM_PROMPT = `You are IslandCity Assistant — a smart work companion built into the IslandCity Driver Accounting app for a professional NYC rideshare driver.
Answer questions about earnings, expenses, driving strategy, taxes, and work-related topics.
You have access to the driver's real-time data provided at the start of each conversation.
Always respond in the SAME LANGUAGE the driver uses — Spanish, English, or mixed Spanglish. Match their language exactly.
Be concise and direct — drivers are busy. Use the actual numbers from the data when answering financial questions.
Never invent numbers. If you don't have enough data, say so briefly.
Keep responses under 120 words unless the driver asks for a detailed breakdown.
You may use light formatting (dashes, line breaks) but no markdown headers or bold asterisks.`;

interface DriverContext {
  date: string;
  shiftActive: boolean;
  grossToday: number;
  tripCount: number;
  dailyGoal: number;
  hourlyGoal: number;
  shiftMiles: number;
  expensesToday: number;
  netToday: number;
  shiftHours?: number;
  location?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

geminiChatRouter.post("/gemini-chat", async (req, res) => {
  const { message, context, history = [] } = req.body as {
    message: string;
    context: DriverContext;
    history: ChatMessage[];
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const contextBlock = `=== DATOS DEL CONDUCTOR / DRIVER DATA ===
Fecha y hora / Date & Time: ${context.date}
Turno / Shift: ${context.shiftActive ? "Activo / Active" : "Inactivo / Inactive"}${context.shiftHours != null ? ` (${context.shiftHours.toFixed(1)} hrs)` : ""}
Ganancias hoy / Today's gross: $${context.grossToday.toFixed(2)}
Viajes hoy / Trips today: ${context.tripCount}
Meta diaria / Daily goal: $${context.dailyGoal.toFixed(2)}
Meta por hora / Hourly goal: $${context.hourlyGoal.toFixed(2)}/hr
Millas GPS hoy / GPS miles today: ${context.shiftMiles.toFixed(1)} mi (IRS deduction ≈ $${(context.shiftMiles * 0.70).toFixed(2)} at $0.70/mi)
Gastos hoy / Today's expenses: $${context.expensesToday.toFixed(2)}
Neto hoy / Today's net: $${context.netToday.toFixed(2)}${context.location ? `\nUbicación / Location: ${context.location}` : ""}
=========================================`;

  const contents = [
    {
      role: "user" as const,
      parts: [{ text: `${SYSTEM_PROMPT}\n\n${contextBlock}` }],
    },
    {
      role: "model" as const,
      parts: [{ text: "Listo, tengo tus datos. ¿En qué te puedo ayudar? / Ready, I have your data. How can I help?" }],
    },
    // Conversation history (last 10 turns)
    ...history.slice(-10).map(msg => ({
      role: msg.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: msg.text }],
    })),
    {
      role: "user" as const,
      parts: [{ text: message.trim() }],
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: { maxOutputTokens: 512 },
    });

    const reply = (response.text ?? "").trim();
    if (!reply) {
      res.status(500).json({ error: "No response from AI" });
      return;
    }

    res.json({ reply });
  } catch (err: unknown) {
    console.error("Gemini chat error:", err);
    res.status(500).json({ error: "AI request failed. Try again." });
  }
});

export default geminiChatRouter;
