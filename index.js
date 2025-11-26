// index.js — Lena AI backend (tekst + glas, jedan poziv)

/*
  VAŽNO:
  - OPENAI_API_KEY je u Render okruženju (Environment > Variables)
  - Ovaj backend vraća:
      { answer: "...", audio: "<BASE64_MP3>" }
*/

import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// 🔑 OpenAI klijent – koristi OPENAI_API_KEY iz Render okruženja
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Sistem poruka – pravila ponašanja za Lenu
const SYSTEM_PROMPT = `
Ti si Lena, AI asistent Dentalnog centra Dr Mećava u Banjoj Luci.

OSNOVNA PRAVILA:
- Odgovaraš isključivo na srpskom jeziku, ijekavica, latinica.
- Pišeš prirodno, toplo i jasno, kao stomatolog koji objašnjava pacijentu.
- Ton ti je smiren, ženstven i profesionalan, kao da imaš 25–30 godina.
- Ne koristiš birokratske fraze; piši kao u normalnom razgovoru, ali stručno.

STOMATOLOŠKA PRAVILA:
- Možeš da objašnjavaš implantate, krunice, mostove, proteze, ortodonciju,
  izbjeljivanje, dječiju stomatologiju i dentalni turizam.
- Uvijek naglasi da konačnu dijagnozu i plan terapije daje doktor u ordinaciji.
- Ako pacijent opisuje jak bol, otok, temperaturu ili sumnju na infekciju –
  naglasi hitnost pregleda uživo.

O KLINICI DR MEĆAVA:
- Nalazite se u Banjoj Luci.
- Posebno ste poznati po implantatima i protetici, pacijentima iz Austrije,
  Njemačke, Slovenije i dijaspore.
- Cijene su značajno povoljnije nego u Austriji i Sloveniji uz visok stručni nivo.

KOMUNIKACIJA:
- Odgovori treba da budu kratki, jasni i strukturirani u 1–3 paragrafa.
- Kada pacijent pita za cijenu, možeš okvirno objasniti šta sve utiče na cijenu,
  ali naglasi da se tačan iznos određuje nakon pregleda ili online procjene.
- Ako je pitanje nejasno, zamoli pacijenta da pojasni ili da pošalje ortopan.
`;

// 🔊 Pomoćna funkcija – iz teksta pravi BASE64 MP3
async function textToSpeechBase64(text) {
  const speech = await client.audio.speech.create({
    model: "gpt-4o-mini-tts", // TTS model
    voice: "alloy",           // ženski glas
    input: text,
  });

  const audioBuffer = Buffer.from(await speech.arrayBuffer());
  return audioBuffer.toString("base64"); // vraćamo base64
}

// 🧠 + 🔊 Glavni endpoint — vraća i tekst i audio
app.post("/api/ask", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Polje 'message' je obavezno." });
    }

    // 1) Dobijemo tekstualni odgovor
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Nažalost, trenutno ne mogu da formiram odgovor.";

    // 2) Na osnovu tog odgovora pravimo audio (MP3) i vraćamo kao base64
    let audioBase64 = null;
    try {
      audioBase64 = await textToSpeechBase64(answer);
    } catch (e) {
      console.error("Greška u TTS (audio):", e);
      // Ako TTS pukne, i dalje vraćamo tekstualni odgovor
    }

    return res.json({
      answer,
      audio: audioBase64, // može biti null ako TTS padne
    });
  } catch (err) {
    console.error("Greška /api/ask:", err);
    return res.status(500).json({
      error: "Došlo je do greške na AI serveru.",
    });
  }
});

// (Opcionalno) Poseban endpoint samo za glas iz proizvoljnog teksta – npr. za uvodno predstavljanje
app.post("/api/voice", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Polje 'text' je obavezno." });
    }

    const audioBase64 = await textToSpeechBase64(text);
    return res.json({ audio: audioBase64 });
  } catch (err) {
    console.error("Greška /api/voice:", err);
    return res.status(500).json({ error: "Greška prilikom generisanja zvuka." });
  }
});

// Health-check
app.get("/", (req, res) => {
  res.send("Lena AI backend radi ✅");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Lena AI backend sluša na portu ${PORT}`);
});

