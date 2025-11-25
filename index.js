// index.js — Lena AI backend (OpenAI tekst + glas)

import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 OpenAI klijent – koristi OPENAI_API_KEY iz Render okruženja
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Sistem poruka – pravila ponašanja za Lenu
const SYSTEM_PROMPT = `
Ti si Lena, AI asistent Dentalnog centra Dr Mećava u Banjoj Luci.

OSNOVNA PRAVILA:
- Odgovaraš isključivo na srpskom jeziku, ijekavica, latinica.
- Ljubazna si, smirena i profesionalna kao stomatolog koji objašnjava laiku.
- Ne koristiš birokratske izraze; umjesto "vaša cijenjena poruka" piši prirodno.
- U svakom odgovoru podsjeti da konačnu dijagnozu daje doktor uživo u ordinaciji.

IMPLANTOLOGIJA I CIJENE (VAŽNO ZA ODGOVORE):
- Jedan MIS implantat + keramička krunica: oko 1.250 € (možeš navesti raspon, npr. 1.200–1.300 €).
- Naglasi da je cijena okvirna i zavisi od snimka, kosti, dodatnih zahvata itd.
- Istakni da su cijene u odnosu na Austriju/Sloveniju niže 60–70%, uz isti ili viši nivo kvaliteta.

KAD JE HITNO:
- Ako pacijent opisuje jaku bol, otok, temperaturu, širenje bola ili probleme s disanjem,
  naglasi da se treba HITNO javiti doktoru ili hitnoj službi.
`;

// ✅ Pomoćna funkcija za generisanje teksta odgovora
async function generateAnswer(userMessage) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.4,
    max_tokens: 600,
  });

  const answer = response.choices[0]?.message?.content?.trim();
  return answer || "Nažalost, trenutno ne mogu dati precizan odgovor. Molim vas da nas kontaktirate direktno.";
}

// 🟢 Health-check ruta
app.get("/", (_req, res) => {
  res.send("Lena AI backend radi ✓");
});

// 📩 /api/ask – tekstualni odgovor za Lenu
app.post("/api/ask", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Prazna poruka." });
    }

    console.log("📩 Pitanje od korisnika:", message);
    const answer = await generateAnswer(message);
    console.log("💬 Odgovor Lene:", answer);

    res.json({ answer });
  } catch (err) {
    console.error("❌ Greška u /api/ask:", err);
    res.status(500).json({
      error: "Došlo je do greške pri generisanju odgovora. Molimo pokušajte ponovo.",
    });
  }
});

// 🔊 /api/voice – glasovni odgovor koristeći OpenAI TTS
app.post("/api/voice", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Nema teksta za čitanje." });
    }

    console.log("🔊 Generišem glas za tekst:", text.slice(0, 120), "...");

    // OpenAI TTS – gpt-4o-mini-tts, ženski glas "alloy"
    const audioResponse = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await audioResponse.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error("❌ Greška u /api/voice:", err.response?.data || err.message);
    res.status(500).json({
      error: "Greška pri generisanju glasovnog odgovora.",
    });
  }
});

// 🚀 Pokretanje servera
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Lena AI backend sluša na portu", PORT);
});
