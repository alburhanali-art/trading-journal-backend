import express from "express";
import cors from "cors";
import OpenAI from "openai";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// DATABASE CONNECTION
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// OPENAI CLIENT
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// SUPPORTED LANGUAGES
const SUPPORTED_LANGUAGES = ["en", "id"];

// ALL PROMPTS (EN + ID)
const PROMPTS = {
  psychology: {
    en: `
You are an AI trading psychology coach.

Analyze the user's trade with a focus on:
- emotional state (fear, greed, FOMO, hesitation, revenge trading)
- execution quality
- cognitive biases
- behavioral patterns
- mindset during the trade

Provide:
1. A short psychological summary
2. Emotional drivers
3. Behavioral mistake (if any)
4. One improvement

Do NOT give financial advice.
`,
    id: `
Kamu adalah pelatih psikologi trading berbasis AI.

Analisis trade dengan fokus pada:
- kondisi emosi
- kualitas eksekusi
- bias kognitif
- pola perilaku
- kondisi mental saat trading

Berikan:
1. Ringkasan psikologis
2. Pemicu emosi
3. Kesalahan perilaku
4. Satu saran

Jangan memberi saran finansial.
`
  },

  rulecheck: {
    en: `
You are an AI trading rule-enforcement assistant.

Identify:
- rules followed
- rules broken
- impact of each violation
- repeated patterns
- one improvement

Be objective and supportive.
`,
    id: `
Kamu adalah asisten AI untuk pengecekan kepatuhan trading.

Identifikasi:
- aturan yang dipatuhi
- aturan yang dilanggar
- dampak pelanggaran
- pola berulang
- satu perbaikan

Bersikap objektif dan jelas.
`
  },

  emotion: {
    en: `
You are an AI emotional-detection assistant.

Identify:
- dominant emotion
- emotional trigger
- intensity (low/medium/high)
- impact on trade
- one emotional pattern

Output structured:
Emotion:
Trigger:
Intensity:
Impact:
Advice:
`,
    id: `
Kamu adalah asisten AI untuk mendeteksi emosi trader.

Identifikasi:
- emosi dominan
- pemicu emosi
- intensitas
- dampak
- satu pola emosi

Output terstruktur:
Emosi:
Pemicu:
Intensitas:
Dampak:
Saran:
`
  },

  summary: {
    en: `
You are an AI trading journal assistant.

Create a daily summary including:
- emotional tone
- execution quality
- rule-following
- lessons learned
- improvement for tomorrow

Keep it short and supportive.
`,
    id: `
Kamu adalah asisten jurnal trading berbasis AI.

Buat ringkasan harian berisi:
- kondisi emosi
- kualitas eksekusi
- kepatuhan aturan
- pelajaran hari ini
- perbaikan untuk besok

Ringkas dan mendukung.
`
  },

  mistake: {
    en: `
You are an AI mistake-tagging assistant.

Identify:
- primary mistake
- cause
- impact
- correction

Output structured:
Mistake:
Cause:
Impact:
Correction:
`,
    id: `
Kamu adalah asisten AI untuk tagging kesalahan trading.

Identifikasi:
- kesalahan utama
- penyebab
- dampak
- perbaikan

Output terstruktur:
Kesalahan:
Penyebab:
Dampak:
Perbaikan:
`
  }
};

// SAVE OUTPUT FOR ALL MODES
async function saveAIOutput(userId, tradeId, mode, aiText) {
  await pool.query(
    `
    INSERT INTO ai_outputs (user_id, trade_id, mode, raw_output)
    VALUES ($1, $2, $3, $4)
    `,
    [userId, tradeId, mode, aiText]
  );
}

// MAIN ENDPOINT
app.post("/analyze", async (req, res) => {
  try {
    const { tradeData, language, type, userId, tradeId } = req.body;

    // Default type = psychology
    const promptType = PROMPTS[type] ? type : "psychology";

    // Language detection
    let targetLang = language;

    if (!targetLang) {
      const detect = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Detect the language of the following text. Respond ONLY with: en or id."
          },
          { role: "user", content: tradeData }
        ]
      });

      const raw = detect.choices[0].message.content.trim().toLowerCase();
      targetLang = raw.includes("id") ? "id" : "en";
    }

    if (!SUPPORTED_LANGUAGES.includes(targetLang)) {
      targetLang = "en";
    }

    const systemPrompt = PROMPTS[promptType][targetLang];

    // GENERATE RESPONSE
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: tradeData }
      ]
    });

    const aiText = completion.choices[0].message.content;

    // SAVE FOR ALL MODES
    try {
      await saveAIOutput(userId, tradeId, promptType, aiText);
    } catch (err) {
      console.error("DB save error:", err);
    }

    // SEND RESPONSE
    res.json({
      success: true,
      type: promptType,
      language: targetLang,
      aiText
    });

  } catch (err) {
    console.error("Error in /analyze:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// START SERVER
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
