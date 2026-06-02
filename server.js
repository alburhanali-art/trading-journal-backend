import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/analyze", async (req, res) => {
  try {
    const { tradeData, language } = req.body;

    // If user manually chooses language, use it
    let targetLang = language;

    // If no language provided → auto detect
    if (!targetLang) {
      const detect = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Detect the language of the following text. Respond ONLY with the language code: en, id, de." },
          { role: "user", content: tradeData }
        ]
      });

      targetLang = detect.choices[0].message.content.trim();
    }

    const systemPrompt = {
      id: "Kamu adalah asisten psikologi trading. Jawablah dalam Bahasa Indonesia.",
      en: "You are a trading psychology assistant. Answer in English.",
      de: "Du bist ein Trading-Psychologie-Assistent. Antworte auf Deutsch."
    }[targetLang] || systemPrompt["en"];

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
