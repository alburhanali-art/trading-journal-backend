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

    let targetLang = language;

    // AUTO-DETECT jika user tidak memilih bahasa
    if (!targetLang) {
      const detect = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Detect the language of the following text. Respond ONLY with one of these codes: en, id, de, ar, fr, zh, ms, it, es, ko, ja, th, vi, tl."
          },
          { role: "user", content: tradeData }
        ]
      });

      let raw = detect.choices[0].message.content.trim().toLowerCase();

      // NORMALISASI
      if (raw.includes("ar")) targetLang = "ar";
      else if (raw.includes("id")) targetLang = "id";
      else if (raw.includes("de")) targetLang = "de";
      else if (raw.includes("fr")) targetLang = "fr";
      else if (raw.includes("zh") || raw.includes("chi")) targetLang = "zh";
      else if (raw.includes("ms") || raw.includes("malay")) targetLang = "ms";
      else if (raw.includes("it")) targetLang = "it";
      else if (raw.includes("es")) targetLang = "es";
      else if (raw.includes("ko") || raw.includes("kor")) targetLang = "ko";
      else if (raw.includes("ja") || raw.includes("jap")) targetLang = "ja";
      else if (raw.includes("th") || raw.includes("thai")) targetLang = "th";
      else if (raw.includes("vi") || raw.includes("viet")) targetLang = "vi";
      else if (raw.includes("tl") || raw.includes("tagalog") || raw.includes("filipino")) targetLang = "tl";
      else targetLang = "en"; // fallback aman
    }

    // PROMPT SISTEM BERDASARKAN BAHASA
    const prompts = {
      id: "Kamu adalah asisten psikologi trading. Jawablah dalam Bahasa Indonesia.",
      en: "You are a trading psychology assistant. Answer in English.",
      de: "Du bist ein Trading-Psychologie-Assistent. Antworte auf Deutsch.",
      ar: "أنت مساعد في علم نفس التداول. أجب باللغة العربية.",
      fr: "Vous êtes un assistant en psychologie du trading. Répondez en français.",
      zh: "你是一名交易心理助手。请用中文回答。",
      ms: "Anda ialah pembantu psikologi dagangan. Sila jawab dalam Bahasa Melayu.",
      it: "Sei un assistente di psicologia del trading. Rispondi in italiano.",
      es: "Eres un asistente de psicología del trading. Responde en español.",
      ko: "당신은 트레이딩 심리 보조자입니다. 한국어로 답변하세요.",
      ja: "あなたはトレーディング心理アシスタントです。日本語で答えてください。",
      th: "คุณเป็นผู้ช่วยด้านจิตวิทยาการเทรด กรุณาตอบเป็นภาษาไทย",
      vi: "Bạn là trợ lý tâm lý giao dịch. Hãy trả lời bằng tiếng Việt.",
      tl: "Ikaw ay isang trading psychology assistant. Sagutin mo sa wikang Filipino."
    };

    const systemPrompt = prompts[targetLang] || prompts.en;

    // GENERATE ANALISIS
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
