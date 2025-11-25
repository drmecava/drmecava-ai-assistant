// index.js – backend za Lenu (Render)

// Ako koristiš "type": "module" u package.json, ovaj import stil je ispravan.
// Ako nisi, zameni sa require(...) varijantama.

import express from "express";
import cors from "cors";
import OpenAI from "openai";

// Ako Render koristi Node 18+, fetch već postoji globalno
// ako ne, dodaj u package.json: "node-fetch" i ovde: import fetch from "node-fetch";

// 🔑 Ključevi iz okruženja (Render → Environment)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // možeš ovde staviti svoj voice ID

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY nije postavljen u env promjenljivama!");
}
if (!ELEVENLABS_API_KEY) {
  console.error("❌ ELEVENLABS_API_KEY nije postavljen u env promjenljivama!");
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const app = express();

// ✅ CORS – dozvoli tvoj sajt
app.use(
  cors({
    origin: [
      "https://www.drmecava.com",
      "https://drmecava.com",
      "https://drmecava.webnode.page" // ako koristiš Webnode domen
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json());

// 🌡 Health check
app.get("/", (req, res) => {
  res.send("Lena AI backend radi ✔");
});

// 🧠 Sistem prompt – pravila ponašanja za Lenu
const SYSTEM_PROMPT = `
Ti si Lena, AI asistent Dentalnog centra Dr Mećava iz Banje Luke.

Govor i pisanje:
- Odgovaraš na srpskom (ijekavica ili ekavica su obje prihvatljive, ali budi prirodna i topla).
- Pišeš jasno, razumljivo, bez medicinskog žargona osim kad je potrebno.
- Ne daješ konačnu dijagnozu – uvijek napominješ da je potreban pregled uživo.

Fokus:
- Pomažeš oko implantata, krunica, mostova, proteza, Hollywood smile-a, ortodoncije, oralne hirurgije, dječije stomatologije.
- Objasniš razliku između različitih rješenja (npr. implantat vs. most).
- Možeš spomenuti prednosti liječenja u Dr Mećava centru (iskustvo, tehnologija, cijena u odnosu na Austriju/Sloveniju itd.)

Granice:
- Ne postavljaš dijagnozu.
- Ne daješ hitne savjete koji odlažu odlazak doktoru; ako je bol jaka, otok, krvarenje → naglasi da treba što prije kod stomatologa ili u hitnu službu.

Svaki odgovor završiš jednom kratkom rečenicom koja poziva na kontakt ili pregled, ali nenametljivo.
`;

// ===============================
//  /api/ask – tekstualni odgovor
// ===============================
app.post("/api/ask", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Nedostaje polje 'message'." });
    }

    console.log("📩 Pitanje od korisnika:", message);

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
      temperature: 0.4,
      max_tokens: 700
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Nažalost, trenutno ne mogu da formulišem adekvatan odgovor.";

    console.log("📤 Odgovor Lene:", answer);

    res.json({ answer });
  } catch (err) {
    console.error("❌ Greška u /api/ask:", err);
    res
      .status(500)
      .json({ error: "Greška na AI servisu. Pokušajte ponovo kasnije." });
  }
});

// ======================================
//  /api/voice – ElevenLabs TTS (audio)
// ======================================
app.post("/api/voice", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).send("Nedostaje polje 'text'.");
    }

    if (!ELEVENLABS_API_KEY) {
      console.error("❌ ELEVENLABS_API_KEY nije postavljen – nema glasa.");
      return res.status(500).send("Glasovni servis nije konfigurisan.");
    }

    console.log("🔊 Generišem glas za tekst:", text.slice(0, 120), "...");

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text().catch(() => "");
      console.error(
        "❌ Greška iz ElevenLabs API:",
        ttsResponse.status,
        errorText
      );
      return res
        .status(500)
        .send("Greška prilikom generisanja glasovnog odgovora.");
    }

    const arrayBuffer = await ttsResponse.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
      "Cache-Control": "no-store"
    });

    return res.send(audioBuffer);
  } catch (err) {
    console.error("❌ Greška u /api/voice:", err);
    res.status(500).send("Greška na glasovnom servisu.");
  }
});

// ======================
//  Pokretanje servera
// ======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Lena backend radi na portu ${PORT}`);
});
