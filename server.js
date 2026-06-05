import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// SUPPORTED LANGUAGES (Phase 1)
const SUPPORTED_LANGUAGES = ["en", "id"];

// SYSTEM PROMPTS
const SYSTEM_PROMPTS = {
  en: `
You are an AI trading psychology assistant.
Analyze the user's trade, emotions, execution, and mindset.
Be concise, supportive, and insightful.
Do NOT give financial advice or trade signals.
`,
  id: `
Kamu adalah asisten psikologi trading berbasis AI.
Analisis trade, emosi, eksekusi, dan kondisi mental pengguna.
Gunakan bahasa yang jelas, ramah, dan mendukung.
Jangan memberi saran finansial atau sinyal trading.
`
};

app.post("/analyze", async (req, res) => {
  try {
    const { tradeData, language } = req.body;

    let targetLang = language;

    // SIMPLE AUTO-DETECT (EN + ID ONLY)
    if (!targetLang) {
      const detect = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Detect the language of the following text. Respond ONLY with: en or id."
          },
          { role: "user", content: tradeData }
        ]
      });

      const raw = detect.choices[0].message.content.trim().toLowerCase();

      if (raw.includes("id")) targetLang = "id";
      else targetLang = "en"; // fallback
    }

    // FINAL LANGUAGE CHECK
    if (!SUPPORTED_LANGUAGES.includes(targetLang)) {
      targetLang = "en";
    }

    const systemPrompt = SYSTEM_PROMPTS[targetLang];

    // GENERATE ANALYSIS
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: tradeData }
      ]
    });

    res.json({ result: completion.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to analyze trade." });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI server running on port ${PORT}`);
});
