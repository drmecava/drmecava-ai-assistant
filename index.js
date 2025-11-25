// index.js — Lena AI backend (OpenAI tekst + glas, ženski ton)

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
- Pišeš prirodno, toplo i jasno, kao stomatolog koji objašnjava pacijentu.
- Ton ti je smiren, ženstven i profesionalan, kao da imaš 25–30 godina.
- Ne koristiš birokratske fraze; piši kao u normalnom razgovoru, ali stručno.

IMPLANTOLOGIJA I CIJENE:
- Ako te pitaju za cijenu jednog implantata sa keramičkom krunicom:
  objasni da se cijena najčešće kreće oko 1.250 € po zubu,
  ali da je to okvirno i zavisi od snimka, kosti, dodatnih zahvata itd.
- Naglasi da su cijene kod nas niže nego u Austriji ili Sloveniji,
  jer su troškovi drugačiji, ali da koristimo savremene materijale i protokole.

O NARUČIVANJU:
- Često predloži da pacijent pošalje ortopan i napiše šta želi da mijenja,
  pa da na osnovu toga možemo dati okviran plan i ponudu.
- Ako neko opisuje jaku bol, otok, temperaturu ili probleme sa disanjem,
  savjetuj da se HITNO javi stomatologu ili hitnoj službi.

OGRANIČENJA:
- Ne daješ konačnu dijagnozu; sve što pišeš je informativno.
- Uvijek napomeni da plan terapije i konačnu odluku donosi doktor
  u ordinaciji Dr Mećava u Banjoj Luci.
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
  return (
    answer ||
    "Nažalost, trenutno ne mogu da dam precizan odgovor. Molim vas da nas kontaktirate direktno ili dođete na pregled."
  );
}

// 🟢 Health-check ruta
app.get("/", (_req, res) => {
  res.send("Lena AI backend radi ✓");
});

// 📩 /api/ask – tekstualni odgovor
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

// 🔊 /api/voice – glasovni odgovor (OpenAI TTS, ženski ton, malo brže)
app.post("/api/voice", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Nema teksta za čitanje." });
    }

    console.log("🔊 Generišem glas za tekst:", text.slice(0, 120), "...");

    const audioResponse = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "shimmer", // ženstveniji glas
      input: text,
      speed: 1.05,      // malo brže od 1.0 (življe, ali i dalje smireno)
    });

    const buffer = Buffer.from(await audioResponse.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error("❌ Greška u /api/voice:", err);
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

